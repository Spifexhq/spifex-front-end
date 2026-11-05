import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync('src/pages/Finance/BankImports/importUtils.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
