import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  applyPresetToFeature,
  availablePresets,
  collectDependencies,
  dependentsOf,
  featureAccessState,
  matchesFilter,
  missingDependencies,
  presetCodes,
  searchFeature,
  togglePermission,
  actionCanBeDelegated,
  blockedGrantCodes,
} from "../src/products/business/pages/Settings/GroupSettings/permissions/helpers";
import {
  BUSINESS_PERMISSION_CODES,
  LEGACY_CODES,
  PERMISSION_DEPENDENCIES,
  PERMISSION_TAXONOMY,
  SCOPED_PERMISSION_RESOURCES,
} from "../src/products/business/pages/Settings/GroupSettings/permissions/taxonomy";

const translate = (key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key);

const teamModule = PERMISSION_TAXONOMY.find((module) => module.id === "team")!;
const groupsFeature = teamModule.features.find(
  (feature) => feature.id === "permission-groups",
)!;
const membersFeature = teamModule.features.find((feature) => feature.id === "members")!;
const cashFlowFeature = PERMISSION_TAXONOMY.find((module) => module.id === "financial")!
  .features.find((feature) => feature.id === "cash-flow")!;
const effectiveFeature = teamModule.features.find(
  (feature) => feature.id === "effective-access",
)!;

function backendBusinessCodes(): string[] {
  const seedPath = resolve(
    process.cwd(),
    "../spifex-back-end/rbac/management/commands/seed_app_permissions.py",
  );
  const source = readFileSync(seedPath, "utf8");
  const codes = Array.from(
    source.matchAll(/\("([a-z0-9_]+)",\s+"[^"]*",\s+"(?:actions|pages|view)",\s+(?:True|False)\)/g),
  ).map((match) => match[1]);
  return codes.filter((code) => !code.startsWith("personal_"));
}

test("taxonomy covers every Business catalog code exactly once", () => {
  const backend = backendBusinessCodes();
  assert.equal(backend.length, 94);
  assert.equal(BUSINESS_PERMISSION_CODES.length, backend.length);
  assert.equal(new Set(BUSINESS_PERMISSION_CODES).size, backend.length);
  assert.deepEqual(
    [...BUSINESS_PERMISSION_CODES].sort(),
    [...backend].sort(),
  );
});

test("taxonomy contains no personal codes and no duplicate primary location", () => {
  assert.equal(
    BUSINESS_PERMISSION_CODES.some((code) => code.startsWith("personal_")),
    false,
  );
  const seen = new Set<string>();
  for (const module of PERMISSION_TAXONOMY) {
    for (const feature of module.features) {
      for (const action of feature.actions) {
        assert.equal(seen.has(action.code), false, `duplicate ${action.code}`);
        seen.add(action.code);
      }
    }
  }
});

test("dependencies reference catalog codes and resolve transitively", () => {
  const catalog = new Set(BUSINESS_PERMISSION_CODES);
  for (const [code, dependencies] of Object.entries(PERMISSION_DEPENDENCIES)) {
    assert.ok(catalog.has(code), code);
    for (const dependency of dependencies) assert.ok(catalog.has(dependency), dependency);
  }
  const withDependencies = collectDependencies(["manage_access"]);
  assert.ok(withDependencies.has("view_group"));
  assert.ok(withDependencies.has("view_permission"));
  assert.ok(withDependencies.has("view_group_settings_page"));
});

test("presets include only feature capabilities and required dependencies", () => {
  const read = new Set(presetCodes(cashFlowFeature, "read"));
  const edit = new Set(presetCodes(cashFlowFeature, "edit"));
  const full = new Set(presetCodes(cashFlowFeature, "full"));
  assert.ok(read.has("view_cash_flow_page"));
  assert.equal(read.has("add_cash_flow_entries"), false);
  assert.ok(edit.has("add_cash_flow_entries"));
  assert.equal(edit.has("delete_cash_flow_entries"), false);
  assert.ok(full.has("delete_cash_flow_entries"));
  assert.ok(availablePresets(cashFlowFeature).includes("edit"));

  const groupFull = applyPresetToFeature(new Set(), groupsFeature, "full");
  assert.ok(groupFull.has("manage_access"));
  assert.ok(groupFull.has("view_group"));
  assert.ok(availablePresets(membersFeature).includes("read"));
  assert.equal(
    presetCodes(membersFeature, "full").includes("business_add_member"),
    false,
  );
});

test("feature access state distinguishes read, edit, full and custom", () => {
  const read = new Set(presetCodes(cashFlowFeature, "read"));
  assert.equal(featureAccessState(read, cashFlowFeature), "read");
  const edit = new Set(presetCodes(cashFlowFeature, "edit"));
  assert.equal(featureAccessState(edit, cashFlowFeature), "edit");
  const full = new Set(presetCodes(cashFlowFeature, "full"));
  assert.equal(featureAccessState(full, cashFlowFeature), "full");
  const custom = new Set(["view_cash_flow_page", "delete_cash_flow_entries"]);
  assert.equal(featureAccessState(custom, cashFlowFeature), "custom");
});

test("enabling a permission adds dependencies and removing a dependency is blocked", () => {
  const enabled = togglePermission(new Set(), "manage_access", true);
  assert.ok(enabled.next.has("view_group"));
  assert.ok(enabled.next.has("view_permission"));
  assert.ok(enabled.added.length >= 3);

  const blocked = togglePermission(enabled.next, "view_group", false);
  assert.deepEqual(blocked.blockedBy, ["manage_access"]);
  assert.ok(blocked.next.has("view_group"));

  const manageRemoved = togglePermission(enabled.next, "manage_access", false).next;
  const dependencyRemoved = togglePermission(manageRemoved, "view_group", false);
  assert.deepEqual(dependencyRemoved.blockedBy, []);
  assert.equal(dependencyRemoved.next.has("view_group"), false);
});

test("search finds permissions inside collapsed modules", () => {
  assert.equal(
    searchFeature("view_effective_access", teamModule, effectiveFeature, new Map(), translate),
    true,
  );
  assert.equal(
    searchFeature("effective access", teamModule, effectiveFeature, new Map(), translate),
    true,
  );
  assert.equal(
    searchFeature("currency", PERMISSION_TAXONOMY.find((m) => m.id === "settings")!, PERMISSION_TAXONOMY.find((m) => m.id === "settings")!.features.find((f) => f.id === "currency")!, new Map(), translate),
    true,
  );
  assert.equal(
    searchFeature("not-a-real-permission", teamModule, effectiveFeature, new Map(), translate),
    false,
  );
});

test("filters expose sensitive, administrative and plan-unavailable states", () => {
  const deleteAction = cashFlowFeature.actions.find(
    (action) => action.code === "delete_cash_flow_entries",
  )!;
  const manageAction = groupsFeature.actions.find(
    (action) => action.code === "manage_access",
  )!;
  assert.equal(matchesFilter(deleteAction, "sensitive", false, false), true);
  assert.equal(matchesFilter(manageAction, "administrative", false, false), true);
  assert.equal(matchesFilter(manageAction, "planUnavailable", false, true), true);
  assert.equal(matchesFilter(manageAction, "enabled", false, false), false);
});

test("delegation rules protect owner, access and legacy capabilities", () => {
  const actorCodes = new Set(["view_cash_flow_entries", "manage_access"]);
  assert.equal(actionCanBeDelegated("view_cash_flow_entries", { isOwner: false, actorCodes }), true);
  assert.equal(actionCanBeDelegated("manage_access", { isOwner: false, actorCodes }), false);
  assert.equal(actionCanBeDelegated("add_group", { isOwner: false, actorCodes }), false);
  assert.equal(actionCanBeDelegated("add_group", { isOwner: true, actorCodes }), true);
  assert.equal(actionCanBeDelegated("delete_cash_flow_entries", { isOwner: false, actorCodes }), false);

  assert.deepEqual(
    blockedGrantCodes(["view_cash_flow_entries", "manage_access", "add_group"], {
      isOwner: false,
      actorCodes,
      planUnavailableCodes: new Set(),
    }),
    ["manage_access", "add_group"],
  );
  assert.deepEqual(
    blockedGrantCodes(["view_cash_flow_entries"], {
      isOwner: true,
      actorCodes,
      planUnavailableCodes: new Set(["view_cash_flow_entries"]),
    }),
    ["view_cash_flow_entries"],
  );
});

test("legacy codes remain classified but are not granted by presets", () => {
  for (const code of LEGACY_CODES) {
    assert.ok(BUSINESS_PERMISSION_CODES.includes(code), code);
  }
  const allPresetCodes = PERMISSION_TAXONOMY.flatMap((module) =>
    module.features.flatMap((feature) =>
      (["read", "edit", "full"] as const).flatMap((preset) =>
        presetCodes(feature, preset),
      ),
    ),
  );
  for (const legacy of LEGACY_CODES) {
    assert.equal(allPresetCodes.includes(legacy), false, legacy);
  }
});

test("scope-capable permissions map to known taxonomy resources", () => {
  const allowed = new Set(["bank_account", "department", "project"]);
  for (const [code, resourceTypes] of Object.entries(SCOPED_PERMISSION_RESOURCES)) {
    assert.ok(BUSINESS_PERMISSION_CODES.includes(code), code);
    assert.ok(resourceTypes.length > 0, code);
    for (const resourceType of resourceTypes) assert.ok(allowed.has(resourceType), resourceType);
  }
  assert.ok(SCOPED_PERMISSION_RESOURCES.view_bank.includes("bank_account"));
  assert.ok(SCOPED_PERMISSION_RESOURCES.view_department.includes("department"));
  assert.ok(SCOPED_PERMISSION_RESOURCES.view_project.includes("project"));
  assert.deepEqual(SCOPED_PERMISSION_RESOURCES.view_cash_flow_entries, [
    "bank_account",
    "department",
    "project",
  ]);
});

test("dependency removal reports dependents", () => {
  const codes = collectDependencies(["manage_members"]);
  assert.deepEqual(dependentsOf("business_view_member", codes), ["manage_members"]);
  assert.deepEqual(missingDependencies(new Set(["manage_members"])), [
    "business_view_member",
    "business_view_member_settings_page",
  ]);
});
