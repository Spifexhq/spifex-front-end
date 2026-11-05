import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(file,react={},globals={}){const context=vm.createContext({exports:{},require:()=>react,Set,Map,Date,Error,Array,Object,...globals});vm.runInContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;}
const {apiErrorMessage,normalizeApiError}=load("src/lib/apiErrorMessage.ts");
test("structured validation, nested Axios responses and plain Error messages are normalized",()=>{
 assert.equal(apiErrorMessage({fields:{name:["Required"],code:"invalid"}},"fallback"),"Required");
 assert.equal(apiErrorMessage({response:{data:{error:{detail:{email:["Already used"]},code:"invalid"}}}},"fallback"),"Already used");
 const error=normalizeApiError({code:"validation_error",status:400,fields:{email:["Already used"]}},"fallback");
 assert.ok(error instanceof Error);assert.equal(error.message,"Already used");assert.equal(error.status,400);assert.equal(error.code,"validation_error");
});
test("empty, HTML and cyclic responses fall back without crashing or printing object placeholders",()=>{
 assert.equal(apiErrorMessage("<!doctype html><html>error</html>","fallback"),"fallback");
 const cyclic={};cyclic.detail=cyclic;assert.equal(apiErrorMessage(cyclic,"fallback"),"fallback");
 assert.equal(apiErrorMessage({message:"[object Object]"},"fallback"),"fallback");
});
function harness(){let time=0, cursor=0,effects=[],cells=[],timers=new Map(),next=0;
 const react={useRef(value){const i=cursor++;return cells[i]??(cells[i]={current:value});},useState(value){const i=cursor++;cells[i]??={value};return[cells[i].value,v=>{cells[i].value=v;}];},useCallback(fn,deps){const i=cursor++;if(!cells[i]||deps.some((v,j)=>v!==cells[i].deps[j]))cells[i]={deps,fn};return cells[i].fn;},useEffect(fn,deps){const i=cursor++;if(!cells[i]||deps.some((v,j)=>v!==cells[i].deps[j])){const old=cells[i];effects.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()};});}}};
 const hook=load("src/shared/ui/Snackbar/useSnackbarLifecycle.ts",react,{Date:{now:()=>time},setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,at:time+delay});return id;},clearTimeout:id=>timers.delete(id)}).useSnackbarLifecycle;
 return{render(open,key,duration,close){cursor=0;effects=[];const value=hook(open,key,duration,close);effects.forEach(fn=>fn());return value;},advance(ms){const end=time+ms;for(;;){const next=[...timers.entries()].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;timers.delete(next[0]);next[1].fn();}time=end;},unmount(){cells.forEach(cell=>cell.cleanup?.());}};
}
test("parent rerenders with inline callbacks do not restart the timer; latest callback closes once",()=>{
 const h=harness();let old=0,current=0;const key={};h.render(true,key,5000,()=>old++);h.advance(4000);h.render(true,key,5000,()=>current++);h.advance(1000);assert.equal(old,0);assert.equal(current,1);h.advance(10000);assert.equal(current,1);
});
test("a repeated notification with a new identity gets its own full countdown",()=>{
 const h=harness();let closed=0;h.render(true,{},5000,()=>closed++);h.advance(4000);h.render(true,{},5000,()=>closed++);h.advance(1000);assert.equal(closed,0);h.advance(4000);assert.equal(closed,1);
});
test("hover and keyboard focus pause independently and resume remaining time",()=>{
 const h=harness();let closed=0;const v=h.render(true,{},5000,()=>closed++);h.advance(1000);v.pause("hover",true);v.pause("focus",true);h.advance(10000);v.pause("hover",false);h.advance(10000);assert.equal(closed,0);v.pause("focus",false);h.advance(4000);assert.equal(closed,1);
});
test("manual dismissal and unmount cancel timers; persistent notifications close manually",()=>{
 const h=harness();let closed=0;const v=h.render(true,{},null,()=>closed++);h.advance(100000);assert.equal(closed,0);v.dismiss();v.dismiss();assert.equal(closed,1);h.render(true,{},5000,()=>closed++);h.unmount();h.advance(10000);assert.equal(closed,1);
});
