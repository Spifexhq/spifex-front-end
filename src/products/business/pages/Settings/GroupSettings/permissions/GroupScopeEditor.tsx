import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import type { GroupScope, Permission, ScopeMode, ScopeResource } from "@/models/auth/rbac";
import { api } from "@/core/api/requests";
import { actionLabel } from "./helpers";
import { SCOPED_PERMISSION_RESOURCES, type ScopeResourceType } from "./taxonomy";

type Props = {
  selectedCodes: Set<string>;
  scopes: GroupScope[];
  onChange: (scopes: GroupScope[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  catalog: Permission[];
};

const RESOURCE_TYPE_LABEL: Record<string, string> = {
  bank_account: "scope.resourceTypes.bank_account",
  department: "scope.resourceTypes.department",
  project: "scope.resourceTypes.project",
};

const ALL_ONLY_SCOPE_CODES = new Set(["add_bank", "add_department", "add_project"]);

const GroupScopeEditor: React.FC<Props> = ({
  selectedCodes,
  scopes,
  onChange,
  disabled = false,
  readOnly = false,
  catalog,
}) => {
  const { t } = useTranslation("groupPermissionsTable");
  const [resourcesByKey, setResourcesByKey] = useState<Record<string, ScopeResource[]>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [searchByKey, setSearchByKey] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState("");
  const loadedRef = useRef<Set<string>>(new Set());
  const catalogByCode = useMemo(
    () => new Map(catalog.map((permission) => [permission.code, permission])),
    [catalog],
  );

  const scopedEntries = useMemo(
    () =>
      Array.from(selectedCodes)
        .flatMap((code) =>
          (SCOPED_PERMISSION_RESOURCES[code] ?? []).map((resourceType) => ({
            code,
            resourceType,
            key: `${code}:${resourceType}`,
          })),
        )
        .sort((left, right) => left.key.localeCompare(right.key)),
    [selectedCodes],
  );

  const rowFor = (code: string, resourceType: ScopeResourceType): GroupScope => {
    const existing = scopes.find(
      (scope) =>
        scope.permission_code === code && scope.resource_type === resourceType,
    );
    if (existing) return existing;
    return {
      permission_code: code,
      resource_type: resourceType,
      scope_mode: "none",
      resources: [],
    };
  };

  const updateScope = (code: string, resourceType: string, next: GroupScope) => {
    onChange([
      ...scopes.filter(
        (scope) =>
          !(
            scope.permission_code === code &&
            scope.resource_type === resourceType
          ),
      ),
      next,
    ]);
  };

  const changeMode = (code: string, resourceType: ScopeResourceType, mode: ScopeMode) => {
    const row = rowFor(code, resourceType);
    updateScope(code, resourceType, {
      ...row,
      scope_mode: mode,
      resources: mode === "selected" ? row.resources : [],
    });
  };

  const toggleResource = (
    code: string,
    resourceType: ScopeResourceType,
    resource: ScopeResource,
  ) => {
    const row = rowFor(code, resourceType);
    const exists = row.resources.some((item) => item.id === resource.id);
    updateScope(code, resourceType, {
      ...row,
      scope_mode: "selected",
      resources: exists
        ? row.resources.filter((item) => item.id !== resource.id)
        : [...row.resources, resource],
    });
  };

  useEffect(() => {
    if (scopedEntries.length === 0) {
      if (activeKey) setActiveKey("");
      return;
    }
    if (!scopedEntries.some((entry) => entry.key === activeKey)) {
      setActiveKey(scopedEntries[0].key);
    }
  }, [scopedEntries, activeKey]);

  useEffect(() => {
    if (readOnly) return;
    for (const entry of scopedEntries) {
      if (loadedRef.current.has(entry.key)) continue;
      loadedRef.current.add(entry.key);
      setLoadingKey(entry.key);
      void api
        .getScopeResources(entry.code, entry.resourceType)
        .then((response) => {
          setResourcesByKey((prev) => ({
            ...prev,
            [entry.key]: response.data.resources || [],
          }));
        })
        .catch(() => {
          setResourcesByKey((prev) => ({ ...prev, [entry.key]: [] }));
        })
        .finally(() =>
          setLoadingKey((current) => (current === entry.key ? null : current)),
        );
    }
  }, [scopedEntries, readOnly]);

  if (scopedEntries.length === 0) {
    return (
      <div className="border-b border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
        {t("scope.empty", {
          defaultValue:
            "No resource-scoped permissions are selected. Select banking, department or project actions to configure their resources.",
        })}
      </div>
    );
  }

  const activeEntry =
    scopedEntries.find((entry) => entry.key === activeKey) ?? scopedEntries[0];
  const activeRow = rowFor(activeEntry.code, activeEntry.resourceType);
  const activeResources = resourcesByKey[activeEntry.key] ?? activeRow.resources;
  const activeSearch = searchByKey[activeEntry.key] ?? "";
  const activeFiltered = activeResources.filter((resource) =>
    resource.label.toLowerCase().includes(activeSearch.trim().toLowerCase()),
  );
  const activeSelectedIds = new Set(
    activeRow.resources.map((resource) => resource.id),
  );

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-900">
          {t("scope.title", { defaultValue: "Resource access" })}
        </h3>
        <p className="text-xs text-gray-500">
          {t("scope.description", {
            defaultValue:
              "Choose one scoped capability, then limit its resources. Scopes are combined across assigned groups; ALL wins.",
          })}
        </p>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="group"
        aria-label={t("scope.title", { defaultValue: "Resource access" })}
      >
        {scopedEntries.map((entry) => {
          const selected = entry.key === activeEntry.key;
          return (
            <button
              key={entry.key}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => setActiveKey(entry.key)}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors disabled:opacity-60 ${
                selected
                  ? "border-slate-300 bg-slate-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="min-w-0 truncate">
                {actionLabel(entry.code, catalogByCode, t)}
              </span>
              <span className={`shrink-0 ${selected ? "text-slate-300" : "text-gray-400"}`}>
                {t(RESOURCE_TYPE_LABEL[entry.resourceType], {
                  defaultValue: entry.resourceType.replace("_", " "),
                })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">
              {actionLabel(activeEntry.code, catalogByCode, t)}
            </p>
            <p className="text-[11px] text-gray-500">
              {t(RESOURCE_TYPE_LABEL[activeRow.resource_type], {
                defaultValue: activeRow.resource_type.replace("_", " "),
              })}{" "}
              <span className="font-mono">{activeEntry.code}</span>
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-gray-600">
            <span>{t("scope.modeLabel", { defaultValue: "Access" })}</span>
            <select
              value={activeRow.scope_mode}
              onChange={(event) =>
                changeMode(
                  activeEntry.code,
                  activeEntry.resourceType,
                  event.target.value as ScopeMode,
                )
              }
              disabled={disabled || readOnly}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 disabled:opacity-60"
            >
              <option value="none">{t("scope.modes.none", { defaultValue: "No access" })}</option>
              <option value="all">{t("scope.modes.all", { defaultValue: "All" })}</option>
              <option value="selected" disabled={ALL_ONLY_SCOPE_CODES.has(activeEntry.code)}>
                {t("scope.modes.selected", { defaultValue: "Selected" })}
              </option>
            </select>
          </label>
        </div>

        {activeRow.scope_mode === "selected" && (
          <div className="mt-3 rounded-md border border-gray-200 bg-white p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                kind="text"
                size="sm"
                name={`scope-search-${activeEntry.key}`}
                value={activeSearch}
                onChange={(event) =>
                  setSearchByKey((prev) => ({
                    ...prev,
                    [activeEntry.key]: event.target.value,
                  }))
                }
                placeholder={t("scope.searchPlaceholder", {
                  defaultValue: "Search resources",
                })}
                disabled={disabled || readOnly}
              />
              <span className="text-[11px] text-gray-500">
                {t("scope.selectedCount", {
                  defaultValue: "{{count}} selected",
                  count: activeRow.resources.length,
                })}
              </span>
            </div>
            {loadingKey === activeEntry.key && (
              <p className="mt-2 text-[11px] text-gray-500">
                {t("scope.loading", { defaultValue: "Loading resources..." })}
              </p>
            )}
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {activeFiltered.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={activeSelectedIds.has(resource.id)}
                    disabled={disabled || readOnly}
                    size="small"
                    onChange={() =>
                      toggleResource(
                        activeEntry.code,
                        activeEntry.resourceType,
                        resource,
                      )
                    }
                    aria-label={resource.label}
                  />
                  <span className="min-w-0 truncate">{resource.label}</span>
                </div>
              ))}
              {activeFiltered.length === 0 && !loadingKey && (
                <p className="px-1.5 py-1 text-[11px] text-gray-500">
                  {t("scope.noResources", { defaultValue: "No matching resources." })}
                </p>
              )}
            </div>
          </div>
        )}

        {activeRow.scope_mode !== "selected" && (
          <p className="mt-2 text-[11px] text-gray-500">
            {activeRow.scope_mode === "all"
              ? t("scope.allHint", {
                  defaultValue: "This capability applies to every resource in the organization.",
                })
              : t("scope.noneHint", {
                  defaultValue: "This capability grants no resource access.",
                })}
          </p>
        )}
      </div>
    </section>
  );
};

export default GroupScopeEditor;
