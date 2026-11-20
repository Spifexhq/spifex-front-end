import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import type { Permission } from "@/models/auth/rbac";
import {
  actionCanBeDelegated,
  actionDescription,
  actionIsAdministrative,
  actionIsSensitive,
  actionLabel,
  applyPresetToFeature,
  availablePresets,
  blockedGrantCodes,
  codeIsInTaxonomy,
  collectDependencies,
  featureAccessState,
  featureCodes,
  matchesFilter,
  missingDependencies,
  moduleCounts,
  searchFeature,
  searchModule,
  stateFromCounts,
  togglePermission,
  type PermissionFilter,
} from "./helpers";
import {
  PERMISSION_TAXONOMY,
  type PermissionFeature,
  type PresetId,
} from "./taxonomy";

type Props = {
  selectedCodes: Set<string>;
  disabled?: boolean;
  readOnly?: boolean;
  dirty: boolean;
  catalog: Permission[];
  planUnavailableCodes?: Set<string>;
  actorCodes: Set<string>;
  isOwner: boolean;
  onToggle: (code: string, enabled: boolean) => void;
  onSetCodes: (codes: Set<string>) => void;
  onUndo: () => void;
  onSave: () => void;
};

type Notice = { tone: "warning" | "info"; message: string } | null;

const FILTERS: PermissionFilter[] = [
  "all",
  "enabled",
  "disabled",
  "sensitive",
  "administrative",
  "planUnavailable",
];

