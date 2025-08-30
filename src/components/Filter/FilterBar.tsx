/* --------------------------------------------------------------------------
 * File: src/components/FilterBar.tsx
 * Style: Minimalist and compact. No shadows (except in the "Adicionar filtro +" menu).
 * Chips + Search + Filters menu + "Limpar filtros" + "Aplicar".
 * -------------------------------------------------------------------------- */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BankAccount } from "@/models/enterprise_structure/domain/Bank";
import { LedgerAccount } from "src/models/enterprise_structure";
import { SelectDropdown } from "@/components/SelectDropdown";
import { useBanks } from "@/hooks/useBanks";
import { EntryFilters } from "src/models/entries/domain";
import { api } from "src/api/requests";
import Button from "../Button";

/* ------------------------------ Types & helpers ----------------------------- */
type ChipKey = "date" | "banks" | "accounts" | "observation";

interface FilterBarProps {
  onApply: (filters: EntryFilters) => void;
  initial?: EntryFilters;
}

function useOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

/* -------------------------------- Component -------------------------------- */
const FilterBar: React.FC<FilterBarProps> = ({ onApply, initial }) => {
  const { banks } = useBanks();
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);

  const [filters, setFilters] = useState<EntryFilters>({
    start_date: initial?.start_date || "",
    end_date: initial?.end_date || "",
    description: initial?.description || "",
    observation: initial?.observation || "",
    general_ledger_account_id: initial?.general_ledger_account_id || [],
    bank_id: initial?.bank_id || [],
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [openEditor, setOpenEditor] = useState<ChipKey | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useOutside(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    const fetchLedgerAccounts = async () => {
      try {
        const res = await api.getAllLedgerAccounts();
        setLedgerAccounts(res.data.general_ledger_accounts);
      } catch {
        setLedgerAccounts([]);
      }
    };
    fetchLedgerAccounts();
  }, []);

  const selectedBanks = useMemo(
    () => banks.filter(b => (filters.bank_id ?? []).includes(b.id)),
    [banks, filters.bank_id]
  );

  const selectedAccounts = useMemo(
    () => ledgerAccounts.filter(a => filters.general_ledger_account_id?.includes(a.id)),
    [ledgerAccounts, filters.general_ledger_account_id]
  );

  function applyFilters() {
    onApply(filters);
  }

  function clearAll() {
    const cleared: EntryFilters = {
      start_date: "",
      end_date: "",
      description: "",
      observation: "",
      general_ledger_account_id: [],
      bank_id: [],
    };
    setFilters(cleared);
    onApply(cleared);
  }

  function removeChip(k: ChipKey) {
    if (k === "date") setFilters(f => ({ ...f, start_date: "", end_date: "" }));
    if (k === "banks") setFilters(f => ({ ...f, bank_id: [] }));
    if (k === "accounts") setFilters(f => ({ ...f, general_ledger_account_id: [] }));
    if (k === "observation") setFilters(f => ({ ...f, observation: "" }));
  }

  const hasActive =
    !!filters.start_date ||
    !!filters.end_date ||
    (filters.bank_id?.length ?? 0) > 0 ||
    (filters.general_ledger_account_id?.length ?? 0) > 0 ||
    !!filters.observation ||
    !!filters.description;

  /* ---------------------------------- Render -------------------------------- */
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {/* Search field + chips */}
        <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-2 h-8 whitespace-nowrap overflow-x-auto">
          {(filters.start_date || filters.end_date) && (
            <Chip
              icon="calendar"
              label={`Datas  ${filters.start_date || "mm/dd/yyyy"} - ${filters.end_date || "mm/dd/yyyy"}`}
              onClick={() => setOpenEditor("date")}
              onRemove={() => removeChip("date")}
            />
          )}

          {(filters.bank_id?.length ?? 0) > 0 && (
            <Chip
              icon="bank"
              label={`Banco  ${selectedBanks.slice(0, 2).map(b => b.institution).join(", ")}${(selectedBanks.length > 2) ? ` +${selectedBanks.length - 2}` : ""}`}
              onClick={() => setOpenEditor("banks")}
              onRemove={() => removeChip("banks")}
            />
          )}

          {(filters.general_ledger_account_id?.length ?? 0) > 0 && (
            <Chip
              icon="accounts"
              label={`Conta contábil  ${selectedAccounts.slice(0, 2).map(a => a.general_ledger_account).join(", ")}${(selectedAccounts.length > 2) ? ` +${selectedAccounts.length - 2}` : ""}`}
              onClick={() => setOpenEditor("accounts")}
              onRemove={() => removeChip("accounts")}
            />
          )}

          {!!filters.observation && (
            <Chip
              icon="note"
              label={`Observação  ${filters.observation}`}
              onClick={() => setOpenEditor("observation")}
              onRemove={() => removeChip("observation")}
            />
          )}

          <input
            className="flex-[1_1_30%] min-w-[160px] h-6 bg-transparent outline-none text-xs placeholder-gray-400"
            placeholder="Buscar ou filtrar…"
            value={filters.description || ""}
            onChange={(e) => setFilters(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* Dummy buttons to keep layout similar to references */}
        <div className="hidden sm:block">
          <Button variant="outline" size="sm" className="text-sm" aria-label="Configurações">
            ⚙️
          </Button>
        </div>
        <Button variant="outline" size="sm" className="font-semibold">Salvar visualização</Button>
        <Button variant="outline" size="sm" className="font-semibold">Agrupar por</Button>
      </div>

      {/* Second row: filter actions */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {/* Add filter + menu */}
        <div className="relative" ref={menuRef}>
          <Button variant="outline" size="sm" className="font-semibold" onClick={() => setMenuOpen(v => !v)}>
            Adicionar filtro +
          </Button>

          {menuOpen && (
            <div className="absolute left-0 top-full z-20 w-72 rounded-md border border-gray-300 bg-white p-2 shadow-lg">
              <MenuItem label="Período" onClick={() => { setOpenEditor("date"); setMenuOpen(false); }} />
              <MenuItem label="Banco" onClick={() => { setOpenEditor("banks"); setMenuOpen(false); }} />
              <MenuItem label="Conta contábil" onClick={() => { setOpenEditor("accounts"); setMenuOpen(false); }} />
              <MenuItem label="Observação" onClick={() => { setOpenEditor("observation"); setMenuOpen(false); }} />
            </div>
          )}
        </div>

        {/* Clear filters */}
        <button
          className={`text-xs font-semibold text-red-600 ${hasActive ? "" : "opacity-40 cursor-not-allowed"}`}
          onClick={() => hasActive && clearAll()}
        >
          Limpar filtros
        </button>

        {/* Apply */}
        <div className="ml-auto sm:ml-0">
          <Button variant="outline" size="sm" className="font-semibold" onClick={applyFilters}>
            Aplicar
          </Button>
        </div>
      </div>

      {/* Editors: popovers without shadow (border only) */}
      <div className="relative">
        {openEditor === "date" && (
          <Popover onClose={() => setOpenEditor(null)}>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Início</span>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={filters.start_date || ""}
                  onChange={(e) => setFilters(f => ({ ...f, start_date: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Fim</span>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={filters.end_date || ""}
                  onChange={(e) => setFilters(f => ({ ...f, end_date: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => removeChip("date")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setOpenEditor(null); applyFilters(); }}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "banks" && (
          <Popover onClose={() => setOpenEditor(null)}>
            <SelectDropdown<BankAccount>
              label="Bancos"
              items={banks}
              selected={selectedBanks}
              onChange={(list) => setFilters(f => ({ ...f, bank_id: list.map(x => x.id) }))}
              getItemKey={(item) => item.id}
              getItemLabel={(item) => item.institution}
              buttonLabel="Selecionar bancos"
              customStyles={{ maxHeight: "240px" }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold" onClick={() => removeChip("banks")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" className="font-semibold" onClick={() => { setOpenEditor(null); applyFilters(); }}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "accounts" && (
          <Popover onClose={() => setOpenEditor(null)}>
            <SelectDropdown<LedgerAccount>
              label="Contas contábeis"
              items={ledgerAccounts}
              selected={selectedAccounts}
              onChange={(list) => setFilters(f => ({ ...f, general_ledger_account_id: list.map(x => Number(x.id)) }))}
              getItemKey={(item) => item.id}
              getItemLabel={(item) => item.general_ledger_account}
              buttonLabel="Selecionar contas"
              customStyles={{ maxHeight: "240px" }}
              groupBy={(item) => item.subgroup}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold" onClick={() => removeChip("accounts")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" className="font-semibold" onClick={() => { setOpenEditor(null); applyFilters(); }}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "observation" && (
          <Popover onClose={() => setOpenEditor(null)}>
            <input
              type="text"
              placeholder="Digite uma observação…"
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={filters.observation || ""}
              onChange={(e) => setFilters(f => ({ ...f, observation: e.target.value }))}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold" onClick={() => removeChip("observation")}>
                Remover
              </Button>
              <Button variant="outline" size="sm" className="font-semibold" onClick={() => { setOpenEditor(null); applyFilters(); }}>
                Aplicar
              </Button>
            </div>
          </Popover>
        )}
      </div>
    </div>
  );
};

/* ------------------------------- Subcomponents ------------------------------ */

const Chip: React.FC<{
  icon?: "calendar" | "bank" | "accounts" | "note";
  label: string;
  onClick(): void;
  onRemove(): void;
}> = ({ icon, label, onClick, onRemove }) => {
  const Icon = () => {
    if (icon === "calendar")
      return <span className="text-[12px]" aria-hidden>📅</span>;
    if (icon === "bank")
      return <span className="text-[12px]" aria-hidden>🏦</span>;
    if (icon === "accounts")
      return <span className="text-[12px]" aria-hidden>🧾</span>;
    if (icon === "note")
      return <span className="text-[12px]" aria-hidden>📝</span>;
    return null;
  };
  return (
    <div
      className="shrink-0 inline-flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2 h-6 bg-white cursor-pointer"
      onClick={onClick}
    >
      <Icon />
      <span className="truncate max-w-[220px]">{label}</span>
      <button
        aria-label="remover filtro"
        className="ml-1 rounded px-1 text-gray-500 hover:bg-gray-200"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        ×
      </button>
    </div>
  );
};

const MenuItem: React.FC<{ label: string; onClick(): void }> = ({ label, onClick }) => (
  <button
    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50"
    onClick={onClick}
  >
    {label}
  </button>
);

const Popover: React.FC<{ children: React.ReactNode; onClose(): void }> = ({ children, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose);
  return (
    <div className="absolute z-20 mt-2 w-full max-w-sm">
      <div ref={ref} className="rounded-md border border-gray-300 bg-white p-3 shadow-lg">
        {children}
      </div>
    </div>
  );
};

export default FilterBar;
