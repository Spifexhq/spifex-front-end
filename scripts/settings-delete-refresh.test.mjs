import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
for (const page of ["BankSettings", "DepartmentSettings", "EntitySettings", "InventorySettings", "ProjectSettings"]) {
  const file = `src/pages/Settings/${page}/index.tsx`;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function find(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === "onDeleted") callback = node.initializer.expression.getText(source);
    ts.forEachChild(node, find);
  }
  find(source);
  test(`${page}: confirmed deletion removes a locally added record before server refresh completes`, async () => {
    let deleted = new Set(); let added = [{ id: "deleted" }, { id: "keep" }]; let release; let refreshes = 0;
    const context = vm.createContext({ setDeletedIds: updater => { deleted = updater(deleted); }, setAdded: updater => { added = updater(added); }, pager: { refresh: () => { refreshes++; return new Promise(resolve => { release = resolve; }); } } });
    const handler = vm.runInContext(`(${callback})`, context);
    const pending = handler(["deleted"]);
    assert.ok(deleted.has("deleted"));
    assert.deepEqual(added.map(item => item.id), ["keep"]);
    // Even a stale page cannot reintroduce a confirmed deletion.
    const stalePage = [{ id: "deleted" }, { id: "server" }];
    assert.deepEqual(stalePage.filter(item => !deleted.has(item.id)).map(item => item.id), ["server"]);
    assert.equal(refreshes, 1);
    release(); await pending;
    handler([]);
    assert.equal(refreshes, 1);
  });
}
