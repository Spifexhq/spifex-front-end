/* -------------------------------------------------------------------------- */
/*  File: src/pages/DepartmentSettings.tsx                                    */
/*  Style: Fixed Navbar + SidebarSettings, light borders, compact labels      */
/*  Notes: org-scoped, string ids (ULID), modal in 3 columns                  */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";

import { api } from "src/api/requests";
import type { Department } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";
import Checkbox from "src/components/Checkbox";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "DP";
}

function sortByCodeThenName(a: Department, b: Department) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

/* Row without its own borders; container uses divide-y */
const Row = ({
  dept,
  onEdit,
  onDelete,
  canEdit,
}: {
  dept: Department;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {dept.code ? `Code: ${dept.code}` : "—"} {dept.is_active === false ? "• Inactive" : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {dept.name || "(no name)"}
      </p>
    </div>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
          onClick={() => onEdit(dept)}
        >
          Edit
        </Button>
        <Button variant="common" onClick={() => onDelete(dept)}>
          Delete
        </Button>
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
const emptyForm = {
  name: "",
  code: "",
  is_active: true,
};
type FormState = typeof emptyForm;

const DepartmentSettings: React.FC = () => {
  useEffect(() => {
    document.title = "Department Settings";
  }, []);

  const { isOwner } = useAuthContext();

  /* ------------------------------- Modal state ----------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  /* ------------------------------- Filter state ---------------------------- */
  // query: what the user is typing
  // appliedQuery: the filter actually used in API calls (only changes on button click)
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* --------------------------- Pagination (reusable) ----------------------- */
  // Stable page fetcher for the hook (page size = 100)
  const fetchDepartmentsPage = useCallback(
    async (cursor?: string) => {
      const { data, meta } = await api.getDepartments({
        page_size: 100,
        cursor,
        q: appliedQuery || undefined, // filter by name/code only when the button is clicked
      });
      const items = (data.results ?? []).slice().sort(sortByCodeThenName);
      const nextUrl = meta?.pagination?.next ?? data.next ?? null;
      const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;
      return { items, nextCursor };
    },
    [appliedQuery]
  );

  const pager = useCursorPager<Department>(fetchDepartmentsPage, {
    autoLoadFirst: true,
    deps: [appliedQuery], // reset + load first page when the applied filter changes
  });

  const { refresh } = pager;

  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) {
      refresh();
    } else {
      setAppliedQuery(trimmed);
    }
  }, [query, appliedQuery, refresh]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingDept(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setMode("edit");
    setEditingDept(dept);
    setFormData({
      name: dept.name ?? "",
      code: dept.code ?? "",
      is_active: dept.is_active ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingDept(null);
    setFormData(emptyForm);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleActive = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, is_active: e.target.checked }));
  };

  const submitDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      code: formData.code, // can be "", serializer allow_blank=True
      is_active: formData.is_active,
    };
    try {
      if (mode === "create") {
        await api.addDepartment(payload);
      } else if (editingDept) {
        await api.editDepartment(editingDept.id, payload);
      }
      await pager.refresh(); // reset to first page & reload with current appliedQuery
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Failed to save department."
      );
    }
  };

  const deleteDepartment = async (dept: Department) => {
    try {
      await api.deleteDepartment(dept.id);
      await pager.refresh(); // keep cursor state consistent (respecting appliedQuery)
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Failed to delete department."
      );
    }
  };

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (pager.loading && pager.items.length === 0) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="departments" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Settings</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Departments</h1>
              </div>
            </div>
          </header>

          {/* Main card */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    Department list
                  </span>

                  {/* Search area: only triggers on button click */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        // Do NOT search on Enter to comply with requirement:
                        // "Need to click a button to search. Don't update automatically."
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      placeholder="Search by name or code…"
                      aria-label="Search departments"
                    />
                    <Button onClick={onSearch} variant="outline" aria-label="Run search">
                      Search
                    </Button>

                    {isOwner && (
                      <Button onClick={openCreateModal} className="!py-1.5">
                        Add department
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* --------- LIST AREA with ARROW-ONLY pagination footer --------- */}
              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">Failed to load</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh}>
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {pager.items.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">
                        No departments found on this page.
                      </p>
                    ) : (
                      pager.items.map((d) => (
                        <Row
                          key={d.id}
                          dept={d}
                          canEdit={!!isOwner}
                          onEdit={openEditModal}
                          onDelete={deleteDepartment}
                        />
                      ))
                    )}
                  </div>

                  {/* Arrow-only footer */}
                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev}
                    disabledNext={!pager.canNext}
                    label={`Page ${pager.index + 1} of ${
                      pager.reachedEnd ? pager.knownPages : `${pager.knownPages}+`
                    }`}
                  />
                </>
              )}
              {/* ------------------------ /LIST AREA -------------------------- */}
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-2xl"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Add department" : "Edit department"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitDepartment}>
                {/* 3 columns on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                  />
                  <label className="flex items-center gap-2 text-sm pt-5">
                    <Checkbox
                      checked={formData.is_active}
                      onChange={handleActive}
                    />
                    Active department
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------------- Snackbar ------------------------------ */}
      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage("")}
        severity="error"
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default DepartmentSettings;
