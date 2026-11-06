import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import i18next from 'i18next';
const translations=Object.fromEntries(['en','pt','fr','de'].map(lang=>[lang,{common:JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${lang}/common.json`,'utf8'))}]));
const i18n=i18next.createInstance();await i18n.init({lng:'en',fallbackLng:'en',resources:translations});
const events=[];
const context=vm.createContext({exports:{},require:()=>({__esModule:true,default:i18n}),window:{dispatchEvent:event=>events.push(event)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},Date,Set});
vm.runInContext(ts.transpileModule(fs.readFileSync('src/lib/apiErrorMessage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {apiErrorMessage,normalizeApiError,getQuotaIssue,notifyQuotaError}=context.exports;
const failure={error:{code:'permission_denied',detail:{detail:'quota_exceeded',remaining:0,limit:2,reset_at:'9999-12-31T23:59:59Z'}}};
test('nested quota failures become clear localized text without lifetime sentinel dates',async()=>{
 for(const language of ['en','pt','fr','de']){await i18n.changeLanguage(language);const message=apiErrorMessage(failure,'fallback');assert.ok(message.includes(translations[language].common.quota.exceeded));assert.ok(message.includes('2'));assert.ok(!message.includes('9999'));assert.ok(!message.includes('quota_exceeded'));}
 await i18n.changeLanguage('en');
});
test('normalization preserves machine-readable fields for quotas and retry handlers',()=>{
 const error=normalizeApiError({code:'quota_exceeded',status:403,detail:{limit:0,reset_at:'9999-12-31T23:59:59Z'}},'fallback');
 assert.equal(error.code,'quota_exceeded');assert.equal(error.status,403);assert.equal(getQuotaIssue(error).limit,0);assert.match(error.message,/Plan limit: 0/);
});
test('real future reset dates are formatted and invalid dates are omitted',()=>{
 const future=new Date(Date.now()+86400000).toISOString();
 assert.match(apiErrorMessage({detail:'quota_exceeded',reset_at:future},'fallback'),/Resets on/);
 assert.ok(!apiErrorMessage({detail:'quota_exceeded',reset_at:'invalid'},'fallback').includes('Resets on'));
});
test('plan exclusions are distinguished from permissions and network errors',()=>{
 assert.match(apiErrorMessage({detail:'permission_not_in_plan'},'fallback'),/not included/);
 for(const error of [{status:403,detail:'missing_permission'},{code:'ERR_CANCELED'},new Error('quota_exceeded in a debug message')])assert.equal(getQuotaIssue(error),null);
 const cycle={};cycle.cause=cycle;assert.equal(getQuotaIssue(cycle),null);
});
test('global quota notifications are deduplicated and contain no request credentials',()=>{
 const error={response:{data:failure},config:{headers:{Authorization:'secret'}}};
 notifyQuotaError(error);notifyQuotaError(error);
 assert.equal(events.length,1);assert.equal(events[0].type,'spifex:quota-warning');assert.equal(events[0].detail.limit,2);assert.ok(!JSON.stringify(events[0]).includes('secret'));
 notifyQuotaError({status:403,detail:'missing_permission'});assert.equal(events.length,1);
});
