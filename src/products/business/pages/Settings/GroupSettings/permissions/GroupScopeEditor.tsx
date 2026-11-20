import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-900">
          {t("scope.title", { defaultValue: "Resource access" })}
        </h3>
        <p className="text-xs text-gray-500">
          {t("scope.description", {
            defaultValue:
              "Restrict each scoped capability to all resources, selected resources or no resources. Scopes are combined across assigned groups; ALL wins.",
          })}
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {scopedEntries.map(({ code, resourceType, key }) => {
          const row = rowFor(code, resourceType);
          const resources = resourcesByKey[key] ?? row.resources;
          const search = searchByKey[key] ?? "";
          const filtered = resources.filter((resource) =>
            resource.label.toLowerCase().includes(search.trim().toLowerCase()),
          );
          const selectedIds = new Set(row.resources.map((resource) => resource.id));
          return (
            <div key={key} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">
                    {actionLabel(code, catalogByCode, t)}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {t(RESOURCE_TYPE_LABEL[row.resource_type], {
                      defaultValue: row.resource_type.replace("_", " "),
                    })}{" · "}
                    <span className="font-mono">{code}</span>
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs text-gray-600">
                  <span>{t("scope.modeLabel", { defaultValue: "Access" })}</span>
                  <select
                    value={row.scope_mode}
                    onChange={(event) =>
                      changeMode(code, resourceType, event.target.value as ScopeMode)
                    }
                    disabled={disabled || readOnly}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 disabled:opacity-60"
                  >
                    <option value="none">{t("scope.modes.none", { defaultValue: "No access" })}</option>
                    <option value="all">{t("scope.modes.all", { defaultValue: "All" })}</option>
                    <option value="selected" disabled={ALL_ONLY_SCOPE_CODES.has(code)}>
                      {t("scope.modes.selected", { defaultValue: "Selected" })}
                    </option>
                  </select>
                </label>
              </div>

              {row.scope_mode === "selected" && (
                <div className="mt-3 rounded-md border border-gray-200 bg-white p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Input
                      kind="text"
                      size="sm"
                      name={`scope-search-${key}`}
                      value={search}
                      onChange={(event) =>
                        setSearchByKey((prev) => ({ ...prev, [key]: event.target.value }))
                      }
                      placeholder={t("scope.searchPlaceholder", {
                        defaultValue: "Search resources",
                      })}
                      disabled={disabled || readOnly}
                    />
                    <span className="text-[11px] text-gray-500">
                      {t("scope.selectedCount", {
                        defaultValue: "{{count}} selected",
                        count: row.resources.length,
                      })}
                    </span>
                  </div>
                  {loadingKey === key && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      {t("scope.loading", { defaultValue: "Loading resources…" })}
                    </p>
                  )}
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {filtered.map((resource) => (
                      <label
                        key={resource.id}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-slate-900"
                          checked={selectedIds.has(resource.id)}
                          disabled={disabled || readOnly}
                          onChange={() => toggleResource(code, resourceType, resource)}
                        />
                        <span className="min-w-0 truncate">{resource.label}</span>
                      </label>
                    ))}
                    {filtered.length === 0 && !loadingKey && (
                      <p className="px-1.5 py-1 text-[11px] text-gray-500">
                        {t("scope.noResources", { defaultValue: "No matching resources." })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {row.scope_mode !== "selected" && (
                <p className="mt-2 text-[11px] text-gray-500">
                  {row.scope_mode === "all"
                    ? t("scope.allHint", {
                        defaultValue: "This capability applies to every resource in the organization.",
                      })
                    : t("scope.noneHint", {
                        defaultValue: "This capability grants no resource access.",
                      })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default GroupScopeEditor;
