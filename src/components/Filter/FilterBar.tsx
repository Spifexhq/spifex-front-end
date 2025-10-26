/* --------------------------------------------------------------------------
 * File: src/components/Filter/FilterBar.tsx
 * Style: Minimalist / compact. No shadows (except in "Adicionar filtro +" menu).
 * Adds (this patch): Keyboard shortcuts + quick date-range helpers
 *   - Ctrl/⌘+Enter → Apply
 *   - Ctrl/⌘+K → focus search
 *   - Quick ranges in date popover: Hoje / Esta semana / Mês atual / Trimestre / Ano
 * -------------------------------------------------------------------------- */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { BankAccount } from "@/models/enterprise_structure/domain/Bank";
import type { GLAccount } from "src/models/enterprise_structure/domain/GLAccount";
import { SelectDropdown } from "@/components/SelectDropdown";
import { useBanks } from "@/hooks/useBanks";
import type { EntryFilters } from "src/models/entries/domain";
import {
  ChipKey,
  LocalFilters,
  Visualization,
} from "src/models/entries/domain";
import { api } from "src/api/requests";
import Button from "../Button";
import Checkbox from "../Checkbox";
import { formatCurrency } from "src/lib/currency";
import { handleUtilitaryAmountKeyDown } from "src/lib/form/amountKeyHandlers";

/* ------------------------------ Utils ------------------------------ */
function useOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

/** GLAccount pode vir como { id } (string ULID) ou { external_id } */
type GLAccountLike = GLAccount & { id?: string; external_id?: string };
function getGlaId(a: GLAccountLike): string {
  return String(a.id ?? a.external_id ?? "");
}

