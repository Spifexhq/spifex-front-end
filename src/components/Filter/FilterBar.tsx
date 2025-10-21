/* --------------------------------------------------------------------------
 * File: src/components/Filter/FilterBar.tsx
 * Style: Minimalist / compact. No shadows (except in "Adicionar filtro +" menu).
 * Adds: Save visualization, Load, Config (columns/sort), extra filters. (No Group By)
 * -------------------------------------------------------------------------- */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BankAccount } from "@/models/enterprise_structure/domain/Bank";
import type { GLAccount } from "src/models/enterprise_structure/domain/GLAccount";
import { SelectDropdown } from "@/components/SelectDropdown";
import { useBanks } from "@/hooks/useBanks";
import type { EntryFilters } from "src/models/entries/domain";
import {
  ChipKey,
  ColumnKey,
  SortDir,
  ConfigState,
  LocalFilters,
  Visualization,
} from "src/models/entries/domain";
import { api } from "src/api/requests";
import Button from "../Button";
import Checkbox from "../Checkbox";

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

interface FilterBarProps {
  onApply: (payload: { filters: EntryFilters; config?: ConfigState }) => void;
  initial?: EntryFilters;
  bankActive?: boolean;
}

/* -------------------------------- Component -------------------------------- */
const FilterBar: React.FC<FilterBarProps> = ({ onApply, initial, bankActive }) => {
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
  }));

  /* Table Config */
  const [config, setConfig] = useState<ConfigState>({
    columns: ["due_date", "description", "gl_account", "project", "entity", "amount"],
    sortBy: "due_date",
    sortDir: "asc",
  });

  /* Saved visualizations */
  const [views, setViews] = useState<Visualization[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDefault, setViewDefault] = useState(false);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);

  /* Menus/Popovers */
  const [menuOpen, setMenuOpen] = useState(false);
  const [openEditor, setOpenEditor] = useState<ChipKey | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutside(menuRef, () => setMenuOpen(false));

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
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.getEntryViews();
        const list = Array.isArray(data)
          ? data
          : (data as unknown as { results?: Visualization[] })?.results ?? [];
        setViews(list as Visualization[]);
      } catch (err) {
        console.error("Failed to load saved views", err);
      }
    })();
  }, []);

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
      amount_min: f.amount_min ? Math.round(parseFloat(f.amount_min) * 100) : undefined,
      amount_max: f.amount_max ? Math.round(parseFloat(f.amount_max) * 100) : undefined,
    } as EntryFilters;
  }

  function applyFilters() {
    onApply({
      filters: toEntryFilters(filters),
      config,
    });
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
    };
    setFilters(cleared);
    onApply({ filters: toEntryFilters(cleared), config });
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

  /* ------------------------------ Saved Views ------------------------------ */
  async function saveVisualization() {
    if (!viewName.trim()) return;
    const payload = {
      name: viewName.trim(),
      is_default: viewDefault,
      // group_by intentionally removed (backend may accept default)
      config,
      filters,
    };

    const existing = views.find((v) => v.name.toLowerCase() === payload.name.toLowerCase());
    try {
      if (existing) await api.editEntryView(existing.id, payload);
      else await api.addEntryView(payload);

      const { data } = await api.getEntryViews();
      const list = Array.isArray(data)
        ? data
        : (data as unknown as { results?: Visualization[] })?.results ?? [];
      setViews(list as Visualization[]);
      setSaveOpen(false);
      setViewName("");
      setViewDefault(false);
    } catch (err) {
      console.error("Failed to save visualization", err);
    }
  }

  function applyVisualization(v: Visualization) {
    setFilters(v.filters);
    setConfig(v.config);
    onApply({ filters: toEntryFilters(v.filters), config: v.config });
  }

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
              onClick={() => setOpenEditor("date")}
              onRemove={() => removeChip("date")}
            />
          )}
          {(filters.bank_id?.length ?? 0) > 0 && (
            <Chip
              icon="bank"
              label={`Banco  ${selectedBanks.slice(0, 2).map((b) => b.institution).join(", ")}${
                selectedBanks.length > 2 ? ` +${selectedBanks.length - 2}` : ""
              }`}
              onClick={() => setOpenEditor("banks")}
              onRemove={() => removeChip("banks")}
            />
          )}
          {(filters.gla_id?.length ?? 0) > 0 && (
            <Chip
              icon="accounts"
              label={`Conta contábil  ${selectedAccounts.slice(0, 2).map((a) => a.name).join(", ")}${
                selectedAccounts.length > 2 ? ` +${selectedAccounts.length - 2}` : ""
              }`}
              onClick={() => setOpenEditor("accounts")}
              onRemove={() => removeChip("accounts")}
            />
          )}
          {!!filters.tx_type && (
            <Chip
              icon="note"
              label={`Tipo ${filters.tx_type === "credit" ? "Receita" : "Despesa"}`}
              onClick={() => setOpenEditor("tx_type")}
              onRemove={() => removeChip("tx_type")}
            />
          )}
          {(filters.amount_min || filters.amount_max) && (
            <Chip
              icon="note"
              label={`Valor ${filters.amount_min ? `≥ ${filters.amount_min}` : ""} ${filters.amount_max ? `≤ ${filters.amount_max}` : ""}`}
              onClick={() => setOpenEditor("amount")}
              onRemove={() => removeChip("amount")}
            />
          )}
          {!!filters.observation && (
            <Chip icon="note" label={`Observação  ${filters.observation}`} onClick={() => setOpenEditor("observation")} onRemove={() => removeChip("observation")} />
          )}

          <input
            className="flex-[1_1_30%] min-w-[160px] h-6 bg-transparent outline-none text-xs placeholder-gray-400"
            placeholder="Buscar ou filtrar…"
            value={filters.description || ""}
            onChange={(e) => setFilters((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        {/* Config */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            aria-label="Configurações"
            onClick={() => setConfigOpen((v) => !v)}
            className={`text-sm bg-white hover:bg-gray-50 ${configOpen ? "!bg-white !border-gray-400" : ""}`}
          >
            ⚙️
          </Button>
          {configOpen && (
            <Popover onClose={() => setConfigOpen(false)}>
              <div className="text-xs text-gray-700 space-y-2">
                <div>
                  <div className="font-semibold mb-1">Colunas</div>
                  <ColumnsPicker value={config.columns} onChange={(cols) => setConfig((c) => ({ ...c, columns: cols }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="block">Ordenar por</span>
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      value={config.sortBy}
                      onChange={(e) => setConfig((c) => ({ ...c, sortBy: e.target.value as ColumnKey }))}
                    >
                      {["due_date","description","observation","gl_account","project","entity","amount","is_settled","installment_index"].map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="block">Direção</span>
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1"
                      value={config.sortDir}
                      onChange={(e) => setConfig((c) => ({ ...c, sortDir: e.target.value as SortDir }))}
                    >
                      <option value="asc">asc</option>
                      <option value="desc">desc</option>
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfigOpen(false)} className="bg-white hover:bg-gray-50">Fechar</Button>
                  <Button variant="outline" size="sm" onClick={applyFilters} className="bg-white hover:bg-gray-50">Aplicar</Button>
                </div>
              </div>
            </Popover>
          )}
        </div>

        {/* Save visualization */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${saveOpen ? "!bg-white !border-gray-400" : ""}`}
            onClick={() => setSaveOpen((v) => !v)}
          >
            Salvar visualização
          </Button>
          {saveOpen && (
            <Popover onClose={() => setSaveOpen(false)}>
              <div className="text-xs text-gray-700 space-y-2">
                <label className="block space-y-1">
                  <span>Nome</span>
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="Ex.: 'Pagamentos mês atual por projeto'"
                  />
                </label>
                <label className="inline-flex items-center gap-2">
                  <Checkbox checked={viewDefault} size="small" onChange={(e) => setViewDefault(e.target.checked)} />
                  <span>Definir como padrão</span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)} className="bg-white hover:bg-gray-50">Cancelar</Button>
                  <Button variant="outline" size="sm" onClick={saveVisualization} className="bg-white hover:bg-gray-50">Salvar</Button>
                </div>
              </div>
            </Popover>
          )}
        </div>

        {/* Load visualization */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${viewsMenuOpen ? "!bg-white !border-gray-400" : ""}`}
            onClick={() => setViewsMenuOpen((v) => !v)}
          >
            Visualizações
          </Button>
          {viewsMenuOpen && (
            <div className="absolute right-0 top-full z-[99999] w-72 rounded-md border border-gray-300 bg-white p-2 shadow-lg">
              {(views.length ? views : []).map((v) => (
                <MenuItem
                  key={v.id}
                  label={`${v.name}${(v).is_default ? " ⭐" : ""}`}
                  onClick={() => {
                    setViewsMenuOpen(false);
                    applyVisualization(v);
                  }}
                />
              ))}
              {views.length === 0 && <div className="text-xs text-gray-500 px-2 py-1">Nenhuma visualização salva</div>}
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
            <div
              className="absolute left-0 top-full z-[99999] w-72 rounded-md border border-gray-300 bg-white p-2 shadow-lg"
            >
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

        {/* Clear filters */}
        <button
          className={`text-xs font-semibold text-red-600 ${hasActive ? "" : "opacity-40 cursor-not-allowed"}`}
          onClick={() => hasActive && clearAll()}
        >
          Limpar filtros
        </button>

        {/* Apply */}
        <div className="ml-auto sm:ml-0">
          <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={applyFilters}>
            Aplicar
          </Button>
        </div>
      </div>

      {/* Editors (border-only, no shadow) */}
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
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => removeChip("date")}>Remover</Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => (setOpenEditor(null), applyFilters())}>Aplicar</Button>
            </div>
          </Popover>
        )}

        {openEditor === "banks" && (
          <Popover onClose={() => setOpenEditor(null)}>
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
              <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={() => removeChip("banks")}>Remover</Button>
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
          <Popover onClose={() => setOpenEditor(null)}>
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
              <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={() => removeChip("accounts")}>Remover</Button>
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
          <Popover onClose={() => setOpenEditor(null)}>
            <input
              type="text"
              placeholder="Digite uma observação…"
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={filters.observation || ""}
              onChange={(e) => setFilters((f) => ({ ...f, observation: e.target.value }))}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={() => removeChip("observation")}>Remover</Button>
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
          <Popover onClose={() => setOpenEditor(null)}>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => setFilters((f) => ({ ...f, tx_type: "credit" }))}>Receita</Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => setFilters((f) => ({ ...f, tx_type: "debit" }))}>Despesa</Button>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => removeChip("tx_type")}>Remover</Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => (setOpenEditor(null), applyFilters())}>Aplicar</Button>
            </div>
          </Popover>
        )}

        {openEditor === "amount" && (
          <Popover onClose={() => setOpenEditor(null)}>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Mínimo (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={filters.amount_min || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, amount_min: e.target.value }))}
                />
              </label>
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">Máximo (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                  value={filters.amount_max || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, amount_max: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => removeChip("amount")}>Remover</Button>
              <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={() => (setOpenEditor(null), applyFilters())}>Aplicar</Button>
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
    if (icon === "calendar") return <span className="text-[12px]" aria-hidden>📅</span>;
    if (icon === "bank") return <span className="text-[12px]" aria-hidden>🏦</span>;
    if (icon === "accounts") return <span className="text-[12px]" aria-hidden>🧾</span>;
    if (icon === "note") return <span className="text-[12px]" aria-hidden>📝</span>;
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

const ColumnsPicker: React.FC<{
  value: ColumnKey[];
  onChange(v: ColumnKey[]): void;
}> = ({ value, onChange }) => {
  const all: ColumnKey[] = ["due_date","description","observation","gl_account","project","entity","amount","is_settled","installment_index"];
  const toggle = (k: ColumnKey) => {
    if (value.includes(k)) onChange(value.filter((x) => x !== k));
    else onChange([...value, k]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((k) => (
        <label key={k} className="inline-flex items-center gap-1 text-xs">
          <Checkbox checked={value.includes(k)} size="small" onChange={() => toggle(k)} />
          <span>{k}</span>
        </label>
      ))}
    </div>
  );
};

const MenuItem: React.FC<{ label: string; onClick(): void }> = ({ label, onClick }) => (
  <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50" onClick={onClick}>
    {label}
  </button>
);

const Popover: React.FC<{ children: React.ReactNode; onClose(): void }> = ({ children, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose);
  return (
    <div className="absolute z-[99999] mt-2">
      <div ref={ref} className="rounded-md border border-gray-300 bg-white p-3">
        {children}
      </div>
    </div>
  );
};

export default FilterBar;
