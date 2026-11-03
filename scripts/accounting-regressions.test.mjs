import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

async function loadTypeScript(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { fetchAllCursor } = await loadTypeScript("src/lib/list/cursors.ts");
const { tooltipPosition } = await loadTypeScript("src/shared/ui/tooltipPosition.ts");

test("accounts returned as a plain array are retained", async () => {
  const accounts = [{ id: "bank", code: "1100" }, { id: "rent", code: "5100" }];
  assert.deepEqual(await fetchAllCursor(async () => ({ data: accounts })), accounts);
  assert.deepEqual(await fetchAllCursor(async () => ({ data: [] })), []);
});

test("cursor pages are accumulated with the cursor and page size preserved", async () => {
  const seen = [];
  const result = await fetchAllCursor(async params => {
    seen.push(params);
    return params.cursor ? { data: { results: [{ id: "second" }], next: null } } : { data: { results: [{ id: "first" }], next: "/ledger/accounts/?cursor=next%2Fpage" } };
  }, { pageSize: 50 });
  assert.deepEqual(result, [{ id: "first" }, { id: "second" }]);
  assert.deepEqual(seen, [{ cursor: undefined, page_size: 50 }, { cursor: "next/page", page_size: 50 }]);
});

test("items envelopes are supported and malformed responses fail explicitly", async () => {
  assert.deepEqual(await fetchAllCursor(async () => ({ data: { items: [{ id: "one" }] } })), [{ id: "one" }]);
  await assert.rejects(() => fetchAllCursor(async () => ({ data: { unexpected: [] } })), /Unexpected list response/);
});

test("a repeated cursor cannot cause an infinite load", async () => {
  await assert.rejects(() => fetchAllCursor(async () => ({ data: { results: [], next: "same" } })), /Repeated pagination cursor/);
});

test("bottom-edge tooltip flips above and never covers its trigger", () => {
  const trigger = { left: 850, right: 870, top: 665, bottom: 685 };
  const position = tooltipPosition(trigger, { width: 280, height: 190 }, { width: 900, height: 700 });
  assert.ok(position.top + 190 <= trigger.top - 8);
  assert.ok(position.left + 280 <= 888);
  assert.ok(position.top >= 12);
});

test("top-edge tooltip opens below and stays within a narrow viewport", () => {
  const trigger = { left: 4, right: 24, top: 10, bottom: 30 };
  const position = tooltipPosition(trigger, { width: 280, height: 120 }, { width: 320, height: 600 });
  assert.equal(position.top, 38);
  assert.equal(position.left, 12);
  assert.ok(position.left + 280 <= 308);
});

test("long tooltips constrain their height without crossing the trigger", () => {
  const trigger = { left: 100, right: 120, top: 210, bottom: 230 };
  const position = tooltipPosition(trigger, { width: 280, height: 800 }, { width: 390, height: 300 });
  assert.equal(position.maxHeight, 190);
  assert.equal(position.top, 12);
  assert.ok(position.top + position.maxHeight <= trigger.top - 8);
});
