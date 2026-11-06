import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(fs.readFileSync('src/lib/localeSetup.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const context = vm.createContext({ exports: {} });
vm.runInContext(source, context);
const { needsLocaleSetup, safeSetupReturn } = context.exports;

test('every owner and member must finish personal locale setup', () => {
  for (const isOwner of [true, false]) {
    for (const org_locale_setup of [true, false]) {
      assert.equal(needsLocaleSetup({ personal_locale_setup: false, org_locale_setup }, isOwner), true);
    }
  }
});

test('owners must finish organization locale while members are not blocked by it', () => {
  assert.equal(needsLocaleSetup({ personal_locale_setup: true, org_locale_setup: false }, true), true);
  assert.equal(needsLocaleSetup({ personal_locale_setup: true, org_locale_setup: false }, false), false);
});

test('completed setup passes and missing flags cannot grant access', () => {
  for (const owner of [true, false]) assert.equal(needsLocaleSetup({ personal_locale_setup: true, org_locale_setup: true }, owner), false);
  assert.equal(needsLocaleSetup({}, false), true);
  assert.equal(needsLocaleSetup({ personal_locale_setup: true }, true), true);
});

test('return targets stay internal and cannot loop back to setup', () => {
  for (const value of [null, '', '//outside.test', 'https://outside.test', '/\\outside.test', '/locale-setup', '/locale-setup?return=/overview', '/\n/evil']) assert.equal(safeSetupReturn(value), '/overview');
  assert.equal(safeSetupReturn('/accounting/books?status=active'), '/accounting/books?status=active');
});

test('wrapped HTTP cancellations are not endpoint failures', () => {
  assert.equal(context.exports.isSetupRequestCancelled({code: 'ERR_CANCELED'}), true);
  assert.equal(context.exports.isSetupRequestCancelled({status: 500, code: 'request_failed'}), false);
  assert.equal(context.exports.isSetupRequestCancelled(undefined), false);
});

test('temporary resume failures retain only the already validated same-identity view', () => {
  const snapshot = {key:'user:org',data:{personal_locale_setup:true,org_locale_setup:true}};
  for (const status of [undefined,429,500,503]) assert.equal(context.exports.configurationAfterFailure(snapshot,'user:org',status),snapshot);
  for (const status of [401,403]) assert.equal(context.exports.configurationAfterFailure(snapshot,'user:org',status).data,null);
  assert.equal(context.exports.configurationAfterFailure(snapshot,'user:other-org',503).data,null);
  assert.equal(context.exports.configurationAfterFailure(null,'user:org',503).data,null);
});