/* ---- Date helpers (for quick ranges) ---- */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function startOfWeekISO(d = new Date()) {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7; // start Monday
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  return start.toISOString().slice(0, 10);
}
function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function startOfQuarterISO(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1).toISOString().slice(0, 10);
}
function startOfYearISO(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

/* ---- Chip amount helper ---- */
function amountChipLabel(minDigits?: string, maxDigits?: string) {
  const parts: string[] = [];
  if (minDigits) parts.push(`≥ ${formatCurrency(minDigits)}`);
  if (maxDigits) parts.push(`≤ ${formatCurrency(maxDigits)}`);
  return `Valor ${parts.join(" ")}`.trim();
}
const centsDigitsToInt = (s: string | undefined) =>
  Number(String(s ?? "").replace(/\D/g, "")) || 0;

interface FilterBarProps {
  onApply: (payload: { filters: EntryFilters }) => void;
  initial?: EntryFilters;
  bankActive?: boolean;
  contextSettlement: false | true;
}

/* -------------------------------- Component -------------------------------- */
const FilterBar: React.FC<FilterBarProps> = ({ onApply, initial, bankActive, contextSettlement }) => {
  const { banks: rawBanks } = useBanks(undefined, 0, bankActive);
  const banks = useMemo(() => (Array.isArray(rawBanks) ? rawBanks : []), [rawBanks]);

  const [ledgerAccounts, setLedgerAccounts] = useState<GLAccountLike[]>([]);

  const [filters, setFilters] = useState<LocalFilters>(() => ({
    start_date: initial?.start_date || "",
    end_date: initial?.end_date || "",
    description: initial?.description || "",
    observation: initial?.observation || "",
    gla_id: Array.isArray(initial?.gla_id) ? (initial!.gla_id as unknown[]).map(String) : [],
    bank_id: Array.isArray(initial?.bank_id) ? (initial!.bank_id as unknown[]).map(String) : [],
    tx_type: undefined,
    amount_min: "",
    amount_max: "",
    settlement_status: initial?.settlement_status ?? contextSettlement,
  }));

  /* Saved visualizations */
  const [views, setViews] = useState<Visualization[]>([]);
  const scopedViews = useMemo(
    () => views.filter((v) => v.settlement_status === contextSettlement),
    [views, contextSettlement]
  );

  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [viewsLoaded, setViewsLoaded] = useState(false);

  /* “Salvar visualização” — agora modal */
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [saveMode, setSaveMode] = useState<"create" | "overwrite">("create");
  const [overwriteId, setOverwriteId] = useState<string | null>(null);

  /* Config modal (somente “Visualizações salvas”) */
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  /* Menus/Popovers */
  const [menuOpen, setMenuOpen] = useState(false);
  const [openEditor, setOpenEditor] = useState<ChipKey | null>(null);

  const toggleEditor = useCallback((k: ChipKey) => {
    setOpenEditor((curr) => (curr === k ? null : k));
  }, []);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutside(menuRef, () => setMenuOpen(false));

  const viewsMenuRef = useRef<HTMLDivElement>(null);
  useOutside(viewsMenuRef, () => setViewsMenuOpen(false));

  /* ---- Keyboard shortcuts ---- */
  const applyFilters = useCallback(() => {
    onApply({ filters: toEntryFilters(filters) });
  }, [onApply, filters]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (cmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (cmdOrCtrl && e.key === "Enter") {
        e.preventDefault();
        applyFilters();
        return;
      }
      if (e.key === "Escape") {
        setOpenEditor(null);
        setViewsMenuOpen(false);
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyFilters]);

  /* Load GL Accounts (cursor API) */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const all: GLAccountLike[] = [];
        let cursor: string | undefined;
        do {
          const { data } = await api.getLedgerAccounts({ page_size: 200, cursor });
          const page = (data?.results ?? []) as GLAccountLike[];
          all.push(...page);
          cursor = (data?.next ?? undefined) || undefined;
        } while (cursor);
        setLedgerAccounts(all);
      } catch (err) {
        console.error("Failed to load GL Accounts", err);
        setLedgerAccounts([]);
      }
    };
    fetchAll();
  }, []);

  /* Saved views (read org id from store inside requests) */
  const refreshViews = async () => {
    try {
      const { data } = await api.getEntryViews();
      const list = Array.isArray(data)
        ? data
        : (data as unknown as { results?: Visualization[] })?.results ?? [];
      setViews(list as Visualization[]);
    } catch (err) {
      console.error("Failed to load saved views", err);
    } finally {
      setViewsLoaded(true);           // <-- tell boot logic we can decide now
    }
  };

  useEffect(() => {
    void refreshViews();
  }, []);

  const didInitialApply = useRef(false);
  useEffect(() => {
    if (didInitialApply.current || !viewsLoaded) return;

    const def = scopedViews.find((v) => v.is_default);
    if (def) {
      const nextLocal: LocalFilters = {
        ...(def.filters as LocalFilters),
        settlement_status: !!def.settlement_status,
      };
      setFilters((prev) => ({ ...prev, ...nextLocal }));    // reflect in chips
      onApply({ filters: toEntryFilters(nextLocal) });      // single initial request WITH filters
    } else {
      onApply({ filters: toEntryFilters(filters) });        // single initial request WITHOUT filters
    }

    didInitialApply.current = true;
  }, [viewsLoaded, scopedViews, filters, onApply]);

  /* Apply default view automatically ONCE (when available for this context) */
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;

    const def = scopedViews.find((v) => v.is_default);
    if (!def) return;

    // 1) Update local UI state so chips reflect the default
    const nextLocal = {
      ...(def.filters as LocalFilters),
      settlement_status: !!def.settlement_status,
    };
    setFilters((prev) => ({ ...prev, ...nextLocal }));

    // 2) Auto-apply to parent (no need to click "Aplicar")
    onApply({ filters: toEntryFilters(nextLocal) });

    bootstrappedRef.current = true;
  }, [scopedViews, contextSettlement, onApply]);

  const selectedBanks = useMemo(() => {
    const sel = new Set((filters.bank_id ?? []).map(String));
    return banks.filter((b) => sel.has(String(b.id)));
  }, [banks, filters.bank_id]);

  const selectedAccounts = useMemo(
    () => (ledgerAccounts ?? []).filter((a) => (filters.gla_id ?? []).includes(getGlaId(a))),
    [ledgerAccounts, filters.gla_id]
  );

  function toEntryFilters(f: LocalFilters): EntryFilters {
    return {
      start_date: f.start_date,
      end_date: f.end_date,
      description: f.description,
      observation: f.observation,
      gla_id: f.gla_id,
      bank_id: f.bank_id,
      tx_type: f.tx_type,
      amount_min: f.amount_min ? centsDigitsToInt(f.amount_min) : undefined,
      amount_max: f.amount_max ? centsDigitsToInt(f.amount_max) : undefined,
      settlement_status: f.settlement_status as false | true,
    } as EntryFilters;
  }

  function clearAll() {
    const cleared: LocalFilters = {
      start_date: "",
      end_date: "",
      description: "",
      observation: "",
      gla_id: [],
      bank_id: [],
      tx_type: undefined,
      amount_min: "",
      amount_max: "",
      settlement_status: contextSettlement,
    };

    // Clear local state (chips will disappear)
    setFilters(cleared);

    // Close any open editor/menu so the UI updates cleanly
    setOpenEditor(null);
    setMenuOpen(false);
    setViewsMenuOpen(false);

    // Tell parent to refetch with cleared filters
    onApply({ filters: toEntryFilters(cleared) });
  }

  function removeChip(k: ChipKey) {
    if (k === "date") setFilters((f) => ({ ...f, start_date: "", end_date: "" }));
    if (k === "banks") setFilters((f) => ({ ...f, bank_id: [] }));
    if (k === "accounts") setFilters((f) => ({ ...f, gla_id: [] }));
    if (k === "observation") setFilters((f) => ({ ...f, observation: "" }));
    if (k === "tx_type") setFilters((f) => ({ ...f, tx_type: undefined }));
    if (k === "amount") setFilters((f) => ({ ...f, amount_min: "", amount_max: "" }));
  }

  const hasActive =
    !!filters.start_date ||
    !!filters.end_date ||
    (filters.bank_id?.length ?? 0) > 0 ||
    (filters.gla_id?.length ?? 0) > 0 ||
    !!filters.observation ||
    !!filters.description ||
    !!filters.tx_type ||
    !!filters.amount_min ||
    !!filters.amount_max;

  /* ------------------------------ Save Visualization (Modal) ------------------------------ */

  function resetSaveModalState() {
    setSaveName("");
    setSaveDefault(false);
    setSaveMode("create");
    setOverwriteId(null);
  }
  const openSaveModal = () => {
    resetSaveModalState();
    setSaveModalOpen(true);
  };
  const closeSaveModal = () => {
    setSaveModalOpen(false);
    setTimeout(() => resetSaveModalState(), 0);
  };

  // Close modals with ESC (keep original behavior)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (saveModalOpen) setSaveModalOpen(false);
        if (configModalOpen) setConfigModalOpen(false);
      }
    }
    if (saveModalOpen || configModalOpen) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [saveModalOpen, configModalOpen]);

  const handleSaveVisualization = async () => {
    const name = saveName.trim();
    if (!name) return;

    const payload = {
      name,
      is_default: saveDefault,
      settlement_status: !!filters.settlement_status,
      filters,
    };

    try {
      if (saveMode === "overwrite" && overwriteId) {
        await api.editEntryView(overwriteId, payload);
      } else {
        const sameName = views.find(
          (v) => v.name.toLowerCase() === name.toLowerCase() && v.settlement_status === !!filters.settlement_status
        );
        if (sameName) await api.editEntryView(sameName.id, payload);
        else await api.addEntryView(payload);
      }
      await refreshViews();
    } catch (err) {
      console.error("Failed to save visualization", err);
    } finally {
      closeSaveModal();
    }
  };

  function applyVisualization(v: Visualization) {
    const next = { ...(v.filters as LocalFilters), settlement_status: !!v.settlement_status };
    setFilters(next);
    // For non-default views, we keep "Aplicar" manual on purpose.
  }

  /* ---------- Manage views inside config modal ---------- */
  const toggleDefaultView = async (view: Visualization) => {
    try {
      if (view.is_default) {
        // Unset current default (allow zero defaults)
        await api.editEntryView(view.id, { is_default: false });
      } else {
        // Set this as default…
        await api.editEntryView(view.id, { is_default: true });
        // …and unset any other default in the same scope (safety)
        const others = scopedViews.filter((v) => v.id !== view.id && v.is_default);
        if (others.length) {
          await Promise.all(others.map((o) => api.editEntryView(o.id, { is_default: false })));
        }
        bootstrappedRef.current = false;
      }
      await refreshViews();
    } catch (err) {
      console.error("Failed to toggle default view", err);
    }
  };

  const deleteView = async (viewId: string) => {
    try {
      await api.deleteEntryView(viewId);
      setViews((prev) => prev.filter((v) => v.id !== viewId));
    } catch (err) {
      console.error("Failed to delete view", err);
    }
  };

  const startRenaming = (v: Visualization) => {
    setRenamingId(v.id);
    setRenamingName(v.name);
  };
  const cancelRenaming = () => {
    setRenamingId(null);
    setRenamingName("");
  };
  const saveRenaming = async () => {
    const id = renamingId;
    const name = renamingName.trim();
    if (!id || !name) return;
    try {
      await api.editEntryView(id, { name });
      await refreshViews();
    } catch (err) {
      console.error("Failed to rename view", err);
    } finally {
      cancelRenaming();
    }
  };

  /* ---------------------------------- Render -------------------------------- */
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {/* Search + chips */}
        <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-2 h-8 whitespace-nowrap overflow-x-auto bg-white">
          {(filters.start_date || filters.end_date) && (
            <Chip
              icon="calendar"
              label={`Datas  ${filters.start_date || "yyyy-mm-dd"} - ${filters.end_date || "yyyy-mm-dd"}`}
              onClick={() => toggleEditor("date")}
              onRemove={() => removeChip("date")}
            />
          )}
          {(filters.bank_id?.length ?? 0) > 0 && (
            <Chip
              icon="bank"
              label={`Banco  ${selectedBanks.slice(0, 2).map((b) => b.institution).join(", ")}${
                selectedBanks.length > 2 ? ` +${selectedBanks.length - 2}` : ""
              }`}
              onClick={() => toggleEditor("banks")}
              onRemove={() => removeChip("banks")}
            />
          )}
          {(filters.gla_id?.length ?? 0) > 0 && (
            <Chip
              icon="accounts"
              label={`Conta contábil  ${selectedAccounts.slice(0, 2).map((a) => a.name).join(", ")}${
                selectedAccounts.length > 2 ? ` +${selectedAccounts.length - 2}` : ""
              }`}
              onClick={() => toggleEditor("accounts")}
              onRemove={() => removeChip("accounts")}
            />
          )}
          {!!filters.tx_type && (
            <Chip
              icon="note"
              label={`Tipo ${filters.tx_type === "credit" ? "Receita" : "Despesa"}`}
              onClick={() => toggleEditor("tx_type")}
              onRemove={() => removeChip("tx_type")}
            />
          )}
          {(filters.amount_min || filters.amount_max) && (
            <Chip
              icon="note"
              label={amountChipLabel(filters.amount_min, filters.amount_max)}
              onClick={() => toggleEditor("amount")}
              onRemove={() => removeChip("amount")}
            />
          )}
          {!!filters.observation && (
            <Chip
              icon="note"
              label={`Observação  ${filters.observation}`}
              onClick={() => toggleEditor("observation")}
              onRemove={() => removeChip("observation")}
            />
          )}

          <input
            ref={searchInputRef}
            className="flex-[1_1_30%] min-w-[160px] h-6 bg-transparent outline-none text-xs placeholder-gray-400"
            placeholder="Buscar ou filtrar… (Ctrl/⌘+K)"
            value={filters.description || ""}
            onChange={(e) => setFilters((f) => ({ ...f, description: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
        </div>

        {/* Config — MODAL (apenas 'Visualizações salvas') */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            aria-label="Configurações"
            onClick={() => setConfigModalOpen(true)}
            className="text-sm bg-white hover:bg-gray-50"
          >
            ⚙️
          </Button>
        </div>

        {/* Save visualization — MODAL */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold bg-white hover:bg-gray-50"
            onClick={openSaveModal}
          >
            Salvar visualização
          </Button>
        </div>

        {/* Load visualization (menu rápido) */}
        <div className="relative" ref={viewsMenuRef}>
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${viewsMenuOpen ? "!bg-white !border-gray-400" : ""}`}
            onClick={() => setViewsMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={viewsMenuOpen}
          >
            Visualizações
          </Button>
          {viewsMenuOpen && (
            <div
              className="absolute right-0 top-full z-[99999] w-72 rounded-md border border-gray-300 bg-white p-2 shadow-lg"
              role="menu"
            >
              {(scopedViews.length ? scopedViews : []).map((v) => (
                <MenuItem
                  key={v.id}
                  label={`${v.name}${v.is_default ? " ⭐" : ""}`}
                  onClick={() => {
                    setViewsMenuOpen(false);
                    applyVisualization(v);
                  }}
                />
              ))}
              {scopedViews.length === 0 && (
                <div className="text-xs text-gray-500 px-2 py-1">Nenhuma visualização salva</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Second row: actions */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {/* Add filter + menu */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${menuOpen ? "!bg-white !border-gray-400" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
          >
            Adicionar filtro +
          </Button>

          {menuOpen && (
            <div className="absolute left-0 top-full z-[99999] w-72 rounded-md border border-gray-300 bg-white p-2 shadow-lg">
              <MenuItem label="Período" onClick={() => (setOpenEditor("date"), setMenuOpen(false))} />
              <MenuItem label="Banco" onClick={() => (setOpenEditor("banks"), setMenuOpen(false))} />
              <MenuItem label="Conta contábil" onClick={() => (setOpenEditor("accounts"), setMenuOpen(false))} />
              <MenuItem label="Observação" onClick={() => (setOpenEditor("observation"), setMenuOpen(false))} />
              <div className="my-1 border-t border-gray-200" />
              <MenuItem label="Tipo (Receita/Despesa)" onClick={() => (setOpenEditor("tx_type"), setMenuOpen(false))} />
              <MenuItem label="Valor (mín/máx)" onClick={() => (setOpenEditor("amount"), setMenuOpen(false))} />
            </div>
          )}
        </div>

        {/* Apply */}
        <div className="ml-auto sm:ml-0">
          <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={applyFilters}>
            Aplicar
          </Button>
        </div>

        {/* Clear filters */}
        <button
          className={`text-xs font-semibold text-red-600 ${hasActive ? "" : "opacity-40 cursor-not-allowed"}`}
          onClick={() => hasActive && clearAll()}
        >
          Limpar filtros
        </button>

      </div>

      {/* Editors (border-only, no shadow) */}
      <div className="relative">
        {openEditor === "date" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[360px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Início</span>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={filters.start_date || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Fim</span>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={filters.end_date || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
                />
              </label>
            </div>

            {/* Quick date-range helpers */}
            <div className="mt-2">
              <div className="text-[11px] text-gray-500 mb-1">Atalhos</div>
              <div className="flex items-center gap-2 flex-wrap">
                <QuickButton onClick={() => setFilters((f) => ({ ...f, start_date: todayISO(), end_date: todayISO() }))}>
                  Hoje
                </QuickButton>
                <QuickButton onClick={() => setFilters((f) => ({ ...f, start_date: startOfWeekISO(), end_date: todayISO() }))}>
                  Esta semana
                </QuickButton>
                <QuickButton onClick={() => setFilters((f) => ({ ...f, start_date: startOfMonthISO(), end_date: todayISO() }))}>
                  Mês atual
                </QuickButton>
                <QuickButton onClick={() => setFilters((f) => ({ ...f, start_date: startOfQuarterISO(), end_date: todayISO() }))}>
                  Trimestre
                </QuickButton>
                <QuickButton onClick={() => setFilters((f) => ({ ...f, start_date: startOfYearISO(), end_date: todayISO() }))}>
                  Ano
                </QuickButton>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => removeChip("date")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => (setOpenEditor(null), applyFilters())}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "banks" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <SelectDropdown<BankAccount>
              label="Bancos"
              items={banks}
              selected={selectedBanks}
              onChange={(list) => setFilters((f) => ({ ...f, bank_id: list.map((x) => String(x.id)) }))}
              getItemKey={(item) => item.id}
              getItemLabel={(item) => item.institution}
              buttonLabel="Selecionar bancos"
              customStyles={{ maxHeight: "240px" }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={() => removeChip("banks")}>
                Remover
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => (setOpenEditor(null), applyFilters())}
              >
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "accounts" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <SelectDropdown<GLAccountLike>
              label="Contas contábeis"
              items={ledgerAccounts}
              selected={selectedAccounts}
              onChange={(list) => setFilters((f) => ({ ...f, gla_id: list.map((x) => getGlaId(x)) }))}
              getItemKey={(item) => getGlaId(item)}
              getItemLabel={(item) => item.name}
              buttonLabel="Selecionar contas"
              customStyles={{ maxHeight: "240px" }}
              groupBy={(item) => item.subcategory || ""}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={() => removeChip("accounts")}>
                Remover
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => (setOpenEditor(null), applyFilters())}
              >
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "observation" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <input
              type="text"
              placeholder="Digite uma observação…"
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={filters.observation || ""}
              onChange={(e) => setFilters((f) => ({ ...f, observation: e.target.value }))}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={() => removeChip("observation")}>
                Remover
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => (setOpenEditor(null), applyFilters())}
              >
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "tx_type" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => setFilters((f) => ({ ...f, tx_type: "credit" }))}>
                Receita
              </Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => setFilters((f) => ({ ...f, tx_type: "debit" }))}>
                Despesa
              </Button>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => removeChip("tx_type")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => (setOpenEditor(null), applyFilters())}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "amount" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Mínimo (R$)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  placeholder="R$ 0,00"
                  value={filters.amount_min ? formatCurrency(filters.amount_min) : ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, amount_min: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    handleUtilitaryAmountKeyDown(
                      e,
                      filters.amount_min ?? "0",
                      (newVal: string) => setFilters((f) => ({ ...f, amount_min: newVal }))
                    )
                  }
                />
              </label>

              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Máximo (R$)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  placeholder="R$ 0,00"
                  value={filters.amount_max ? formatCurrency(filters.amount_max) : ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, amount_max: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    handleUtilitaryAmountKeyDown(
                      e,
                      filters.amount_max ?? "0",
                      (newVal: string) => setFilters((f) => ({ ...f, amount_max: newVal }))
                    )
                  }
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => removeChip("amount")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => (setOpenEditor(null), applyFilters())}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}
      </div>

      {/* ---------------------- CONFIG MODAL (only views) --------------------- */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
              <h3 className="text-[14px] font-semibold text-gray-800">Visualizações salvas</h3>
              <button
                className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                onClick={() => setConfigModalOpen(false)}
                aria-label="Fechar"
              >
                &times;
              </button>
            </header>

            <div>
              <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
                {scopedViews.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500">Nenhuma visualização salva.</div>
                )}
                {scopedViews.map((v) => {
                  const isRenaming = renamingId === v.id;
                  return (
                    <div key={v.id} className="px-3 py-2 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2">
                        {/* was: <input type="radio" … /> */}
                        <Checkbox
                          checked={!!v.is_default}
                          size="small"
                          onChange={() => toggleDefaultView(v)}
                        />
                        {isRenaming ? (
                          <input
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            value={renamingName}
                            onChange={(e) => setRenamingName(e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-gray-800">{v.name}</span>
                        )}
                        {v.is_default ? <span className="text-[11px] text-amber-600">Padrão</span> : null}
                      </label>

                      <div className="ml-auto flex items-center gap-2">
                        {isRenaming ? (
                          <>
                            <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={saveRenaming}>
                              Salvar nome
                            </Button>
                            <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={cancelRenaming}>
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => startRenaming(v)}>
                            Renomear
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-gray-50"
                          onClick={() => applyVisualization(v)}
                        >
                          Aplicar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="!text-red-600 !border-red-200 hover:!bg-red-50"
                          onClick={() => deleteView(v.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => setConfigModalOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------- SAVE MODAL ---------------------------- */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
              <h3 className="text-[14px] font-semibold text-gray-800">Salvar visualização</h3>
              <button
                className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                onClick={() => setSaveModalOpen(false)}
                aria-label="Fechar"
              >
                &times;
              </button>
            </header>

            <div className="space-y-4 text-xs text-gray-700">
              <label className="block space-y-1">
                <span>Nome</span>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Ex.: 'Pagamentos mês atual por projeto'"
                />
              </label>

              <label className="inline-flex items-center gap-2">
                <Checkbox checked={saveDefault} size="small" onChange={(e) => setSaveDefault(e.target.checked)} />
                <span>Definir como padrão</span>
              </label>

              <div className="space-y-2">
                <div className="font-semibold">Modo</div>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="save_mode"
                    checked={saveMode === "create"}
                    onChange={() => setSaveMode("create")}
                  />
                  <span>Criar nova visualização</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="save_mode"
                    checked={saveMode === "overwrite"}
                    onChange={() => setSaveMode("overwrite")}
                  />
                  <span>Sobrescrever existente</span>
                </label>

                {saveMode === "overwrite" && (
                  <label className="block space-y-1 mt-2">
                    <span>Escolha a visualização</span>
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      value={overwriteId ?? ""}
                      onChange={(e) => setOverwriteId(e.target.value || null)}
                    >
                      <option value="">— selecione —</option>
                      {scopedViews.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.is_default ? "⭐" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={closeSaveModal}>
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                  onClick={handleSaveVisualization}
                  disabled={!saveName.trim() || (saveMode === "overwrite" && !overwriteId)}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------- Subcomponents ------------------------------ */

const QuickButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    {...props}
    className={`text-[11px] border border-gray-300 rounded px-2 py-[3px] bg-white hover:bg-gray-50 ${className}`}
  />
);

const Chip: React.FC<{
  icon?: "calendar" | "bank" | "accounts" | "note";
  label: string;
  onClick(): void;
  onRemove(): void;
}> = ({ icon, label, onClick, onRemove }) => {
  const Icon = () => {
    if (icon === "calendar") return <span className="text-[12px]" aria-hidden>📅</span>;
    if (icon === "bank") return <span className="text-[12px]" aria-hidden>🏦</span>;
    if (icon === "accounts") return <span className="text-[12px]" aria-hidden>🧾</span>;
    if (icon === "note") return <span className="text-[12px]" aria-hidden>📝</span>;
    return null;
  };

  return (
    <div
      className="shrink-0 inline-flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2 h-6 bg-white cursor-pointer"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <Icon />
      <span className="truncate max-w-[220px]">{label}</span>
      <button
        aria-label="remover filtro"
        className="ml-1 rounded px-1 text-gray-500 hover:bg-gray-200"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </div>
  );
};

const MenuItem: React.FC<{ label: string; onClick(): void }> = ({ label, onClick }) => (
  <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50" onClick={onClick}>
    {label}
  </button>
);

const Popover: React.FC<{ children: React.ReactNode; onClose(): void; className?: string }> = ({ children, onClose, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose);
  return (
    <div className="absolute z-[99999] mt-2">
      <div
        ref={ref}
        className={`rounded-md border border-gray-300 bg-white p-3 ${className || ""}`}
      >
        {children}
      </div>
    </div>
  );
};

export default FilterBar;
