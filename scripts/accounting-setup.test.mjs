import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText.replaceAll('"i18next"', JSON.stringify(import.meta.resolve("i18next")))).toString("base64")}`);
}
const { buildAccountRows, descendantIds } = await load("src/pages/Accounting/chart/accountHierarchy.ts");
const { accountingRouteAllowed } = await load("src/pages/Accounting/setup/setupNavigation.ts");
const account = (id, parent_id = null, code = id) => ({ id, parent_id, code, name: id });

test("hierarchy rows preserve sorted nesting and collapse only descendants", () => {
  const accounts = [account("a10", "root", "10"), account("root", null, "1"), account("a2", "root", "2")];
  assert.deepEqual(buildAccountRows(accounts, new Set(), "tree").rows.map(row => [row.account.id, row.depth]), [["root", 0], ["a2", 1], ["a10", 1]]);
  assert.deepEqual(buildAccountRows(accounts, new Set(["root"]), "tree").rows.map(row => row.account.id), ["root"]);
  assert.equal(buildAccountRows(accounts, new Set(["root"]), "list").rows.length, 3);
});

test("filtered and cyclic legacy accounts remain visible for repair", () => {
  const items = [account("orphan", "filtered-parent"), account("cycle-a", "cycle-b"), account("cycle-b", "cycle-a")];
  const rows = buildAccountRows(items, new Set(), "tree").rows;
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map(row => row.account.id)).size, 3);
});

test("deep hierarchy rendering avoids recursion overflow", () => {
  const accounts = Array.from({ length: 10000 }, (_, index) => account(String(index), index ? String(index - 1) : null));
  assert.equal(buildAccountRows(accounts, new Set(), "tree").rows.length, 10000);
});

test("parent choices exclude self and every descendant, even after filtering", () => {
  const accounts = [account("root"), account("child", "root"), account("grandchild", "child"), account("other")];
  assert.deepEqual([...descendantIds(accounts, "root")].sort(), ["child", "grandchild", "root"]);
  assert.equal(descendantIds(accounts).size, 0);
});

function status(phase, canActivate = false) {
  const phases = ["profile", "chart", "books", "review"];
  return { can_activate: canActivate, steps: phases.map((key, index) => ({ key, available: index <= phases.indexOf(phase), complete: index < phases.indexOf(phase) })) };
}

test("missing profile blocks chart/book configuration while setup remains accessible", () => {
  const state = status("profile");
  assert.equal(accountingRouteAllowed(state, "chart"), false);
  assert.equal(accountingRouteAllowed(state, "books"), false);
  assert.equal(accountingRouteAllowed(state, "setup"), true);
});

test("incomplete chart blocks downstream configuration URLs", () => {
  const state = status("chart");
  assert.equal(accountingRouteAllowed(state, "chart"), true);
  for (const page of ["books", "periods", "bank-mappings", "posting-policies"]) assert.equal(accountingRouteAllowed(state, page), false);
});

test("validated books unlock optional configuration and keep historical records readable", () => {
  for (const page of ["chart", "books", "periods", "bank-mappings", "posting-policies"]) assert.equal(accountingRouteAllowed(status("review", true), page), true);
  for (const page of ["journals", "correlation"]) assert.equal(accountingRouteAllowed(status("profile"), page), true);
});

test("legacy route aliases target the canonical workspace", () => {
  const source = ts.createSourceFile("router.tsx", fs.readFileSync("src/router.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const destinations = new Map();
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const path = node.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(source) === "path");
      if (path && ts.isStringLiteral(path.initializer) && ["ledger-accounts", "register/ledger-accounts"].includes(path.initializer.text)) {
        let destination;
        function find(child) {
          if (ts.isJsxSelfClosingElement(child) && child.tagName.getText(source) === "Navigate") destination = child.attributes.properties.find(attribute => attribute.name?.getText(source) === "to")?.initializer?.text;
          ts.forEachChild(child, find);
        }
        find(node);
        destinations.set(path.initializer.text, destination);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(destinations.get("ledger-accounts"), "/accounting/chart");
  assert.equal(destinations.get("register/ledger-accounts"), "/accounting/setup/chart");
});

const { apiErrorMessage } = await load("src/lib/apiErrorMessage.ts");
test("structured API validation errors retain actionable field messages", () => {
 assert.equal(apiErrorMessage({ message: "Validation error", fields: { parent: ["Circular hierarchy is not allowed."] } }, "Try again"), "Circular hierarchy is not allowed.");
 assert.equal(apiErrorMessage({ fields: { code: "setup_changed", message: "Reload the review." } }, "Try again"), "Reload the review.");
});
test("connection errors and unknown failures have usable messages", () => {
 assert.equal(apiErrorMessage(new Error("Connection failed"), "Try again"), "Connection failed");
 assert.equal(apiErrorMessage(null, "Try again"), "Try again");
});
