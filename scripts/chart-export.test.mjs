import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = vm.createContext({ exports: {} });
  vm.runInContext(code, context);
  return context.exports;
}

const { buildChartCsv, buildChartManualText } = load('src/products/business/pages/Accounting/setup/guided/chartExport.ts');
const { validateManualText } = load('src/products/business/pages/Accounting/chart/manualImport.ts');

const accounts = [
  { code: '1110', name: 'Operating bank', parent_code: '1100', description: 'Primary bank', account_type: 'posting', statement_section: 'asset', normal_balance: 'debit', report_group: 'Balance Sheet', report_subgroup: 'Current Assets', external_ref: 'BANK', currency_code: 'EUR', is_bank_control: true, allows_manual_posting: true, sort_key: '1000~1100~1110' },
  { code: '1000', name: 'Assets', parent_code: '', description: 'Root asset header', account_type: 'header', statement_section: 'asset', normal_balance: 'debit', report_group: 'Balance Sheet', report_subgroup: 'Assets', external_ref: 'ASSETS', currency_code: 'EUR', is_bank_control: false, allows_manual_posting: true, sort_key: '1000' },
  { code: '1100', name: 'Cash, bank; "main"', parent_code: '1000', description: 'Line 1\nLine 2', account_type: 'header', statement_section: 'asset', normal_balance: 'debit', report_group: 'Balance Sheet', report_subgroup: 'Current Assets', external_ref: 'CASH', currency_code: 'EUR', is_bank_control: false, allows_manual_posting: true, sort_key: '1000~1100' },
];

test('chart CSV uses the ledger account template columns and escapes values', () => {
  const csv = buildChartCsv(accounts);
  assert.match(csv, /^code,name,parent_code,description,account_type,statement_section,normal_balance,is_active,is_bank_control,allows_manual_posting,report_group,report_subgroup,external_ref,currency_code,metadata\r\n/);
  assert.ok(csv.indexOf('1000,Assets') < csv.indexOf('1100,'));
  assert.match(csv, /"Cash, bank; ""main"""/);
  assert.match(csv, /Line 1 Line 2/);
  assert.match(csv, /1000,Assets,,Root asset header,header,asset,debit,true,false,false/);
});

test('chart clipboard text is accepted by the manual chart validator', () => {
  const text = buildChartManualText(accounts);
  const validation = validateManualText(text);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.equal(validation.rowCount, 3);
  assert.equal(validation.columnCount, 15);
  assert.match(text, /1110;Operating bank;1100/);
  assert.match(text, /1000;Assets;;Root asset header;header;asset;debit;true;false;false/);
});
