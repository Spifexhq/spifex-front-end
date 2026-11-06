import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const compile = file => ts.transpileModule(fs.readFileSync(file,"utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const policy = vm.createContext({exports:{}});
vm.runInContext(compile("src/lib/localeSetup.ts"),policy);
const ready = {personal_locale_setup:true,org_locale_setup:true};
function render(configuration, {loading=false,failed=false,owner=false}={}) {
  const modules = {
    'react-router-dom': {useLocation:()=>({pathname:'/settings/banks',search:''}),Navigate:'navigate'},
    'react-i18next': {useTranslation:()=>({t:key=>key})},
    '@/hooks/useAuth': {useAuthContext:()=>({isOwner:owner})},
    '@/lib/localeSetup':policy.exports,
  };
  const context=vm.createContext({exports:{},require:name=>modules[name]??(name.startsWith('@/')?{default:'component'}:require(name))});
  vm.runInContext(compile('src/middlewares/auth/LocaleProfileMiddleware.tsx'),context);
  return context.exports.LocaleProfileMiddleware({children:'persistent-shell',configuration,loading,failed,retry:async()=>{}});
}

test('route revalidation keeps an already visible shell mounted',()=>{
  const snapshot=policy.exports.configurationAfterFailure({key:'user:org',data:ready},'user:org',503);
  const result=render(snapshot.data,{failed:true});
  assert.equal(result.props.children,'persistent-shell');
});
test('initial locale validation still gates the shell',()=>{
  assert.notEqual(render(null,{loading:true}).props.children,'persistent-shell');
  assert.notEqual(render(null).props.children,'persistent-shell');
});
test('required locale redirects still hide the shell',()=>{
  const result=render({...ready,personal_locale_setup:false});
  assert.equal(result.type,'navigate');
  assert.match(result.props.to,/^\/locale-setup/);
});
test('explicit access denial removes even an already validated shell',()=>{
  const snapshot=policy.exports.configurationAfterFailure({key:'user:org',data:ready},'user:org',403);
  const result=render(snapshot.data,{failed:true});
  assert.equal(result.type,'main');
  assert.notEqual(result.props.children,'persistent-shell');
});
