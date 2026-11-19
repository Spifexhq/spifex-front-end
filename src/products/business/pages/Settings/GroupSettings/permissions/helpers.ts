import type { Permission } from "@/models/auth/rbac";
import {
  ACCESS_CAPABILITIES,
  BUSINESS_PERMISSION_CODES,
  LEGACY_CODES,
  PERMISSION_BY_CODE,
  PERMISSION_DEPENDENCIES,
  type PermissionAction,
  type PermissionFeature,
  type PermissionModule,
  type PresetId,
} from "./taxonomy";

export type PermissionFilter =
  | "all"
  | "enabled"
  | "disabled"
  | "sensitive"
  | "administrative"
  | "planUnavailable";

export type FeatureAccessState = "none" | "read" | "edit" | "full" | "custom";

export type ToggleResult = {
  next: Set<string>;
  added: string[];
  blockedBy: string[];
};

export function featureCodes(feature: PermissionFeature): string[] {
  return feature.actions.map((action) => action.code);
}

export function moduleCodes(module: PermissionModule): string[] {
  return module.features.flatMap(featureCodes);
}

export function presetCodes(feature: PermissionFeature, preset: PresetId): string[] {
  const actions = feature.actions.filter((action) => !action.legacy);
  if (preset === "read") {
    return actions
      .filter((action) => action.kind === "page" || action.kind === "view")
      .map((action) => action.code);
  }
  if (preset === "edit") {
    return actions
      .filter((action) =>
        ["page", "view", "create", "edit", "configure"].includes(action.kind),
      )
      .map((action) => action.code);
  }
  return actions.map((action) => action.code);
}

export function availablePresets(feature: PermissionFeature): PresetId[] {
  const read = presetCodes(feature, "read");
  const edit = presetCodes(feature, "edit");
  const full = presetCodes(feature, "full");
  const presets: PresetId[] = [];
  if (read.length) presets.push("read");
  if (edit.length && !setsEqual(edit, read) && !setsEqual(edit, full)) {
    presets.push("edit");
  }
  if (full.length && !setsEqual(full, read)) {
    presets.push("full");
  }
  return presets;
}

export function collectDependencies(
  codes: Iterable<string>,
  dependencies: Record<string, string[]> = PERMISSION_DEPENDENCIES,
): Set<string> {
  const out = new Set(codes);
  let changed = true;
  while (changed) {
    changed = false;
    for (const code of Array.from(out)) {
      for (const dependency of dependencies[code] ?? []) {
        if (!out.has(dependency)) {
          out.add(dependency);
          changed = true;
        }
      }
    }
  }
  return out;
}

export function missingDependencies(
  codes: Set<string> | Iterable<string>,
  dependencies: Record<string, string[]> = PERMISSION_DEPENDENCIES,
): string[] {
  const selected = new Set(codes);
  const missing = new Set<string>();
  for (const code of selected) {
    for (const dependency of dependencies[code] ?? []) {
      if (!selected.has(dependency)) missing.add(dependency);
    }
  }
  return Array.from(missing).sort();
}

export function dependentsOf(
  code: string,
  codes: Set<string> | Iterable<string>,
  dependencies: Record<string, string[]> = PERMISSION_DEPENDENCIES,
): string[] {
  return Array.from(new Set(codes))
    .filter((candidate) => (dependencies[candidate] ?? []).includes(code))
    .sort();
}

export function applyPresetToFeature(
  current: Set<string>,
  feature: PermissionFeature,
  preset: PresetId,
): Set<string> {
  const next = new Set(current);
  for (const code of featureCodes(feature)) next.delete(code);
  for (const code of collectDependencies(presetCodes(feature, preset))) {
    next.add(code);
  }
  return next;
}

export function togglePermission(
  current: Set<string>,
  code: string,
  enabled: boolean,
): ToggleResult {
  const next = new Set(current);
  if (enabled) {
    const withDependencies = collectDependencies([...current, code]);
    return {
      next: withDependencies,
      added: Array.from(withDependencies).filter((item) => !current.has(item)),
      blockedBy: [],
    };
  }

  const blockedBy = dependentsOf(code, current);
  if (blockedBy.length) {
    return { next, added: [], blockedBy };
  }
  next.delete(code);
  return { next, added: [], blockedBy: [] };
}

