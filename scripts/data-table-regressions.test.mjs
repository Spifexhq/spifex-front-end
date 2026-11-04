import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
function harness(file,exportName,args){
 const cells=[];let cursor=0,effects=[],result;
 const changed=(a,b)=>!a||a.length!==b.length||a.some((value,i)=>!Object.is(value,b[i]));
 const react={useState(initial){const i=cursor++;if(!cells[i]){cells[i]={value:typeof initial==='function'?initial():initial};cells[i].set=value=>{cells[i].value=typeof value==='function'?value(cells[i].value):value;};}return[cells[i].value,cells[i].set];},useRef(value){const i=cursor++;return cells[i]??(cells[i]={current:value});},useCallback(fn,deps){const i=cursor++;if(changed(cells[i]?.deps,deps))cells[i]={value:fn,deps};return cells[i].value;},useEffect(fn,deps){const i=cursor++;if(changed(cells[i]?.deps,deps)){const old=cells[i];cells[i]={deps,cleanup:old?.cleanup};effects.push(()=>{old?.cleanup?.();cells[i].cleanup=fn();});}}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const context=vm.createContext({exports:{},require:name=>name==='react'?react:{},window:{},Promise,Map,Error,JSON});vm.runInContext(code,context);
 const render=()=>{cursor=0;effects=[];result=context.exports[exportName](...args());for(const effect of effects)effect();return result;};
 return {render,get result(){return result;},async flush(){await new Promise(resolve=>setImmediate(resolve));return render();}};
}
const records=Array.from({length:53},(_,id)=>({id:String(id)}));
test('shared pager defaults to 20, navigates cached pages, and resets when page size changes',async()=>{
 const calls=[];const fetch=async(cursor,size)=>{calls.push([cursor,size]);const start=Number(cursor||0);return{items:records.slice(start,start+size),nextCursor:start+size<records.length?String(start+size):undefined,totalCount:53};};
 const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch]);h.render();await h.flush();assert.equal(h.result.items.length,20);assert.equal(calls[0][1],20);
 await h.result.next();await h.flush();assert.equal(h.result.index,1);assert.equal(h.result.items[0].id,'20');
 await h.result.prev();await h.flush();assert.equal(h.result.index,0);assert.equal(calls.length,2);
 h.result.setPageSize(50);h.render();await h.flush();assert.equal(h.result.index,0);assert.equal(h.result.items.length,50);assert.equal(calls.at(-1)[1],50);
});
test('duplicate refresh requests coalesce and successful refresh replaces cached records',async()=>{
 let release,calls=0;const fetch=()=>{calls++;return new Promise(resolve=>{release=resolve;});};
 const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch]);h.render();const a=h.result.refresh(),b=h.result.refresh();assert.equal(a,b);assert.equal(calls,1);
 release({items:[{id:'old'}]});await a;await h.flush();const refresh=h.result.refresh();release({items:[{id:'new'}]});await refresh;await h.flush();assert.equal(h.result.items[0].id,'new');
});
test('filter changes ignore stale responses even when the old request finishes last',async()=>{
 let key='first';const requests=[];const fetch=()=>new Promise(resolve=>requests.push({key,resolve}));
 const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch,{deps:[key]}]);h.render();key='second';h.render();assert.equal(requests.length,2);
 requests[1].resolve({items:[{id:'current'}]});await h.flush();requests[0].resolve({items:[{id:'stale'}]});await h.flush();assert.equal(h.result.items[0].id,'current');assert.equal(h.result.loading,false);
});
test('client pagination slices once and clamps the last page after deletion',()=>{
 let items=records;const h=harness('src/shared/ui/DataTable/useTablePagination.ts','useTablePagination',()=>[items]);h.render();assert.equal(h.result.rows.length,20);h.result.next();h.render();assert.equal(h.result.start,21);assert.equal(h.result.end,40);
 items=items.slice(0,3);h.render();h.render();assert.equal(h.result.start,1);assert.equal(h.result.end,3);
});
test('server pagination never slices the server page a second time',()=>{
 const page={index:2,pageSize:20,items:records.slice(40),totalCount:53,canPrev:true,canNext:false,loading:false};
 const h=harness('src/shared/ui/DataTable/useTablePagination.ts','useTablePagination',()=>[page.items,page]);h.render();assert.equal(h.result.rows.length,13);assert.equal(h.result.start,41);assert.equal(h.result.end,53);
});
test('adjacent column resizing preserves total width and minimum sizes',()=>{
 const code=ts.transpileModule(fs.readFileSync('src/shared/ui/DataTable/useColumnWidths.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const context=vm.createContext({exports:{},require:()=>({})});vm.runInContext(code,context);
 const widths=context.exports.resizeColumns([35,25,40],0,200);assert.equal(widths.reduce((sum,value)=>sum+value,0),100);assert.equal(widths[1],6);assert.equal(widths[2],40);
});
