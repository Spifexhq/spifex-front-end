import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function run(read,{obsolete=false,unmount=false}={}) {
 const states=[],effects=[];let index=0,generation=1;
 const modules={
  react:{useState:value=>{const i=index++;states[i]=value;return[value,next=>{states[i]=next;}];},useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useCallback:fn=>fn},
  'react-i18next':{useTranslation:()=>({t:key=>key})},
  axios:{isCancel:()=>false},
  '@/lib/localeSetup':{isSetupRequestCancelled:error=>error.code==='ERR_CANCELED'},
  '@/core/authentication/authGeneration':{getAuthGeneration:()=>generation},
  '@/lib/tokens':{getOrgExternalIdStored:()=> 'org-1'},
  '@/lib/currency/formatCurrency':{formatCurrency:String},
  '@/core/api/requests':{api:{getSettledKpis:read}},
 };
 const scope=vm.createContext({exports:{},require:name=>modules[name],console:{error(){}}});
 vm.runInContext(compile('src/components/FinancialActivityPanel/useActivityMetrics.ts'),scope);
 scope.exports.useActivityMetrics({contextSettlement:true,enabled:true,filters:{bank_id:['bank-2']}});
 const cleanup=effects[0]();
 if(obsolete)generation++;
 if(unmount)cleanup();
 await new Promise(resolve=>setImmediate(resolve));
 return states;
}
test('bank-filter KPI stale reads retry and commit a current result',async()=>{
 let calls=0;const payload={marker:'current-bank'};
 const states=await run(async query=>{assert.equal(query.bank_id,'bank-2');if(++calls===1)throw {code:'ERR_CANCELED'};return {data:payload};});
 assert.equal(calls,2);assert.equal(states[1],payload);assert.equal(states[2],false);assert.equal(states[3],false);
});
test('superseded identities and unmounted filters cannot retry or write results',async()=>{
 for(const opts of [{obsolete:true},{unmount:true}]){let calls=0;const states=await run(async()=>{calls++;throw {code:'ERR_CANCELED'};},opts);assert.equal(calls,1);assert.equal(states[1],null);assert.equal(states[3],false);}
});
test('genuine endpoint errors do not retry and expose a recoverable error',async()=>{
 let calls=0;const states=await run(async()=>{calls++;throw {status:500};});
 assert.equal(calls,1);assert.equal(states[2],false);assert.equal(states[3],true);
});