export function featureAccessState(
  codes: Set<string>,
  feature: PermissionFeature,
): FeatureAccessState {
  const selected = featureCodes(feature).filter((code) => codes.has(code));
  if (!selected.length) return "none";
  const read = presetCodes(feature, "read");
  const edit = presetCodes(feature, "edit");
  const full = presetCodes(feature, "full");
  if (setsEqual(selected, read)) return "read";
  if (setsEqual(selected, edit)) return "edit";
  if (setsEqual(selected, full)) return "full";
  return "custom";
}

export function moduleCounts(
  codes: Set<string>,
  module: PermissionModule,
): { enabled: number; total: number } {
  const all = moduleCodes(module);
  return {
    enabled: all.filter((code) => codes.has(code)).length,
    total: all.length,
  };
}

export function stateFromCounts(enabled: number, total: number): "enabled" | "partial" | "disabled" {
  if (enabled === 0) return "disabled";
  if (enabled === total) return "enabled";
  return "partial";
}

export function actionIsSensitive(action: PermissionAction): boolean {
  return !!action.sensitive || ["delete", "manage", "configure"].includes(action.kind);
}

export function actionIsAdministrative(action: PermissionAction): boolean {
  return !!action.administrative || action.kind === "manage";
}

export function actionCanBeDelegated(
  code: string,
  options: { isOwner: boolean; actorCodes: Set<string> },
): boolean {
  if (options.isOwner) return true;
  if (LEGACY_CODES.has(code) || ACCESS_CAPABILITIES.has(code)) return false;
  return options.actorCodes.has(code);
}

export function blockedGrantCodes(
  codes: Iterable<string>,
  options: {
    isOwner: boolean;
    actorCodes: Set<string>;
    planUnavailableCodes: Set<string>;
  },
): string[] {
  return Array.from(codes).filter(
    (code) =>
      options.planUnavailableCodes.has(code) ||
      !actionCanBeDelegated(code, options),
  );
}

export function actionLabel(
  code: string,
  catalogByCode: Map<string, Permission>,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  return translate(`perms.${code}.label`, {
    defaultValue: catalogByCode.get(code)?.name || code,
  });
}

export function actionDescription(
  code: string,
  catalogByCode: Map<string, Permission>,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  return translate(`perms.${code}.description`, {
    defaultValue: catalogByCode.get(code)?.description || "",
  });
}

export function searchModule(
  query: string,
  module: PermissionModule,
  translate: (key: string, options?: Record<string, unknown>) => string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    module.id,
    module.name,
    module.description,
    translate(`taxonomy.modules.${module.id}.name`, { defaultValue: module.name }),
    translate(`taxonomy.modules.${module.id}.description`, { defaultValue: module.description }),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function searchFeature(
  query: string,
  module: PermissionModule,
  feature: PermissionFeature,
  catalogByCode: Map<string, Permission>,
  translate: (key: string, options?: Record<string, unknown>) => string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    module.id,
    module.name,
    module.description,
    translate(`taxonomy.modules.${module.id}.name`, { defaultValue: module.name }),
    translate(`taxonomy.modules.${module.id}.description`, { defaultValue: module.description }),
    feature.id,
    feature.name,
    feature.description,
    translate(`taxonomy.features.${feature.id}.name`, { defaultValue: feature.name }),
    translate(`taxonomy.features.${feature.id}.description`, { defaultValue: feature.description }),
    ...feature.actions.flatMap((action) => [
      action.code,
      action.kind,
      actionLabel(action.code, catalogByCode, translate),
      actionDescription(action.code, catalogByCode, translate),
      catalogByCode.get(action.code)?.name,
      catalogByCode.get(action.code)?.description,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesFilter(
  action: PermissionAction,
  filter: PermissionFilter,
  selected: boolean,
  planUnavailable: boolean,
): boolean {
  if (filter === "all") return true;
  if (filter === "enabled") return selected;
  if (filter === "disabled") return !selected;
  if (filter === "sensitive") return actionIsSensitive(action);
  if (filter === "administrative") return actionIsAdministrative(action);
  return planUnavailable;
}

export function codeIsInTaxonomy(code: string): boolean {
  return PERMISSION_BY_CODE.has(code);
}

export function taxonomyCodes(): string[] {
  return BUSINESS_PERMISSION_CODES;
}

function setsEqual(left: Iterable<string>, right: Iterable<string>): boolean {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}
