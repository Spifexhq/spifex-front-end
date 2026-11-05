import { useEffect, useState } from "react";
import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";
import type { CashflowCategory } from "@/models/settings/categories";
import type { Department } from "@/models/settings/departments";
import type { Project } from "@/models/settings/projects";
import type { InventoryItem } from "@/models/settings/inventory";
import type { Entity } from "@/models/settings/entities";
import type { DocumentType } from "@/models/entries/documentTypes";

export type OptionIssue = { source: string; status?: number; requestId?: string; invalidResponse?: boolean };
const names = ["categories", "departments", "projects", "inventory", "entities", "documents"];
export function useEntryOptions(open: boolean, type: string, attempt: number) {
  const [state, setState] = useState({ loading: true, issues: [] as OptionIssue[], categories: [] as CashflowCategory[], departments: [] as Department[], projects: [] as Project[], inventory: [] as InventoryItem[], entities: [] as Entity[], documents: [] as DocumentType[] });
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState(previous => ({ ...previous, loading: true, issues: [] }));
    void Promise.allSettled([
      api.getCashflowCategories().then(response => {
        const data: unknown = response.data;
        if (Array.isArray(data)) return data as CashflowCategory[];
        if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) return data.results as CashflowCategory[];
        throw new Error("Unexpected category response");
      }),
      fetchAllCursor<Department>(api.getDepartmentsOptions), fetchAllCursor<Project>(api.getProjectsOptions),
      fetchAllCursor<InventoryItem>(api.getInventoryOptions), fetchAllCursor<Entity>(api.getEntitiesOptions),
      fetchAllCursor<DocumentType>(api.getDocumentTypes),
    ]).then(([categories, departments, projects, inventory, entities, documents]) => {
      if (!alive) return;
      const issues = [categories, departments, projects, inventory, entities, documents].flatMap((result, i) => {
        if (result.status === "fulfilled") return [];
        const error = result.reason as { status?: number; request_id?: string; message?: string } | undefined;
        return [{ source: names[i], status: error?.status, requestId: error?.request_id, invalidResponse: /Unexpected|Repeated pagination/.test(error?.message || "") }];
      });
      setState({ loading: false, issues,
        categories: categories.status === "fulfilled" ? categories.value.filter(item => item.is_active !== false && (item.tx_type_hint == null || item.tx_type_hint === type)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.code || a.name).localeCompare(b.code || b.name, "en", { numeric: true })) : [],
        departments: departments.status === "fulfilled" ? departments.value : [], projects: projects.status === "fulfilled" ? projects.value : [], inventory: inventory.status === "fulfilled" ? inventory.value : [], entities: entities.status === "fulfilled" ? entities.value : [], documents: documents.status === "fulfilled" ? documents.value : [],
      });
    });
    return () => { alive = false; };
  }, [open, type, attempt]);
  return state;
}
