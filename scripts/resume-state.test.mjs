import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compile = path => ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const context = vm.createContext({exports:{},require});
vm.runInContext(compile('src/redux/slices/authSlice.ts'),context);
const reducer = context.exports.default, {setAuthSnapshot,resetAuth} = context.exports;
const payload = {user:{id:'user-1',name:'Ana',is_active:true,is_email_verified:true},organization:{is_owner:false,role:'member',organization:{id:'org-1',name:'Spifex'}},permissions:['view_cash_flow_page','add_entries'],is_subscribed:true};
const clone = value => JSON.parse(JSON.stringify(value));

test('unchanged session validation preserves state and all form dependency references',()=>{
 const before = reducer(undefined,setAuthSnapshot(payload));
 const after = reducer(before,setAuthSnapshot({...clone(payload),permissions:[...payload.permissions].reverse()}));
 assert.equal(after,before);assert.equal(after.user,before.user);assert.equal(after.organization,before.organization);assert.equal(after.permissions,before.permissions);
});
test('actual access changes are applied while unaffected profile references remain stable',()=>{
 const before = reducer(undefined,setAuthSnapshot(payload));
 const after = reducer(before,setAuthSnapshot({...clone(payload),permissions:[],is_subscribed:false}));
 assert.equal(after.user,before.user);assert.equal(after.organization,before.organization);
 assert.equal(after.permissions.length,0);assert.equal(after.isSubscribed,false);
});
test('workspace changes and sign-out still invalidate the previous identity',()=>{
 const before = reducer(undefined,setAuthSnapshot(payload));
 const after = reducer(before,setAuthSnapshot({...clone(payload),organization:{...payload.organization,organization:{id:'org-2'}}}));
 assert.equal(after.orgExternalId,'org-2');assert.notEqual(after.organization,before.organization);
 assert.equal(reducer(after,resetAuth()).user,null);
});

test('Select search keeps focus across multiple mobile keystrokes',()=>{
 const state = [true,true,'',null,false,false,true,0,false,null];
 const refs=[],effects=[],frames=[];let si=0,ri=0,ei=0;
 const doc={activeElement:null,body:{},addEventListener(){},removeEventListener(){}};
 const react={useState(initial){const i=si++;if(!(i in state))state[i]=initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},useRef(value){return refs[ri++] ?? (refs[ri-1]={current:value});},useId:()=> 'test',useContext:()=>({settings:false,owner:'test'}),useMemo:fn=>fn(),useCallback:fn=>fn};
 const effect=(fn,deps)=>{const i=ei++,old=effects[i];if(!old||deps.some((value,j)=>!Object.is(value,old.deps[j]))){old?.cleanup?.();effects[i]={fn,deps,pending:true};}};
 react.useEffect=effect;react.useLayoutEffect=effect;
 const noop=()=>{};
 const sizes=vm.createContext({exports:{}});vm.runInContext(compile('src/shared/ui/Select/sizes.ts'),sizes);
 const sandbox=vm.createContext({exports:{},window:{matchMedia:()=>({matches:true,addEventListener:noop,removeEventListener:noop}),addEventListener:noop,removeEventListener:noop,cancelAnimationFrame:noop,clearTimeout:noop},document:doc,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame:noop,performance:{now:()=>0},require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}:name==='react-i18next'?{useTranslation:()=>({t:value=>value})}:name==='./sizes'?sizes.exports:{}});
 vm.runInContext(compile('src/shared/ui/Select/Select.tsx'),sandbox);
 const props={items:[{id:'bank',name:'Bank'},{id:'cash',name:'Cash'}],selected:[],onChange:noop,getItemKey:item=>item.id,getItemLabel:item=>item.name};
 const render=()=>{si=0;ri=0;ei=0;sandbox.exports.default(props);};
 const flush=()=>{for(const e of effects)if(e.pending){e.pending=false;e.cleanup=e.fn();}while(frames.length)frames.shift()();};
 render();let panelFocus=0,searchFocus=0;
 refs[3].current={contains:node=>node===refs[5].current,focus(){panelFocus++;doc.activeElement=this;}};
 refs[5].current={focus(){searchFocus++;doc.activeElement=this;}};
 flush();assert.equal(panelFocus,1);
 doc.activeElement=refs[5].current;
 for(const text of ['b','ba','ban','bank']){state[2]=text;render();flush();assert.equal(doc.activeElement,refs[5].current);}
 assert.equal(panelFocus,1);assert.equal(searchFocus,0);
});
