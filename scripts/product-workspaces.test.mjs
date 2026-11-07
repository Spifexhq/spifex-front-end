import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = ts.transpileModule(fs.readFileSync("src/features/workspaces/components/workspaceSelection.ts", "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const context = vm.createContext({exports:{}, Error}); vm.runInContext(source, context);
const {selectWorkspace} = context.exports;
function harness() {
  const state = {workspace:"old", user:"user", generation:0, commits:[], paths:[], clears:0, gate:null};
  const snapshot = {user:{id:"user"},organization:{organization:{id:"new",product_category:"personal"}}};
  const deps = {getWorkspace:()=>state.workspace,setWorkspace:id=>{state.workspace=id;},getUser:()=>state.user,generation:()=>state.generation,advance:()=>{state.generation++;},clearCaches:()=>{state.clears++;},profile:async()=>({data:snapshot}),commit:value=>{state.commits.push(value);},navigate:path=>{state.paths.push(path);},setGate:task=>{state.gate=task;},clearGate:task=>{if(state.gate===task)state.gate=null;}};
  return {state,snapshot,deps};
}
test("workspace switching commits a verified same-user snapshot and product destination", async()=>{
  const {state,deps}=harness(); await selectWorkspace("new",deps);
  assert.equal(state.workspace,"new");assert.equal(state.commits.length,1);assert.deepEqual(state.paths,["/personal/overview"]);assert.equal(state.gate,null);assert.equal(state.clears,1);
});
test("a rejected tenant selection restores the previous context and clears its caches", async()=>{
  const {state,deps,snapshot}=harness();snapshot.organization.organization.id="not-new";
  await assert.rejects(selectWorkspace("new",deps),/could not be verified/);assert.equal(state.workspace,"old");assert.equal(state.commits.length,0);assert.equal(state.clears,2);assert.equal(state.gate,null);
});
test("a newer identity or switch cannot be overwritten by a delayed snapshot or rollback", async()=>{
  const {state,deps}=harness();let resolve;deps.profile=()=>new Promise(done=>{resolve=done;});
  const task=selectWorkspace("new",deps);state.generation++;state.workspace="other";state.user="other-user";
  resolve({data:{user:{id:"user"},organization:{organization:{id:"new"}}}});
  await assert.rejects(task,/superseded/);assert.equal(state.workspace,"other");assert.equal(state.commits.length,0);assert.equal(state.gate,null);
});
test("a different authenticated user is never accepted during workspace selection", async()=>{
  const {state,deps,snapshot}=harness();snapshot.user.id="another-user";
  await assert.rejects(selectWorkspace("new",deps),/refresh_user_mismatch/);assert.equal(state.commits.length,0);assert.equal(state.workspace,"old");
});
test("Personal copy has the same translated keys in every supported language",()=>{
  const read=lang=>JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${lang}/personal.json`,"utf8"));
  const en=read("en");for(const lang of ["pt","fr","de"]){const other=read(lang);assert.deepEqual(Object.keys(other).sort(),Object.keys(en).sort());for(const value of Object.values(other))assert.ok(value.trim());}
});


test("attachment uploads use multipart bodies and downloads reject a superseded workspace", async()=>{
  const code=ts.transpileModule(fs.readFileSync("src/products/personal/services/api.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  let generation=0,workspace="original",requestArgs,release;
  const captured=[];
  const blob=new Blob(["%PDF-1.4"]);
  const sandbox=vm.createContext({exports:{},FormData,Error,require:name=>({
    "@/core/authentication/authGeneration":{getAuthGeneration:()=>generation},
    "@/lib/tokens":{getOrgExternalIdStored:()=>workspace},
    "@/core/api/http":{request:async(...args)=>{requestArgs=args;return{data:{id:"file"}};},http:{get:(...args)=>{captured.push(args);return new Promise(done=>{release=done;});}}},
  })[name]});
  vm.runInContext(code,sandbox);const api=sandbox.exports.personalApi;
  await api.uploadAttachment("entry",blob);
  assert.equal(requestArgs[0],"personal/transactions/entry/attachments/");assert.equal(requestArgs[1],"POST");assert.ok(requestArgs[2] instanceof FormData);assert.equal(requestArgs[2].get("file").size,blob.size);
  const pending=api.downloadAttachment("entry","file");generation++;workspace="other";release({data:blob});
  await assert.rejects(pending,/Workspace changed/);assert.equal(captured[0][1].responseType,"blob");
});
