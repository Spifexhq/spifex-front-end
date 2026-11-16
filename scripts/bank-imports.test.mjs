import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync('src/products/business/pages/Finance/BankImports/importUtils.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const context = vm.createContext({ exports: {} }); vm.runInContext(code, context);
const { parseMinorAmount } = context.exports;
test('import amounts use exact cents and reject invalid or unsafe values', () => {
  assert.equal(parseMinorAmount('0.29'),29); assert.equal(parseMinorAmount('1000,01'),100001);
  assert.equal(parseMinorAmount('0.01'),1); assert.equal(parseMinorAmount('90071992547409.91'),Number.MAX_SAFE_INTEGER);
  for(const value of ['0','-1','1.001','1e3','Infinity','NaN','','90071992547409.92','1,000.50']) assert.equal(parseMinorAmount(value),null,value);
});
test('bank import copy has matching keys and interpolation in every language',()=>{
  const load = locale => JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${locale}/statements.json`,'utf8')).workspace;
  const flatten = (object,prefix='') => Object.entries(object).flatMap(([key,value]) => typeof value === 'object' ? flatten(value,`${prefix}${key}.`) : [[`${prefix}${key}`,value]]);
  const baseline = flatten(load('en'));
  for(const language of ['pt','fr','de']) {
    const translated = new Map(flatten(load(language)));
    assert.deepEqual([...translated.keys()].sort(),baseline.map(([key])=>key).sort());
    for(const [key,value] of baseline) { assert.ok(translated.get(key)); assert.deepEqual(translated.get(key).match(/{{[^}]+}}/g),value.match(/{{[^}]+}}/g)); }
  }
});

test('personal workspaces expose the shared import flow', () => {
  const routes = fs.readFileSync('src/products/personal/routes/index.tsx', 'utf8');
  assert.match(routes, /path: "imports"/);
  assert.match(routes, /path: "imports\/:statementId"/);
  const page = fs.readFileSync('src/products/personal/pages/Imports/index.tsx', 'utf8');
  assert.match(page, /product="personal"/);
  assert.match(page, /allPersonal<PersonalAccount>\("accounts"\)/);
  const editor = fs.readFileSync('src/products/business/pages/Finance/BankImports/ImportRowEditor.tsx', 'utf8');
  assert.match(editor, /personal \? \{\} : \{/);
});

test('bank import review uses the canonical selection bar and reading animation', () => {
  const bar = fs.readFileSync('src/products/business/pages/Finance/BankImports/ImportBulkSelectionBar.tsx', 'utf8');
  assert.match(bar, /role=\{confirming \? "alertdialog" : "region"\}/);
  assert.match(bar, /workspace\.confirmExclude/);
  assert.match(bar, /SELECTION_BAR_SELECT_PANEL_Z_INDEX/);
  const page = fs.readFileSync('src/products/business/pages/Finance/BankImports/index.tsx', 'utf8');
  assert.match(page, /useReducedMotion/);
  assert.match(page, /\[92, 78, 86\]/);
  for (const language of ['en', 'pt', 'fr', 'de']) {
    const workspace = JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/statements.json`, 'utf8')).workspace;
    assert.ok(workspace.confirmExclude, language);
    assert.match(workspace.confirmExclude, /\{\{count\}\}/);
  }
});
