import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import axios from "axios";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(file, modules, globals={}) {
 const source=fs.readFileSync(file,"utf8").replaceAll("import.meta.env.PROD","false").replaceAll("import.meta.env.VITE_API_BASE_URL",'"https://api.example.com/api/v1/"');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const context=vm.createContext({exports:{},require:name=>modules[name]??require(name),URL,Map,Set,Promise,Error,Date,Math,JSON,performance,setTimeout,clearTimeout,console,...globals});
 vm.runInContext(code,context);return context.exports;
}
function httpHarness(adapter) {
 let access="old",generation=0; const events=[];
 const tokens={getAccess:()=>access,setTokens:value=>{access=value;},clearTokens:()=>{access="";generation++;},getOrgExternalIdStored:()=>"org",getUserIdStored:()=>"user",setUserIdStored:()=>{}};
 const fakeAxios={...axios,create:options=>axios.create({...options,adapter:async cfg=>{
   const result=await adapter(cfg);
   const response={data:result.data,status:result.status,statusText:"",headers:result.headers||{},config:cfg};
   if(!cfg.validateStatus||cfg.validateStatus(response.status))return response;
   throw new axios.AxiosError("Request failed",undefined,cfg,undefined,response);
 }})};
 const exported=load("src/lib/http.ts",{"axios":{__esModule:true,default:fakeAxios},"@/lib/tokens":tokens,"./apiErrorMessage":load("src/lib/apiErrorMessage.ts",{}),"./authGeneration":{getAuthGeneration:()=>generation},"@/lib/netReport":{},"@/redux/store":{store:{getState:()=>({auth:{user:{id:"user"},orgExternalId:"org"}})}}},{window:{dispatchEvent:event=>events.push(event),setTimeout,clearTimeout},navigator:{},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}}});
 return {...exported,tokens,events,get access(){return access;}};
}
const csrf={status:200,data:{data:{csrf_token:"csrf"}}};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};

test("Redux snapshot updates identity, permissions, organization and subscription atomically",()=>{
 const {default:reducer,setAuthSnapshot,resetAuth}=load("src/redux/slices/authSlice.ts",{});
 const {configureStore}=require("@reduxjs/toolkit");const store=configureStore({reducer});let updates=0;store.subscribe(()=>updates++);
 store.dispatch(setAuthSnapshot({user:{id:"user"},organization:{organization:{id:"org"}},permissions:["view_bank","view_bank",null],is_subscribed:true}));
 assert.equal(updates,1);assert.equal(store.getState().orgExternalId,"org");assert.deepEqual([...store.getState().permissions],["view_bank"]);
 store.dispatch(resetAuth());assert.equal(store.getState().user,null);assert.equal(store.getState().permissions.length,0);
});

test("fresh profile bypasses both the authentication gate and cached snapshots",async()=>{
 let calls=0;const h=httpHarness(async cfg=>{assert.equal(cfg.url,"identity/profile/");return{status:200,data:{data:{version:++calls}}};});
 h.setAuthGate(new Promise(()=>{}));
 const result=await h.request("identity/profile/","GET",undefined,{fresh:true,skipAuthGate:true});
 assert.equal(result.data.version,1);assert.equal((await h.request("identity/profile/","GET",undefined,{fresh:true,skipAuthGate:true})).data.version,2);
});

test("late responses cannot repopulate caches after invalidation",async()=>{
 const first=deferred();let calls=0;const h=httpHarness(async()=>++calls===1?first.promise:{status:200,data:{data:"new"}});
 const pending=h.request("items/");await new Promise(r=>setImmediate(r));h.clearHttpCaches();first.resolve({status:200,data:{data:"old"}});
 await assert.rejects(pending,/Stale request/);assert.equal((await h.request("items/")).data,"new");assert.equal(calls,2);
});

test("temporary refresh failure retains the identity and does not signal logout",async()=>{
 const h=httpHarness(async cfg=>cfg.url==="auth/csrf/"?csrf:{status:503,data:{}});
 await assert.rejects(h.refreshAccess());assert.equal(h.access,"old");assert.equal(h.events.length,0);
});

test("refresh is coalesced and a logout discards an outstanding refresh response",async()=>{
 const pending=deferred();let exchanges=0;const h=httpHarness(async cfg=>cfg.url==="auth/csrf/"?csrf:(exchanges++,pending.promise));
 const a=h.refreshAccess(),b=h.refreshAccess();assert.equal(a,b);await new Promise(r=>setImmediate(r));h.tokens.clearTokens();
 pending.resolve({status:200,data:{data:{access:"resurrected",user_id:"user"}}});
 await assert.rejects(a,/Identity changed/);assert.equal(exchanges,1);assert.equal(h.access,"");assert.equal(h.events.length,0);
});

