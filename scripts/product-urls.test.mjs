import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(fs.readFileSync("src/app/routing/productPaths.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = vm.createContext({ exports: {}, encodeURIComponent });
vm.runInContext(code, context);
const { buildProductPath, productPathname, productSuffix, withProductIds, legacyProductPath } = context.exports;

test("canonical product URLs place the user, product and workspace in order", () => {
  assert.equal(buildProductPath("user_1", "p", "org_1", "/overview"), "/user_1/p/org_1/overview");
  assert.equal(buildProductPath("user_1", "b", "org_1"), "/user_1/b/org_1");
  assert.equal(withProductIds("/b/settings/members", "user_1", "org_1"), "/user_1/b/org_1/settings/members");
  assert.equal(withProductIds("/p/transactions?basis=settled", "user_1", "org_1"), "/user_1/p/org_1/transactions?basis=settled");
});

test("non-product and already canonical destinations stay untouched", () => {
  assert.equal(withProductIds("/signin", "user_1", "org_1"), "/signin");
  assert.equal(withProductIds("/user_1/b/org_1/overview", "user_2", "org_2"), "/user_1/b/org_1/overview");
});

test("canonical URLs collapse back to the stable internal product paths", () => {
  assert.equal(productPathname("/user_1/p/org_1/overview"), "/p/overview");
  assert.equal(productPathname("/user_1/b/org_1/settings/members"), "/b/settings/members");
  assert.equal(productPathname("/locale-setup"), "/locale-setup");
  assert.equal(productSuffix("/user_1/b/org_1/settings/members"), "/settings/members");
  assert.equal(productSuffix("/user_1/b/org_1"), "");
});

test("removed root product paths map to canonical product segments", () => {
  const overview = legacyProductPath("/overview");
  assert.equal(overview.product, "b");
  assert.equal(overview.suffix, "/overview");

  const settings = legacyProductPath("/settings/banks");
  assert.equal(settings.product, "b");
  assert.equal(settings.suffix, "/settings/banks");

  const accounting = legacyProductPath("/accounting/chart-of-accounts");
  assert.equal(accounting.product, "b");
  assert.equal(accounting.suffix, "/accounting/chart-of-accounts");

  const personal = legacyProductPath("/personal/transactions");
  assert.equal(personal.product, "p");
  assert.equal(personal.suffix, "/transactions");

  const personalRoot = legacyProductPath("/personal");
  assert.equal(personalRoot.product, "p");
  assert.equal(personalRoot.suffix, "/overview");

  const personalLegacyRoot = legacyProductPath("/transactions/settled");
  assert.equal(personalLegacyRoot.product, "p");
  assert.equal(personalLegacyRoot.suffix, "/transactions/settled");

  assert.equal(legacyProductPath("/signin"), null);
  assert.equal(legacyProductPath("/unknown"), null);
});