const PermissionExplorer: React.FC<Props> = ({
  selectedCodes,
  disabled = false,
  readOnly = false,
  dirty,
  catalog,
  planUnavailableCodes = new Set<string>(),
  actorCodes,
  isOwner,
  onSetCodes,
  onUndo,
  onSave,
}) => {
  const { t } = useTranslation("groupPermissionsTable");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PermissionFilter>("all");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);

  const catalogByCode = useMemo(
    () => new Map(catalog.map((permission) => [permission.code, permission])),
    [catalog],
  );
  const selectedBusinessCodes = useMemo(
    () => Array.from(selectedCodes).filter(codeIsInTaxonomy),
    [selectedCodes],
  );
  const missing = useMemo(() => missingDependencies(selectedCodes), [selectedCodes]);
  const forceOpen = !!query.trim() || filter !== "all";

  const visibleModules = useMemo(() => {
    return PERMISSION_TAXONOMY.map((module) => {
      const moduleMatches = searchModule(query, module, t);
      const features = module.features
        .map((feature) => {
          const featureMatches = searchFeature(
            query,
            module,
            feature,
            catalogByCode,
            t,
          );
          const actions = feature.actions.filter((action) => {
            if (!matchesFilter(
              action,
              filter,
              selectedCodes.has(action.code),
              planUnavailableCodes.has(action.code),
            )) {
              return false;
            }
            if (!query.trim()) return true;
            return moduleMatches || featureMatches;
          });
          return { feature, actions, featureMatches };
        })
        .filter((row) => row.featureMatches && row.actions.length > 0);
      return { module, features };
    }).filter((row) => row.features.length > 0);
  }, [
    query,
    filter,
    selectedCodes,
    planUnavailableCodes,
    catalogByCode,
    t,
  ]);

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const toggleFeature = useCallback((featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  }, []);

  const expandAll = () => {
    setExpandedModules(new Set(PERMISSION_TAXONOMY.map((module) => module.id)));
    setExpandedFeatures(
      new Set(PERMISSION_TAXONOMY.flatMap((module) => module.features.map((feature) => feature.id))),
    );
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedFeatures(new Set());
  };

  const handleToggle = (code: string, enabled: boolean) => {
    const result = togglePermission(selectedCodes, code, enabled);
    if (result.blockedBy.length) {
      setNotice({
        tone: "warning",
        message: t("dependency.blockedRemoval", {
          defaultValue:
            "This permission is required by other enabled permissions: {{codes}}. Remove those first.",
          codes: result.blockedBy.join(", "),
        }),
      });
      return;
    }
    if (enabled) {
      const blockedAdditions = blockedGrantCodes(result.added, {
        isOwner,
        actorCodes,
        planUnavailableCodes,
      });
      if (blockedAdditions.length) {
        setNotice({
          tone: "warning",
          message: t("dependency.blockedAddition", {
            defaultValue:
              "This action needs permissions you cannot grant or that the plan does not include: {{codes}}.",
            codes: blockedAdditions.join(", "),
          }),
        });
        return;
      }
    }
    setNotice(
      result.added.length
        ? {
            tone: "info",
            message: t("dependency.added", {
              defaultValue: "Added required dependencies: {{codes}}.",
              codes: result.added.join(", "),
            }),
          }
        : null,
    );
    onSetCodes(result.next);
  };

  const applyPreset = (feature: PermissionFeature, value: string) => {
    let next: Set<string>;
    if (value === "none") {
      next = new Set(selectedCodes);
      for (const code of featureCodes(feature)) next.delete(code);
    } else {
      next = applyPresetToFeature(
        selectedCodes,
        feature,
        value as PresetId,
      );
    }
    const missingAfter = missingDependencies(next);
    if (missingAfter.length) {
      setNotice({
        tone: "warning",
        message: t("dependency.required", {
          defaultValue:
            "This change would remove required dependencies: {{codes}}. Use Custom to adjust them first.",
          codes: missingAfter.join(", "),
        }),
      });
      return;
    }
    const added = Array.from(next).filter((code) => !selectedCodes.has(code));
    const blockedAdditions = blockedGrantCodes(added, {
      isOwner,
      actorCodes,
      planUnavailableCodes,
    });
    if (blockedAdditions.length) {
      setNotice({
        tone: "warning",
        message: t("presets.blocked", {
          defaultValue:
            "This preset includes permissions you cannot grant or that the plan does not include: {{codes}}.",
          codes: blockedAdditions.join(", "),
        }),
      });
      return;
    }
    setNotice(null);
    onSetCodes(next);
  };

  const showAction = (code: string) => {
    return selectedCodes.has(code) || !readOnly;
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50/60">
      <div className="space-y-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("explorer.title", { defaultValue: "Permissions by business area" })}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {t("explorer.summary", {
                defaultValue:
                  "Permissions are combined across every assigned group, then restricted by plan and authorization rules.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-700">
              {t("explorer.enabledCount", {
                defaultValue: "{{enabled}} of {{total}} enabled",
                enabled: selectedBusinessCodes.length,
                total: PERMISSION_TAXONOMY.reduce(
                  (sum, module) => sum + moduleCounts(selectedCodes, module).total,
                  0,
                ),
              })}
            </span>
            {missing.length > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                {t("explorer.missingDependencies", {
                  defaultValue: "{{count}} missing dependenc{{suffix}}",
                  count: missing.length,
                  suffix: missing.length === 1 ? "y" : "ies",
                })}
              </span>
            )}
            {dirty && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800">
                {t("explorer.unsaved", { defaultValue: "Unsaved changes" })}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
            />
            <Input
              kind="text"
              size="sm"
              name="permissionSearch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("explorer.searchPlaceholder", {
                defaultValue: "Search modules, features, permissions or codes",
              })}
              className="pl-8"
              disabled={disabled}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
                disabled={disabled}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filter === item
                    ? "border-slate-300 bg-slate-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                } disabled:opacity-60`}
              >
                {t(`explorer.filters.${item}`, { defaultValue: item })}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-gray-500">
            {t("explorer.disclosureHint", {
              defaultValue:
                "Open a module, then a feature. Presets apply only to that feature and include its required read/page dependencies.",
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="xs" onClick={expandAll} disabled={disabled}>
              {t("explorer.expandAll", { defaultValue: "Expand all" })}
            </Button>
            <Button type="button" variant="outline" size="xs" onClick={collapseAll} disabled={disabled}>
              {t("explorer.collapseAll", { defaultValue: "Collapse all" })}
            </Button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              notice.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-sky-200 bg-sky-50 text-sky-800"
            }`}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{notice.message}</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => setNotice(null)}
            >
              {t("explorer.dismiss", { defaultValue: "Dismiss" })}
            </button>
          </div>
        )}

        {readOnly && (
          <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {t("explorer.systemReadOnly", {
                defaultValue:
                  "This is a system group. Its permissions are maintained by the platform and cannot be edited here.",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="max-h-[64dvh] space-y-2 overflow-y-auto p-3">
        {visibleModules.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
            {t("explorer.noMatches", {
              defaultValue: "No permissions match the search and filter.",
            })}
          </div>
        )}

        {visibleModules.map(({ module, features }) => {
          const counts = moduleCounts(selectedCodes, module);
          const state = stateFromCounts(counts.enabled, counts.total);
          const open = forceOpen || expandedModules.has(module.id);
          return (
            <section key={module.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <button
                type="button"
                className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50 sm:px-4"
                onClick={() => toggleModule(module.id)}
                aria-expanded={open}
              >
                <span className="mt-0.5 text-gray-400" aria-hidden="true">
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {t(`taxonomy.modules.${module.id}.name`, { defaultValue: module.name })}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      state === "enabled"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : state === "partial"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}>
                      {t(`explorer.states.${state}`, { defaultValue: state })}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                    {t(`taxonomy.modules.${module.id}.description`, { defaultValue: module.description })}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-gray-500">
                  <span className="block font-medium text-gray-700">{counts.enabled}/{counts.total}</span>
                  <span>{t("explorer.enabled", { defaultValue: "enabled" })}</span>
                </span>
              </button>

              {open && (
                <div className="space-y-2 border-t border-gray-100 bg-gray-50/70 p-2 sm:p-3">
                  {features.map(({ feature, actions }) => {
                    const featureCounts = {
                      enabled: featureCodes(feature).filter((code) => selectedCodes.has(code)).length,
                      total: featureCodes(feature).length,
                    };
                    const featureState = featureAccessState(selectedCodes, feature);
                    const featureOpen = forceOpen || expandedFeatures.has(feature.id);
                    const presets = availablePresets(feature);
                    return (
                      <article key={feature.id} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                        <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-gray-900">
                              {t(`taxonomy.features.${feature.id}.name`, { defaultValue: feature.name })}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-5 text-gray-500">
                              {t(`taxonomy.features.${feature.id}.description`, {
                                defaultValue: feature.description,
                              })}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
                              <span>{featureCounts.enabled}/{featureCounts.total} {t("explorer.enabled", { defaultValue: "enabled" })}</span>
                              {featureState === "custom" && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-700">
                                  {t("explorer.states.custom", { defaultValue: "Custom" })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {presets.length > 0 && (
                              <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                <span>{t("explorer.quickAccess", { defaultValue: "Quick access" })}</span>
                                <select
                                  value={featureState}
                                  onChange={(event) => applyPreset(feature, event.target.value)}
                                  disabled={disabled || readOnly}
                                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-800 disabled:opacity-60"
                                >
                                  <option value="none">{t("presets.none", { defaultValue: "No Access" })}</option>
                                  {presets.includes("read") && (
                                    <option value="read">{t("presets.read", { defaultValue: "Read Only" })}</option>
                                  )}
                                  {presets.includes("edit") && (
                                    <option value="edit">{t("presets.edit", { defaultValue: "Edit" })}</option>
                                  )}
                                  {presets.includes("full") && (
                                    <option value="full">{t("presets.full", { defaultValue: "Full Access" })}</option>
                                  )}
                                  {featureState === "custom" && (
                                    <option value="custom" disabled>
                                      {t("presets.custom", { defaultValue: "Custom" })}
                                    </option>
                                  )}
                                </select>
                              </label>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => toggleFeature(feature.id)}
                              aria-expanded={featureOpen}
                            >
                              {featureOpen
                                ? t("explorer.hideActions", { defaultValue: "Hide actions" })
                                : t("explorer.showActions", { defaultValue: "Show actions" })}
                            </Button>
                          </div>
                        </div>

                        {featureOpen && (
                          <div className="divide-y divide-gray-100 border-t border-gray-100">
                            {actions.map((action) => {
                              const selected = selectedCodes.has(action.code);
                              const unavailable = planUnavailableCodes.has(action.code);
                              const delegable = actionCanBeDelegated(action.code, {
                                isOwner,
                                actorCodes,
                              });
                              const dependencies = collectDependencies([action.code]);
                              dependencies.delete(action.code);
                              const missingForAction = Array.from(dependencies).filter(
                                (dependency) => !selectedCodes.has(dependency),
                              );
                              const actionDisabled =
                                disabled ||
                                readOnly ||
                                (!selected && unavailable) ||
                                (!selected && !delegable);
                              return (
                                <div key={action.code} className={`flex items-start gap-3 px-3 py-2.5 ${actionDisabled ? "bg-gray-50/60" : ""}`}>
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-slate-900 accent-slate-900 disabled:opacity-50"
                                    checked={selected}
                                    disabled={actionDisabled}
                                    onChange={(event) => handleToggle(action.code, event.target.checked)}
                                    aria-label={actionLabel(action.code, catalogByCode, t)}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs font-medium text-gray-900">
                                        {actionLabel(action.code, catalogByCode, t)}
                                      </span>
                                      <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
                                        {t(`explorer.kinds.${action.kind}`, { defaultValue: action.kind })}
                                      </span>
                                      {actionIsSensitive(action) && (
                                        <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700">
                                          {t("explorer.badges.sensitive", { defaultValue: "Sensitive" })}
                                        </span>
                                      )}
                                      {actionIsAdministrative(action) && (
                                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                                          {t("explorer.badges.administrative", { defaultValue: "Administrative" })}
                                        </span>
                                      )}
                                      {action.legacy && (
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
                                          {t("explorer.badges.legacy", { defaultValue: "Legacy" })}
                                        </span>
                                      )}
                                      {unavailable && (
                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
                                          {t("explorer.badges.planUnavailable", { defaultValue: "Plan unavailable" })}
                                        </span>
                                      )}
                                      {!delegable && !isOwner && (
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
                                          {t("explorer.badges.nonDelegable", { defaultValue: "Non-delegable" })}
                                        </span>
                                      )}
                                      {selected && missingForAction.length > 0 && (
                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
                                          {t("explorer.badges.missingDependency", { defaultValue: "Missing dependency" })}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 text-[11px] leading-5 text-gray-500">
                                      {actionDescription(action.code, catalogByCode, t) ||
                                        t("explorer.noDescription", { defaultValue: "No description available." })}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[10px] text-gray-400">{action.code}</p>
                                    {!selected && unavailable && (
                                      <p className="mt-1 text-[10px] text-amber-700">
                                        {t("explorer.planUnavailableHint", {
                                          defaultValue: "Your current plan does not make this permission available.",
                                        })}
                                      </p>
                                    )}
                                    {!selected && !delegable && !isOwner && !unavailable && (
                                      <p className="mt-1 text-[10px] text-gray-500">
                                        {t("explorer.nonDelegableHint", {
                                          defaultValue: "You cannot grant this permission because you do not hold it or it is not delegable.",
                                        })}
                                      </p>
                                    )}
                                    {showAction(action.code) && selected && missingForAction.length > 0 && (
                                      <p className="mt-1 text-[10px] text-amber-700">
                                        {t("explorer.missingActionDependencies", {
                                          defaultValue: "This permission requires: {{codes}}.",
                                          codes: missingForAction.join(", "),
                                        })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2 text-[11px] text-gray-600">
            {missing.length > 0 ? (
              <>
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>
                  {t("explorer.footerMissing", {
                    defaultValue: "Resolve missing dependencies before saving: {{codes}}.",
                    codes: missing.join(", "),
                  })}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                <span>
                  {t("explorer.footerHint", {
                    defaultValue: "The backend remains authoritative. Plan and delegation limits are enforced on save.",
                  })}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="cancel" onClick={onUndo} disabled={!dirty || disabled || readOnly}>
              {t("buttons.undo", { defaultValue: "Discard changes" })}
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={!dirty || disabled || readOnly || missing.length > 0}
              isLoading={disabled && dirty}
            >
              {t("buttons.save", { defaultValue: "Save permissions" })}
            </Button>
          </div>
        </div>
      </div>

      {readOnly && (
        <div className="border-t border-gray-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
          <Sparkles size={12} className="mr-1 inline" aria-hidden="true" />
          {t("explorer.systemFooter", {
            defaultValue: "System groups are read-only. Duplicate the group if you need a customizable copy.",
          })}
        </div>
      )}
    </div>
  );
};

export default PermissionExplorer;