test("writes are not automatically resubmitted after throttling",async()=>{
 let writes=0;const h=httpHarness(async()=>{writes++;return{status:429,data:{error:{code:"throttled"}}};});
 await assert.rejects(h.request("items/","POST",{}),error=>error.status===429);assert.equal(writes,1);
});

test("failed signin does not trigger a refresh of an unrelated existing session",async()=>{
 let exchanges=0;const h=httpHarness(async cfg=>cfg.url==="auth/csrf/"?csrf:(exchanges++,{status:401,data:{error:{code:"invalid_credentials"}}}));
 await assert.rejects(h.request("auth/signin/","POST",{}),error=>error.code==="invalid_credentials");assert.equal(exchanges,1);
});


test("an old request's 401 cannot refresh or log out a replacement identity",async()=>{
 const pending=deferred();let refreshes=0;const h=httpHarness(async cfg=>{
  if(cfg.url==="items/")return pending.promise;
  refreshes++;return csrf;
 });
 const request=h.request("items/");await new Promise(r=>setImmediate(r));h.tokens.clearTokens();h.tokens.setTokens("replacement");
 pending.resolve({status:401,data:{error:{code:"token_not_valid"}}});
 await assert.rejects(request,/Stale response/);assert.equal(h.access,"replacement");assert.equal(refreshes,0);assert.equal(h.events.length,0);
});


test("no-store and revalidation-only responses are never reused from the application cache",async()=>{
 for (const directive of ["no-store","private, max-age=0, must-revalidate"]) {
  let calls=0;
  const h=httpHarness(async()=>({status:200,data:{data:++calls},headers:{"cache-control":directive}}));
  assert.equal((await h.request("items/")).data,1);
  assert.equal((await h.request("items/")).data,2);
 }
});

test("a successful mutation invalidates a cached list on the same stable URL",async()=>{
 let version=1;
 const h=httpHarness(async cfg=>{assert.ok(!cfg.params?._r);if(cfg.method==="post")version++;return{status:200,data:{data:version}};});
 assert.equal((await h.request("items/")).data,1);
 await h.request("items/","POST",{});
 assert.equal((await h.request("items/")).data,2);
});


test("live-sync invalidation during a successful settings write does not discard its response",async()=>{
 const pending=deferred();const h=httpHarness(async()=>pending.promise);
 const update=h.request("identity/profile/settings/","PATCH",{name:"Updated"});
 await new Promise(r=>setImmediate(r));h.clearHttpCaches();
 pending.resolve({status:200,data:{data:{name:"Updated"}}});
 assert.equal((await update).data.name,"Updated");
});

test("logout still discards a pending settings write response",async()=>{
 const pending=deferred();const h=httpHarness(async()=>pending.promise);
 const update=h.request("identity/profile/settings/","PATCH",{name:"Updated"});
 await new Promise(r=>setImmediate(r));h.tokens.clearTokens();
 pending.resolve({status:200,data:{data:{name:"Updated"}}});
 await assert.rejects(update,/Stale response/);
});


test("private lists revalidate with ETags without a Cache-Control request header",async()=>{
 let calls=0;
 const h=httpHarness(async cfg=>{
  calls++;
  assert.equal(cfg.headers.get("Cache-Control"),undefined);
  if(calls===1)return{status:200,data:{data:[{id:"one"}]},headers:{etag:'W/"revision-1"',"cache-control":"private, max-age=0, must-revalidate"}};
  assert.equal(cfg.headers.get("If-None-Match"),'W/"revision-1"');
  return{status:304,data:undefined,headers:{etag:'W/"revision-1"'}};
 });
 assert.equal((await h.request("items/")).data[0].id,"one");
 assert.equal((await h.request("items/")).data[0].id,"one");
 assert.equal(calls,2);
});

test("no-store responses never supply validators on a subsequent request",async()=>{
 const h=httpHarness(async cfg=>{
  assert.equal(cfg.headers.get("If-None-Match"),undefined);
  return{status:200,data:{data:"ready"},headers:{etag:'"secret"',"cache-control":"no-store"}};
 });
 await h.request("ledger/setup/");await h.request("ledger/setup/");
});
