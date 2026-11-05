import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function load(file, modules = {}, extra = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ exports: {}, require: name => modules[name], URL, ...extra });
  vm.runInContext(code, context);
  return context.exports;
}
const { getEntryChanges, entryHasSettlements, touchesFinancialFields } = load('src/pages/Finance/components/EntryForm/entryChanges.ts');
const entry = { id: 'one', due_date: '2026-01-15', amount: '10.00', description: 'Original', notes: '', observation: '', cashflow_category: 'sales', document_type: null, project: null, entity: null, departments: [{ department_id: 'd1', percent: '100.00' }], items: [], installment_count: 3, last_settled_on: null };
const form = () => ({ details: { dueDate: entry.due_date, amount: '10', description: 'Original', notes: '', observation: '', cashflowCategory: 'sales', documentType: '' }, costCenters: { departments: ['d1'], department_percentage: ['100'], projects: '' }, inventory: { product: '', quantity: '' }, entities: { entity: '', entityType: '' }, recurrence: { recurrence: 1, installments: '3', periods: 1, weekend: '' } });
test('unchanged decimals and allocations do not become financial changes during descriptive edits', () => {
  const f = form();
  assert.equal(Object.keys(getEntryChanges(entry, f)).length, 0);
  f.details.notes = 'Updated note';
  const changes = getEntryChanges(entry, f);
  assert.equal(changes.notes, 'Updated note');
  assert.equal(Object.keys(changes).length, 1);
  assert.equal(touchesFinancialFields(changes), false);
});
test('settled and partially settled entries cannot emit financial changes but retain descriptive edits', () => {
  const f = form(); f.details.amount = '20'; f.details.cashflowCategory = 'other'; f.details.description = 'Note';
  for (const state of [{ settled_count: 1 }, { last_settled_on: '2026-01-16' }, { is_settled: true }]) {
    const record = { ...entry, ...state };
    assert.equal(entryHasSettlements(record), true);
    const changes = getEntryChanges(record, f);
    assert.equal(changes.description, 'Note');
    assert.equal(touchesFinancialFields(changes), false);
  }
  const posted = { ...entry, financial_locked: true };
  assert.equal(entryHasSettlements(posted), false);
  assert.equal(touchesFinancialFields(getEntryChanges(posted, f)), false);
});
test('clearing allocations is explicit and existing recurrence schedules are not silently copied', () => {
  const f = form(); f.costCenters.departments = []; f.costCenters.department_percentage = [];
  const changes = getEntryChanges(entry, f);
  assert.equal(changes.departments.length, 0);
  assert.equal('installment_count' in changes, false);
  assert.equal(touchesFinancialFields(changes), true);
});
test('editing an unsupported multi-line inventory allocation leaves it intact', () => {
  const changes = getEntryChanges({ ...entry, items: [{ item_id: 'a', quantity: '1' }, { item_id: 'b', quantity: '2' }] }, form());
  assert.equal('items' in changes, false);
});
test('document type API forwards the next cursor so the complete options list can load', async () => {
  const file = ts.createSourceFile('requests.ts', fs.readFileSync('src/api/requests.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  let method;
  function walk(node) { if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'getDocumentTypes') method = node.initializer.getText(file); ts.forEachChild(node, walk); }
  walk(file);
  const calls = [];
  const context = vm.createContext({ exports: {}, request: async (url, method, params) => { calls.push(params?.cursor); return { data: { results: [{ code: params?.cursor ? 'B' : 'A' }], next: params?.cursor ? null : 'second' } }; } });
  vm.runInContext(ts.transpileModule(`exports.getTypes = ${method}`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const { fetchAllCursor } = load('src/lib/list/cursors.ts');
  const results = await fetchAllCursor(context.exports.getTypes);
  assert.deepEqual(calls, [undefined, 'second']);
  assert.equal(results.length, 2);
});
test('option failures identify the affected list and HTTP status; other lists remain usable', async () => {
  let state;
  const react = { useState: initial => { state = initial; return [initial, next => { state = typeof next === 'function' ? next(state) : next; }]; }, useEffect: effect => effect() };
  const empty = async () => ({ data: { results: [], next: null } });
  const api = { getCashflowCategories: async () => ({ data: [{ id: 'sales', name: 'Sales', tx_type_hint: 'credit' }] }), getDepartmentsOptions: async () => { throw { status: 403 }; }, getProjectsOptions: empty, getInventoryOptions: empty, getEntitiesOptions: empty, getDocumentTypes: empty };
  const { fetchAllCursor } = load('src/lib/list/cursors.ts');
  const { useEntryOptions } = load('src/pages/Finance/components/EntryForm/useEntryOptions.ts', { react, '@/api/requests': { api }, '@/lib/list': { fetchAllCursor } });
  useEntryOptions(true, 'credit', 0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.loading, false);
  assert.equal(state.issues.length, 1);
  assert.equal(state.issues[0].source, 'departments');
  assert.equal(state.issues[0].status, 403);
  assert.equal(state.categories.length, 1);
});
test('Finance loading waits for the initial table, balances and metrics, and releases together', () => {
  const { isFinancePending } = load('src/pages/Finance/components/financeLoading.ts', { react: { createContext: () => ({}) } });
  const expected = ['banks', 'metrics', 'entries'];
  assert.equal(isFinancePending(expected, {}), true);
  assert.equal(isFinancePending(expected, { banks: false, metrics: false, entries: true }), true);
  assert.equal(isFinancePending(expected, { banks: false, metrics: false, entries: false }), false);
  assert.equal(isFinancePending(['banks', 'metrics'], { banks: false, metrics: false }), false);
});
test('recurrence selection, conflict and option diagnostics are translated', () => {
  for (const language of ['en', 'pt', 'fr', 'de']) {
    const d = JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/entriesModal.json`, 'utf8'));
    for (const key of ['explain', 'blocked', 'protection', 'conflict', 'selected', 'onlyThis']) assert.ok(d.series[key], `${language}: ${key}`);
    for (const key of ['documents', 'departments', 'forbidden', 'failed']) assert.ok(d.options[key], `${language}: ${key}`);
  }
});
