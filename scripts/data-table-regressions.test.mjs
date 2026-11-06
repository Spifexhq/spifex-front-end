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
 const context=vm.createContext({exports:{},require:name=>name==='react'?react:name==='@/lib/authGeneration'?{getAuthGeneration:()=>1}:name==='@/lib/tokens'?{getOrgExternalIdStored:()=> 'org-1'}:{},window:{},Promise,Map,Error,JSON});vm.runInContext(code,context);
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
test('infinite mode accumulates cursor pages and refresh clears the accumulated collection',async()=>{
 const fetch=async(cursor,size)=>{const start=Number(cursor||0);return{items:records.slice(start,start+size),nextCursor:start+size<records.length?String(start+size):undefined,totalCount:53};};
 const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch,{accumulate:true}]);h.render();await h.flush();await h.result.next();await h.flush();assert.equal(h.result.items.length,40);await h.result.next();await h.flush();assert.equal(h.result.items.length,53);assert.equal(h.result.canNext,false);await h.result.refresh();await h.flush();assert.equal(h.result.items.length,20);
});


test('infinite totals count actual server batches when requested and enforced sizes differ', async () => {
 const records = Array.from({ length: 198 }, (_, id) => ({ id: String(id) }));
 const fetch = async (cursor, requestedSize) => {
  assert.equal(requestedSize, 20);
  const start = Number(cursor || 0);
  return { items: records.slice(start, start + 100), nextCursor: start + 100 < records.length ? String(start + 100) : undefined };
 };
 const h = harness('src/hooks/useCursorPager.ts', 'useCursorPager', () => [fetch, { accumulate: true }]);
 h.render(); await h.flush();
 assert.equal(h.result.items.length, 100);
 await h.result.next(); await h.flush();
 assert.equal(h.result.items.length, 198);
 assert.equal(h.result.totalCount, 198);
 assert.equal(h.result.reachedEnd, true);
});

test('a server total survives subsequent pages that omit the optional count', async () => {
 const fetch = async cursor => cursor ? { items: [{ id: 'last' }] } : { items: [{ id: 'first' }], nextCursor: 'next', totalCount: 2 };
 const h = harness('src/hooks/useCursorPager.ts', 'useCursorPager', () => [fetch, { accumulate: true }]);
 h.render(); await h.flush(); assert.equal(h.result.totalCount, 2);
 await h.result.next(); await h.flush(); assert.equal(h.result.totalCount, 2);
});

test('mixed-height virtual rows preserve exact spacer heights through the final row', () => {
 const code = ts.transpileModule(fs.readFileSync('src/shared/ui/DataTable/virtualRows.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
 const context = vm.createContext({ exports: {} }); vm.runInContext(code, context);
 const { buildRowOffsets, virtualRowRange } = context.exports;
 const heights = Array.from({ length: 220 }, (_, index) => index % 11 === 10 ? 30 : 40);
 const offsets = buildRowOffsets(heights);
 for (let top = 0; top <= offsets.at(-1); top += 37) {
  const range = virtualRowRange(offsets, top, 410);
  assert.equal(range.before + heights.slice(range.start, range.end).reduce((a, b) => a + b, 0) + range.after, offsets.at(-1));
  assert.ok(offsets[range.start] <= top);
  assert.ok(offsets[range.end] >= Math.min(top + 410, offsets.at(-1)));
 }
 const last = virtualRowRange(offsets, offsets.at(-1) - 410, 410);
 assert.equal(last.end, heights.length); assert.equal(last.after, 0);
 const empty = virtualRowRange(buildRowOffsets([]), 0, 410);
 assert.equal(empty.start, 0); assert.equal(empty.end, 0); assert.equal(empty.before + empty.after, 0);
});

test('stale HTTP reads recover for first and subsequent cursor pages without duplicating rows',async()=>{
 const attempts = new Map();
 const fetch=async(cursor,size)=>{const start=Number(cursor||0);attempts.set(start,(attempts.get(start)||0)+1);if(attempts.get(start)===1)throw Object.assign(new Error('Stale request discarded'),{code:'ERR_CANCELED'});return{items:records.slice(start,start+size),nextCursor:start+size<records.length?String(start+size):undefined};};
 const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch,{accumulate:true}]);
 h.render();await h.flush();assert.equal(h.result.items.length,20);assert.equal(h.result.error,null);
 await h.result.next();await h.flush();assert.equal(h.result.items.length,40);assert.equal(h.result.items[20].id,'20');assert.equal(attempts.get(20),2);
});
test('old filter cancellations do not retry after a new filter replaces the request',async()=>{
 let key='old';const pending=[];
 const fetch=()=>new Promise((resolve,reject)=>pending.push({key,resolve,reject}));
 const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch,{deps:[key]}]);
 h.render();key='new';h.render();
 pending[0].reject(Object.assign(new Error('stale'),{code:'ERR_CANCELED'}));pending[1].resolve({items:[{id:'current'}]});
 await h.flush();assert.equal(pending.length,2);assert.equal(h.result.items[0].id,'current');assert.equal(h.result.error,null);
});
test('pager retries are bounded and actual endpoint failures are not retried',async()=>{
 for(const code of ['ERR_CANCELED','server_error']){let calls=0;const fetch=async()=>{calls++;throw Object.assign(new Error('failed'),{code});};const h=harness('src/hooks/useCursorPager.ts','useCursorPager',()=>[fetch]);h.render();await h.flush();assert.equal(calls,code==='ERR_CANCELED'?3:1);assert.equal(h.result.error,'failed');assert.equal(h.result.loading,false);}
});
