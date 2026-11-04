import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
const { outputText } = ts.transpileModule(fs.readFileSync("src/shared/ui/Popover/settingsPopoverPosition.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { settingsPopoverPosition: position } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
test("filter panel stays within the right edge and opens above a low trigger", () => {
  const panel = position({ left: 1180, top: 650, bottom: 690 }, { width: 420, height: 300 }, { width: 1280, height: 720 });
  assert.ok(panel.left >= 12 && panel.left + panel.width <= 1268);
  assert.ok(panel.top >= 12 && panel.top + 300 < 650);
});
test("long filter content is scrollable within the available viewport", () => {
  const panel = position({ left: 100, top: 60, bottom: 100 }, { width: 420, height: 1800 }, { width: 768, height: 600 });
  assert.ok(panel.maxHeight > 0 && panel.maxHeight < 600);
  assert.ok(panel.top + panel.maxHeight <= 588);
});
test("filter panels remain bounded when their anchor scrolls outside the viewport", () => {
  for (const top of [-300, 1000]) {
    const panel = position({ left: 100, top, bottom: top + 30 }, { width: 420, height: 300 }, { width: 768, height: 600 });
    assert.ok(panel.top >= 12);
    assert.ok(panel.top + Math.min(300, panel.maxHeight) <= 588);
  }
});
test("shared settings controls have labels in every supported language", () => {
  for (const language of ["en", "pt", "fr", "de"]) {
    const data = JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${language}/common.json`, "utf8"));
    for (const key of ["book", "bankMapping", "journal", "postingPolicy", "ledgerAccount", "editShortcuts", "previewShortcuts"]) {
      assert.ok(typeof data.modalHints?.[key] === "string" && data.modalHints[key].length, `${language}: missing modalHints.${key}`);
    }
    for (const value of [data.settings.filters, data.settings.activeFilters, ...Object.values(data.pagination)]) assert.ok(typeof value === "string" && value.length);
  }
});
const nameModule = ts.transpileModule(fs.readFileSync("src/shared/ui/DataTable/recordName.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { recordName } = await import(`data:text/javascript;base64,${Buffer.from(nameModule.outputText).toString("base64")}`);
test("entities use the API full_name field in the shared record grid", () => {
  assert.equal(recordName({ id: "entity", full_name: "Edgar Moraes", email: "edgar@example.com" }), "Edgar Moraes");
  assert.equal(recordName({ full_name: null, name: "Operations" }), "Operations");
  assert.equal(recordName({ full_name: "  ", institution: "Bank" }), "Bank");
  assert.equal(recordName({ full_name: null }), "—");
});
