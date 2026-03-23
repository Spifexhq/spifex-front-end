/* -------------------------------------------------------------------------- */
/* File: src/components/StatementImportWizard/StatementImportWizard.tsx       */
/* -------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { api } from "@/api/requests";
import type {
  Statement,
  StatementImportLookups,
  StatementImportRow,
  StatementImportRowsResponse,
  StatementImportSession,
  LatestStatementAnalysisResponse,
  PrepareStatementImportResponse,
  AcceptConfidentStatementImportRowsResponse,
  CommitStatementImportSessionResponse,
  FieldSuggestionOption,
  RowCandidate,
} from "@/models/settings/statements";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

type BankOption = { label: string; value: string };
type SelectItem = { label: string; value: string };
type EntityOption = SelectItem & { entity_type?: string };

type Props = {
  statement?: Statement | null;
  initialStatementId?: string | null;
  bankOptions?: BankOption[];
  onClose?: () => void;
  onCommitted?: (payload: {
    createdCount: number;
    entryIds: string[];
    statementId?: string | null;
  }) => void;
  onStatementCreated?: (statement: Statement) => void;
  registerBeforeClose?: (handler: null | (() => Promise<boolean>)) => void;
};

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type RowDraft = {
  due_date: string;
  amount: string;
  description: string;
  observation: string;
  notes: string;
  tx_type: string;
  document_type: string;
  entity_id: string;
  entity_type: string;
  ledger_account_id: string;
  project_id: string;
  interval_months: string;
  weekend_action: string;
  status: string;
};

type InfoHintProps = {
  text: string;
};

const MAX_VISIBLE_CANDIDATES = 4;

const InfoHint: React.FC<InfoHintProps> = ({ text }) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span className="inline-flex items-center">
      <span
        className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-semibold leading-none text-gray-500"
        aria-label={text}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({ x: rect.left + rect.width / 2, y: rect.top });
        }}
        onMouseLeave={() => setPos(null)}
      >
        i
      </span>

      {pos &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[9999] w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2 py-2 text-[11px] font-medium leading-snug text-white shadow-lg"
            style={{ left: pos.x, top: pos.y - 8 }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
};

const rowStatusOptions: SelectItem[] = [
  { label: "Pending", value: "pending" },
  { label: "Ready", value: "ready" },
  { label: "Excluded", value: "excluded" },
];

const txTypeOptions: SelectItem[] = [
  { label: "Credit", value: "1" },
  { label: "Debit", value: "-1" },
];

const intervalOptions: SelectItem[] = [
  { label: "Weekly", value: "0" },
  { label: "Monthly", value: "1" },
  { label: "Bimonthly", value: "2" },
  { label: "Quarterly", value: "3" },
  { label: "Semiannual", value: "6" },
  { label: "Annual", value: "12" },
];

const weekendOptions: SelectItem[] = [
  { label: "Keep", value: "0" },
  { label: "Postpone", value: "1" },
  { label: "Anticipate", value: "-1" },
];

const entityTypeOptions: SelectItem[] = [
  { label: "Client", value: "client" },
  { label: "Supplier", value: "supplier" },
  { label: "Employee", value: "employee" },
  { label: "Contractor", value: "contractor" },
  { label: "Partner", value: "partner" },
  { label: "Prospect", value: "prospect" },
  { label: "Affiliate", value: "affiliate" },
  { label: "Advisor", value: "advisor" },
  { label: "Investor", value: "investor" },
  { label: "Other", value: "other" },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      error.message ||
      fallback
    );
  }
  return fallback;
}

function formatMoney(minor?: number | null) {
  if (minor == null || Number.isNaN(minor)) return "-";
  return (minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value?: number | null) {
  return `${Math.round((value || 0) * 100)}%`;
}

function normalizeDescriptionForFamily(value?: string | null) {
  return (value || "")
    .replace(/\bparcela\s*\d{1,3}\s*(?:de|\/)\s*\d{1,3}\b/gi, " ")
    .replace(/\b\d{1,3}\s*(?:\/|de)\s*\d{1,3}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeText(value?: string | null) {
  return (value || "").trim();
}

function sortRows(rows: StatementImportRow[]) {
  return [...rows].sort((a, b) => a.line_index - b.line_index);
}

function normalizeRow(row: StatementImportRow): StatementImportRow {
  return {
    ...row,
    resolved_description:
      row.resolved_description ?? row.final_description ?? row.source_description ?? "",
    resolved_observation: row.resolved_observation ?? row.final_observation ?? "",
    resolved_notes: row.resolved_notes ?? row.final_notes ?? "",
    resolved_due_date:
      row.resolved_due_date ?? row.final_due_date ?? row.source_date ?? null,
    resolved_amount_minor:
      row.resolved_amount_minor ??
      row.final_amount_minor ??
      row.source_amount_minor ??
      null,
    resolved_tx_type:
      row.resolved_tx_type ?? row.final_tx_type ?? row.source_tx_type ?? null,
    resolved_entity_type: row.resolved_entity_type ?? row.entity_type ?? "",
    resolved_departments: row.resolved_departments ?? row.departments ?? [],
    resolved_items: row.resolved_items ?? row.items ?? [],
    resolved_installment_count:
      row.resolved_installment_count ?? row.installment_count ?? 1,
    resolved_interval_months:
      row.resolved_interval_months ?? row.interval_months ?? 1,
    resolved_weekend_action:
      row.resolved_weekend_action ?? row.weekend_action ?? 0,
    candidate_payload:
      row.candidate_payload ?? { row_candidates: [], field_suggestions: {} },
  };
}

function buildCandidateKey(candidate: RowCandidate, index: number) {
  return [
    index,
    candidate.source || "",
    candidate.kind || "",
    candidate.document_type || "",
    candidate.entity_id || "",
    candidate.ledger_account_id || "",
    candidate.project_id || "",
    candidate.description || "",
  ].join("|");
}

function createDraftFromRow(row: StatementImportRow): RowDraft {
  return {
    due_date: row.resolved_due_date || "",
    amount:
      row.resolved_amount_minor != null
        ? String(row.resolved_amount_minor / 100)
        : "",
    description: row.resolved_description || "",
    observation: row.resolved_observation || "",
    notes: row.resolved_notes || "",
    tx_type:
      row.resolved_tx_type != null ? String(row.resolved_tx_type) : "",
    document_type: row.document_type?.id || "",
    entity_id: row.entity?.id || "",
    entity_type: row.resolved_entity_type || "",
    ledger_account_id: row.ledger_account?.id || "",
    project_id: row.project?.id || "",
    interval_months: String(row.resolved_interval_months ?? 1),
    weekend_action: String(row.resolved_weekend_action ?? 0),
    status: row.status || "pending",
  };
}

function buildPatchPayloadFromDraft(draft: RowDraft): Record<string, unknown> {
  const normalizedAmount = String(draft.amount || "").replace(",", ".").trim();
  const parsedAmount = Number(normalizedAmount);

  return {
    due_date: draft.due_date || null,
    amount_minor: Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) : null,
    description: normalizeText(draft.description),
    observation: normalizeText(draft.observation),
    notes: draft.notes || "",
    tx_type: draft.tx_type ? Number(draft.tx_type) : null,
    document_type: draft.document_type || null,
    entity_id: draft.entity_id || null,
    entity_type: draft.entity_type || "",
    ledger_account_id: draft.ledger_account_id || null,
    project_id: draft.project_id || null,
    interval_months: Number(draft.interval_months || 1),
    weekend_action: Number(draft.weekend_action || 0),
    status: draft.status || "pending",
  };
}

function areDraftsEqual(a: RowDraft, b: RowDraft) {
  return JSON.stringify(buildPatchPayloadFromDraft(a)) === JSON.stringify(buildPatchPayloadFromDraft(b));
}

function isDraftAmountValid(draft?: RowDraft | null) {
  if (!draft) return false;
  const normalized = String(draft.amount || "").replace(",", ".").trim();
  if (!normalized) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed);
}

function isDraftLedgerValid(draft?: RowDraft | null) {
  return !!String(draft?.ledger_account_id || "").trim();
}

function getEffectiveDraft(
  row: StatementImportRow,
  draftsByRowId: Record<string, RowDraft>
) {
  return draftsByRowId[row.id] || createDraftFromRow(row);
}

function getRowMandatoryMissingLabel(draft?: RowDraft | null) {
  const missingAmount = !isDraftAmountValid(draft);
  const missingLedger = !isDraftLedgerValid(draft);

  if (missingAmount && missingLedger) return "Missing amount and ledger account";
  if (missingAmount) return "Missing amount";
  if (missingLedger) return "Missing ledger account";
  return "";
}

function hasDraggedFiles(event: React.DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

const StatementImportWizard: React.FC<Props> = ({
  statement,
  initialStatementId,
  bankOptions = [],
  onCommitted,
  onStatementCreated,
  registerBeforeClose,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const dragDepthRef = React.useRef(0);

  const [snack, setSnack] = useState<Snack>(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [, setStatementItem] = useState<Statement | null>(statement || null);
  const [statementId, setStatementId] = useState<string | null>(
    statement?.id ?? initialStatementId ?? null
  );

  const [session, setSession] = useState<StatementImportSession | null>(null);
  const [lookups, setLookups] = useState<StatementImportLookups | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [dismissedCandidatesByRow, setDismissedCandidatesByRow] = useState<
    Record<string, string[]>
  >({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedBankId, setSelectedBankId] = useState<string>(
    statement?.bank_account_id || ""
  );
  const [draftsByRowId, setDraftsByRowId] = useState<Record<string, RowDraft>>({});
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  const hasActiveReview = !!session || !!statement?.import_session_id || !!statementId;

  const selectedRow = useMemo(
    () => session?.rows.find((row) => row.id === selectedRowId) || null,
    [session, selectedRowId]
  );

  const selectedDraft = useMemo(() => {
    if (!selectedRow) return null;
    return draftsByRowId[selectedRow.id] || createDraftFromRow(selectedRow);
  }, [draftsByRowId, selectedRow]);

  const rows = useMemo(() => {
    const base = sortRows(session?.rows || []);
    return base.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const draft = draftsByRowId[row.id];
        const effectiveDescription =
          draft?.description || row.resolved_description || row.source_description || "";
        return (
          row.source_description.toLowerCase().includes(q) ||
          effectiveDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [draftsByRowId, session, search, statusFilter]);

  const replaceRows = useCallback((nextRows: StatementImportRow[]) => {
    const normalizedRows = nextRows.map(normalizeRow);

    setSession((prev) => {
      if (!prev) return prev;

      const byId = new Map(normalizedRows.map((row) => [row.id, row]));
      const merged = prev.rows.map((row) => byId.get(row.id) || row);

      return {
        ...prev,
        rows: merged,
        summary: {
          ...prev.summary,
          total_rows: merged.length,
          ready_rows: merged.filter((r) => r.status === "ready").length,
          pending_rows: merged.filter((r) => r.status === "pending").length,
          excluded_rows: merged.filter((r) => r.status === "excluded").length,
          created_rows: merged.filter((r) => r.status === "created").length,
        },
      };
    });

    setDraftsByRowId((prev) => {
      const next = { ...prev };
      for (const row of normalizedRows) {
        next[row.id] = createDraftFromRow(row);
      }
      return next;
    });
  }, []);

  const loadSession = useCallback(
    async (sessionId: string) => {
      const [sessionRes, lookupRes, rowsRes] = await Promise.all([
        api.getStatementImportSession(sessionId),
        api.getStatementImportLookups(sessionId),
        api.getStatementImportRows(sessionId),
      ]);

      const sessionData = sessionRes as StatementImportSession;
      const lookupData = lookupRes as StatementImportLookups;
      const pagedRows = rowsRes as StatementImportRowsResponse;

      const normalizedRows = (pagedRows.results || sessionData.rows || []).map(normalizeRow);
      const hydratedSession: StatementImportSession = {
        ...sessionData,
        rows: normalizedRows,
      };

      setSession(hydratedSession);
      setLookups(lookupData);
      setDraftsByRowId((prev) => {
        const next = { ...prev };
        for (const row of normalizedRows) {
          if (!next[row.id]) {
            next[row.id] = createDraftFromRow(row);
          }
        }
        return next;
      });

      if (!selectedRowId && hydratedSession.rows.length > 0) {
        setSelectedRowId(
          hydratedSession.rows.find((row) => row.status !== "excluded")?.id ||
            hydratedSession.rows[0].id
        );
      }
    },
    [selectedRowId]
  );

  const pollAnalysis = useCallback(async (currentStatementId: string) => {
    setPolling(true);
    try {
      for (let i = 0; i < 40; i += 1) {
        const analysis = (await api.getLatestStatementAnalysis(
          currentStatementId
        )) as LatestStatementAnalysisResponse;

        if (analysis.status === "ready") return true;

        if (analysis.status === "failed") {
          setSnack({
            message: analysis.error_message || "Statement analysis failed.",
            severity: "error",
          });
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setSnack({
        message: "Analysis is taking longer than expected.",
        severity: "warning",
      });
      return false;
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, "Could not refresh analysis."),
        severity: "error",
      });
      return false;
    } finally {
      setPolling(false);
    }
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!selectedBankId) {
        setSnack({
          message: "Select a bank account before uploading.",
          severity: "warning",
        });
        return;
      }

      setUploadBusy(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("bank_account_id", selectedBankId);

        const created = (await api.uploadStatement(form)) as Statement;
        setStatementItem(created);
        setStatementId(created.id);
        onStatementCreated?.(created);

        await api.triggerStatementAnalysis(created.id);
        const ready = await pollAnalysis(created.id);
        if (!ready) return;

        const prepared = (await api.prepareStatementImport(created.id, {
          bank_account_id: selectedBankId,
          force_rebuild: true,
        })) as PrepareStatementImportResponse;

        await loadSession(prepared.session_id);
      } catch (err) {
        setSnack({
          message: getErrorMessage(err, "Could not upload statement."),
          severity: "error",
        });
      } finally {
        setUploadBusy(false);
      }
    },
    [selectedBankId, onStatementCreated, pollAnalysis, loadSession]
  );

  const getFamilyRows = useCallback(
    (referenceRow: StatementImportRow) => {
      if (!session) return [];
      return session.rows.filter((row) => {
        const sameDescription =
          normalizeDescriptionForFamily(row.source_description) ===
          normalizeDescriptionForFamily(referenceRow.source_description);
        return sameDescription;
      });
    },
    [session]
  );

  const updateDraft = useCallback((rowId: string, updater: (prev: RowDraft) => RowDraft) => {
    setDraftsByRowId((prev) => {
      const currentRow = session?.rows.find((row) => row.id === rowId) || selectedRow;
      if (!currentRow) return prev;
      const currentDraft = prev[rowId] || createDraftFromRow(currentRow);
      return {
        ...prev,
        [rowId]: updater(currentDraft),
      };
    });
  }, [selectedRow, session]);

  const applyDraftToFamilyLocally = useCallback(
    (referenceRow: StatementImportRow, nextDraft: RowDraft) => {
      const family = getFamilyRows(referenceRow);
      setDraftsByRowId((prev) => {
        const next = { ...prev };
        for (const row of family) {
          const currentDraft = next[row.id] || createDraftFromRow(row);
          next[row.id] = {
            ...currentDraft,
            description: nextDraft.description,
            observation: nextDraft.observation,
            notes: nextDraft.notes,
            tx_type: nextDraft.tx_type,
            document_type: nextDraft.document_type,
            entity_id: nextDraft.entity_id,
            entity_type: nextDraft.entity_type,
            ledger_account_id: nextDraft.ledger_account_id,
            project_id: nextDraft.project_id,
            interval_months: nextDraft.interval_months,
            weekend_action: nextDraft.weekend_action,
            status: nextDraft.status,
          };
        }
        return next;
      });
    },
    [getFamilyRows]
  );

  const persistRowDraft = useCallback(
    async (row: StatementImportRow, draft: RowDraft) => {
      const payload = buildPatchPayloadFromDraft(draft);
      const currentDraft = createDraftFromRow(row);

      if (areDraftsEqual(draft, currentDraft)) {
        return row;
      }

      setSavingField(row.id);
      try {
        const nextRow = (await api.updateStatementImportRow(
          session!.id,
          row.id,
          payload
        )) as StatementImportRow;
        replaceRows([nextRow]);
        return nextRow;
      } finally {
        setSavingField((current) => (current === row.id ? null : current));
      }
    },
    [replaceRows, session]
  );

  const persistFamilyDraft = useCallback(
    async (referenceRow: StatementImportRow, draft: RowDraft) => {
      if (!session) return;

      const familyRows = getFamilyRows(referenceRow);
      const payload = buildPatchPayloadFromDraft(draft);

      const changedRows = familyRows.filter((row) => {
        const currentDraft = createDraftFromRow(row);
        const comparableDraft: RowDraft = {
          ...currentDraft,
          description: draft.description,
          observation: draft.observation,
          notes: draft.notes,
          tx_type: draft.tx_type,
          document_type: draft.document_type,
          entity_id: draft.entity_id,
          entity_type: draft.entity_type,
          ledger_account_id: draft.ledger_account_id,
          project_id: draft.project_id,
          interval_months: draft.interval_months,
          weekend_action: draft.weekend_action,
          status: draft.status,
        };
        return !areDraftsEqual(comparableDraft, currentDraft);
      });

      if (!changedRows.length) return;

      setSavingField(referenceRow.id);
      try {
        if (changedRows.length <= 1 || !api.bulkUpdateStatementImportRows) {
          const nextRow = (await api.updateStatementImportRow(
            session.id,
            referenceRow.id,
            { ...payload, apply_to_installment_family: true }
          )) as StatementImportRow;
          replaceRows([nextRow]);
          return;
        }

        const response = (await api.bulkUpdateStatementImportRows(session.id, {
          ids: changedRows.map((row) => row.id),
          data: {
            ...payload,
            apply_to_installment_family: true,
          },
        })) as StatementImportRow[];
        replaceRows(response);
      } finally {
        setSavingField((current) => (current === referenceRow.id ? null : current));
      }
    },
    [getFamilyRows, replaceRows, session]
  );

  const persistAllDrafts = useCallback(async (): Promise<boolean> => {
    if (!session) return true;

    try {
      setBusy(true);
      const persistedFamilies = new Set<string>();

      for (const row of session.rows) {
        const draft = draftsByRowId[row.id];
        if (!draft) continue;

        const familyKey = normalizeDescriptionForFamily(row.source_description);
        const familyRows = getFamilyRows(row);
        const shouldPersistFamily = familyRows.length > 1;

        if (shouldPersistFamily) {
          if (persistedFamilies.has(familyKey)) continue;
          persistedFamilies.add(familyKey);
          await persistFamilyDraft(row, draft);
        } else {
          await persistRowDraft(row, draft);
        }
      }

      return true;
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, "Could not save review changes before closing."),
        severity: "error",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }, [draftsByRowId, getFamilyRows, persistFamilyDraft, persistRowDraft, session]);

  useEffect(() => {
    if (!registerBeforeClose) return;
    registerBeforeClose(persistAllDrafts);
    return () => {
      registerBeforeClose(null);
    };
  }, [persistAllDrafts, registerBeforeClose]);

  const handleApplyRowCandidate = useCallback(
    (candidate: RowCandidate) => {
      if (!selectedRow || !selectedDraft) return;

      const nextDraft: RowDraft = {
        ...selectedDraft,
        description: candidate.description || selectedRow.source_description,
        observation: candidate.observation || "",
        tx_type: String(
          candidate.tx_type ??
            selectedRow.candidate_payload?.ai_completion?.tx_type?.value ??
            selectedRow.resolved_tx_type ??
            selectedRow.source_tx_type ??
            ""
        ),
        document_type: candidate.document_type || "",
        entity_id: candidate.entity_id || "",
        entity_type: candidate.entity_type || "",
        ledger_account_id: candidate.ledger_account_id || "",
        project_id: candidate.project_id || "",
        interval_months: String(candidate.interval_months ?? 1),
        weekend_action: String(candidate.weekend_action ?? 0),
        status: "ready",
      };

      setDraftsByRowId((prev) => ({
        ...prev,
        [selectedRow.id]: nextDraft,
      }));
      applyDraftToFamilyLocally(selectedRow, nextDraft);
    },
    [applyDraftToFamilyLocally, selectedDraft, selectedRow]
  );

  const invalidRowsForCreation = useMemo(() => {
    if (!session) return [];

    return session.rows.filter((row) => {
      const draft = getEffectiveDraft(row, draftsByRowId);
      const localStatus = draft.status || row.status;

      if (localStatus === "excluded") return false;

      return !isDraftAmountValid(draft) || !isDraftLedgerValid(draft);
    });
  }, [draftsByRowId, session]);

  const canCreateEntries = useMemo(() => {
    if (!session) return false;
    if (busy || uploadBusy || polling) return false;

    const includedRows = session.rows.filter((row) => {
      const draft = getEffectiveDraft(row, draftsByRowId);
      return (draft.status || row.status) !== "excluded";
    });

    if (!includedRows.length) return false;
    return invalidRowsForCreation.length === 0;
  }, [busy, draftsByRowId, invalidRowsForCreation.length, polling, session, uploadBusy]);

  const createEntriesHint = useMemo(() => {
    if (!session) {
      return "Upload a statement and review the rows first.";
    }
    if (!session.rows.length) {
      return "There are no rows available for creation.";
    }
    if (!canCreateEntries) {
      return "All non-excluded rows must have amount and ledger account before creating entries.";
    }
    return "Saves all local edits first, then creates the final cashflow entries.";
  }, [canCreateEntries, session]);

  const handleCommit = useCallback(async () => {
    if (!session) return;

    if (!canCreateEntries) {
      setSnack({
        message: "Mandatory fields missing.",
        severity: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const persistedFamilies = new Set<string>();

      for (const row of session.rows) {
        const draft = draftsByRowId[row.id];
        if (!draft) continue;

        const familyKey = normalizeDescriptionForFamily(row.source_description);
        const familyRows = getFamilyRows(row);
        const shouldPersistFamily = familyRows.length > 1;

        if (shouldPersistFamily) {
          if (persistedFamilies.has(familyKey)) continue;
          persistedFamilies.add(familyKey);
          await persistFamilyDraft(row, draft);
        } else {
          await persistRowDraft(row, draft);
        }
      }

      const result = (await api.commitStatementImportSession(
        session.id
      )) as CommitStatementImportSessionResponse;

      await loadSession(session.id);

      setSnack({
        message: `${result.created_count} cashflow entr${
          result.created_count === 1 ? "y" : "ies"
        } created.`,
        severity: "success",
      });

      onCommitted?.({
        createdCount: result.created_count,
        entryIds: result.entry_ids,
        statementId,
      });
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, "Could not commit import."),
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [
    canCreateEntries,
    draftsByRowId,
    getFamilyRows,
    loadSession,
    onCommitted,
    persistFamilyDraft,
    persistRowDraft,
    session,
    statementId,
  ]);

  const handleAcceptConfident = useCallback(async () => {
    if (!session) return;

    setBusy(true);
    try {
      const pendingRows = session.rows.filter((row) => {
        const draft = draftsByRowId[row.id];
        if (!draft) return false;
        return !areDraftsEqual(draft, createDraftFromRow(row));
      });

      for (const row of pendingRows) {
        const draft = draftsByRowId[row.id];
        if (draft) {
          await persistRowDraft(row, draft);
        }
      }

      const result = (await api.acceptConfidentStatementImportRows(
        session.id
      )) as AcceptConfidentStatementImportRowsResponse;

      await loadSession(session.id);

      setSnack({
        message: `${result.accepted} row(s) moved to ready.`,
        severity: "success",
      });
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, "Could not accept confident rows."),
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [draftsByRowId, loadSession, persistRowDraft, session]);

  const resetDragState = useCallback(() => {
    dragDepthRef.current = 0;
    setDragActive(false);
  }, []);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current += 1;
      setDragActive(true);
    },
    []
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = selectedBankId ? "copy" : "none";
      setDragActive(true);
    },
    [selectedBankId]
  );

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      resetDragState();

      if (hasActiveReview) {
        setSnack({
          message: "Finish or close the current review before uploading another statement.",
          severity: "warning",
        });
        return;
      }

      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await handleUpload(file);
    },
    [handleUpload, hasActiveReview, resetDragState]
  );

  useEffect(() => {
    if (!statement?.import_session_id) return;
    loadSession(statement.import_session_id).catch(() => undefined);
  }, [loadSession, statement?.import_session_id]);

  const optionMap = useMemo(() => {
    return {
      document_types: (lookups?.document_types || []).map((o) => ({
        label: o.label,
        value: o.id,
      })),
      entities: (lookups?.entities || []).map((o) => ({
        label: o.label,
        value: o.id,
        entity_type: o.entity_type,
      })),
      ledger_accounts: (lookups?.ledger_accounts || []).map((o) => ({
        label: o.label,
        value: o.id,
      })),
      projects: (lookups?.projects || []).map((o) => ({
        label: o.label,
        value: o.id,
      })),
    };
  }, [lookups]);

  const filteredEntityOptions = useMemo(() => {
    if (!selectedDraft?.entity_type) return optionMap.entities;
    return optionMap.entities.filter(
      (item) => item.entity_type === selectedDraft.entity_type
    );
  }, [selectedDraft?.entity_type, optionMap.entities]);

  const selectedFamilyCount = useMemo(() => {
    if (!selectedRow) return 0;
    return getFamilyRows(selectedRow).length;
  }, [getFamilyRows, selectedRow]);

  const fieldSuggestions = useMemo(
    () => selectedRow?.candidate_payload?.field_suggestions || {},
    [selectedRow]
  );

  const rowCandidates = useMemo(
    () => selectedRow?.candidate_payload?.row_candidates || [],
    [selectedRow]
  );

  const aiCompletion = useMemo(
    () => selectedRow?.candidate_payload?.ai_completion || null,
    [selectedRow]
  );

  const visibleCandidateCards = useMemo(() => {
    if (!selectedRow) return [];
    const dismissed = new Set(dismissedCandidatesByRow[selectedRow.id] || []);
    return rowCandidates
      .slice(0, MAX_VISIBLE_CANDIDATES)
      .map((candidate, index) => ({
        candidate,
        key: buildCandidateKey(candidate, index),
      }))
      .filter((entry) => !dismissed.has(entry.key));
  }, [dismissedCandidatesByRow, rowCandidates, selectedRow]);

  const dismissCandidate = useCallback((rowId: string, candidateKey: string) => {
    setDismissedCandidatesByRow((prev) => {
      const next = new Set(prev[rowId] || []);
      next.add(candidateKey);
      return { ...prev, [rowId]: Array.from(next) };
    });
  }, []);

  const renderSuggestionButtons = useCallback(
    (
      items: FieldSuggestionOption[] | undefined,
      onClick: (item: FieldSuggestionOption) => void
    ) => {
      if (!items?.length) return null;

      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={`${item.id}-${item.label}`}
              type="button"
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
              onClick={() => onClick(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      );
    },
    []
  );

  const editorHeader = (
    <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-gray-600">
            {selectedRow ? `Row ${selectedRow.line_index}` : "Review"}
          </div>

          <h2 className="text-[15px] font-semibold text-gray-900">
            {selectedRow ? selectedRow.source_description : "Select a row"}
          </h2>

          {selectedRow ? (
            <p className="mt-1 text-[12px] text-gray-600">
              Source amount: {formatMoney(selectedRow.source_amount_minor)} • Match confidence:{" "}
              {formatPercent(selectedRow.match_confidence)}
              {selectedFamilyCount > 1
                ? ` • ${selectedFamilyCount} linked installments`
                : ""}
            </p>
          ) : null}
        </div>

        <div className="md:hidden">
          <Button variant="outline" onClick={() => setMobileEditorOpen(false)}>
            <ArrowLeft size={16} className="mr-1" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-gray-50"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => {
        void handleDrop(e);
      }}
    >
      <TopProgress
        active={busy || uploadBusy || polling || !!savingField}
        variant="top"
        topOffset={0}
      />

      {dragActive && !hasActiveReview ? (
        <div className="pointer-events-none absolute inset-0 z-40">
          <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px]" />
          <div className="absolute inset-4 rounded-3xl border-2 border-dashed border-emerald-400 bg-white/65 shadow-lg" />
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div className="rounded-3xl border border-emerald-200 bg-white/90 px-8 py-8 shadow-xl">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <UploadCloud size={28} />
              </div>
              <div className="mt-4 text-[18px] font-semibold text-gray-900">
                Drop statement to upload
              </div>
              <div className="mt-2 text-[13px] text-gray-600">
                PDF, image, CSV, OFX or XML
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-b border-gray-200 bg-white px-4 py-4 md:px-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,340px)_1fr]">
            <SelectDropdown<SelectItem>
              label="Bank account"
              items={bankOptions}
              selected={
                selectedBankId
                  ? bankOptions.filter((o) => o.value === selectedBankId)
                  : []
              }
              onChange={(items) => setSelectedBankId(items[0]?.value || "")}
              getItemKey={(item) => item.value}
              getItemLabel={(item) => item.label}
              singleSelect
              hideCheckboxes
              buttonLabel="Select bank account"
              customStyles={{ maxHeight: "220px" }}
              disabled={hasActiveReview}
            />

            {!hasActiveReview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadBusy || !selectedBankId}
                className={[
                  "flex min-h-[88px] items-center justify-between rounded-2xl border border-dashed px-4 py-4 text-left transition",
                  selectedBankId
                    ? "border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50"
                    : "border-gray-300 bg-gray-50 opacity-80",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-900">
                    <FileUp size={16} className="text-emerald-600" />
                    Upload or drag a statement here
                  </div>
                  <div className="mt-1 text-[12px] text-gray-600">
                    PDF, PNG, JPG, WEBP, CSV, OFX or XML
                  </div>
                </div>

                <div className="text-[12px] font-medium text-emerald-700">
                  {selectedBankId ? "Choose file" : "Select bank first"}
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[12px] text-gray-600">
                <div className="font-medium text-gray-800">Flow</div>
                <div className="mt-1">
                  1. Select bank • 2. Upload file • 3. AI reads document • 4. Review locally • 5. Save on explicit action
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {!hasActiveReview ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadBusy || !selectedBankId}
                >
                  {uploadBusy || polling ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Processing
                    </>
                  ) : (
                    "Upload statement"
                  )}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.ofx,.xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside
          className={`${
            mobileEditorOpen ? "hidden" : "block"
          } xl:block min-h-0 border-r border-gray-200 bg-white`}
        >
          <div className="h-full overflow-y-auto space-y-5 p-4 md:p-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <Input
                label="Search rows"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Description"
              />

              <div className="mt-3">
                <SelectDropdown<SelectItem>
                  label="Status filter"
                  items={rowStatusOptions}
                  selected={
                    statusFilter
                      ? rowStatusOptions.filter((item) => item.value === statusFilter)
                      : []
                  }
                  onChange={(items) => setStatusFilter(items[0]?.value || "")}
                  getItemKey={(item) => item.value}
                  getItemLabel={(item) => item.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="All rows"
                  customStyles={{ maxHeight: "180px" }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="inline-flex items-center">
                  <Button
                    variant="outline"
                    onClick={handleAcceptConfident}
                    disabled={!session || busy || uploadBusy || polling}
                  >
                    Accept confident
                  </Button>
                  <InfoHint text="Saves local edits first, then automatically marks highly confident rows as ready." />
                </div>

                <div className="inline-flex items-center">
                  <Button
                    variant="primary"
                    onClick={handleCommit}
                    disabled={!canCreateEntries}
                  >
                    Create entries
                  </Button>
                  <InfoHint text={createEntriesHint} />
                </div>
              </div>

              {invalidRowsForCreation.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] text-amber-800">
                  <div className="font-semibold">Mandatory fields missing</div>
                </div>
              ) : null}

              {session ? (
                <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                    <div className="font-semibold">
                      {session.summary?.ready_rows || 0}
                    </div>
                    <div>Ready</div>
                  </div>

                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                    <div className="font-semibold">
                      {session.summary?.pending_rows || 0}
                    </div>
                    <div>Pending</div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {!session ? (
                <div className="p-4 text-[13px] text-gray-600">
                  {!hasActiveReview ? "Upload a statement to start the review." : "Loading review."}
                </div>
              ) : rows.length === 0 ? (
                <div className="p-4 text-[13px] text-gray-600">
                  No rows match the current filters.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {rows.map((row) => {
                    const localDraft = draftsByRowId[row.id];
                    const effectiveDraft = localDraft || createDraftFromRow(row);
                    const localDescription =
                      effectiveDraft.description || row.resolved_description || row.source_description;
                    const localStatus = effectiveDraft.status || row.status;
                    const rowMissingLabel =
                      localStatus !== "excluded"
                        ? getRowMandatoryMissingLabel(effectiveDraft)
                        : "";

                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRowId(row.id);
                            setMobileEditorOpen(true);
                          }}
                          className={`w-full px-4 py-3 text-left transition ${
                            selectedRowId === row.id
                              ? "bg-emerald-50"
                              : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                                Row {row.line_index}
                              </div>
                              <div className="truncate text-[13px] font-medium text-gray-900">
                                {localDescription}
                              </div>
                              <div className="mt-1 text-[12px] text-gray-600">
                                {formatMoney(
                                  isDraftAmountValid(effectiveDraft)
                                    ? Math.round(
                                        Number(
                                          String(effectiveDraft.amount).replace(",", ".")
                                        ) * 100
                                      )
                                    : row.resolved_amount_minor
                                )}{" "}
                                • {row.resolved_due_date || "No due date"}
                              </div>

                              {rowMissingLabel ? (
                                <div className="mt-1 text-[11px] font-medium text-amber-700">
                                  {rowMissingLabel}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  localStatus === "ready"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : localStatus === "excluded"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {localStatus}
                              </span>

                              {row.match_confidence != null ? (
                                <span className="text-[11px] text-gray-500">
                                  {formatPercent(row.match_confidence)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </aside>

        <section
          className={`${
            mobileEditorOpen ? "block" : "hidden"
          } xl:block min-h-0 overflow-y-auto`}
        >
          {!selectedRow || !selectedDraft ? (
            session && (busy || uploadBusy || polling || !session.rows?.length) ? (
              <div className="grid h-full place-items-center px-6">
                <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Loader2 size={22} className="animate-spin" />
                    </div>

                    <div>
                      <div className="text-[15px] font-semibold text-gray-900">
                        Loading review
                      </div>
                      <div className="text-[12px] text-gray-600">
                        Preparing rows, suggestions and classifications.
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="h-3 w-40 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
                    <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
                    <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
                    <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-[14px] text-gray-600">
                Select a row to review its fields and suggestions.
              </div>
            )
          ) : (
            <div className="flex min-h-full flex-col">
              {editorHeader}

              <div className="space-y-4 p-4 md:p-5">
                {visibleCandidateCards.length > 0 ? (
                  <section className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-gray-700">
                          AI candidates
                        </h4>
                        <p className="mt-1 text-[12px] text-gray-600">
                          Showing the top {Math.min(MAX_VISIBLE_CANDIDATES, rowCandidates.length)} suggestions.
                          Applying one updates the local draft only.
                        </p>
                      </div>

                      <div className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
                        <Sparkles size={12} className="mr-1 inline" />
                        Top matches
                      </div>
                    </div>

                    {aiCompletion ? (
                      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-[12px] text-sky-800">
                        <div className="font-semibold">AI verification</div>
                        <div className="mt-1">
                          {typeof aiCompletion.rationale === "string" && aiCompletion.rationale
                            ? aiCompletion.rationale
                            : "AI reviewed missing fields and tx type for this row."}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {visibleCandidateCards.map(({ candidate, key }) => (
                        <div
                          key={key}
                          className="relative min-w-0 rounded-2xl border border-gray-200 bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <button
                            type="button"
                            className="absolute right-2 top-2 z-10 rounded-full border border-gray-200 bg-white p-1 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                            onClick={() => dismissCandidate(selectedRow.id, key)}
                            aria-label="Hide suggestion"
                            title="Hide suggestion"
                          >
                            <X size={13} />
                          </button>

                          <button
                            type="button"
                            className="block w-full min-w-0 pr-8 text-left"
                            onClick={() => handleApplyRowCandidate(candidate)}
                          >
                            <div className="line-clamp-2 min-h-[2.5rem] break-words pr-1 text-[12px] font-semibold leading-5 text-gray-900">
                              {candidate.entity_label ||
                                candidate.description ||
                                "Suggested match"}
                            </div>

                            <div className="mt-1 line-clamp-2 min-h-[2.25rem] break-words pr-1 text-[11px] leading-4 text-gray-600">
                              {candidate.ledger_account_label || "No ledger"}
                            </div>

                            <div className="mt-1 line-clamp-2 min-h-[2.25rem] break-words pr-1 text-[11px] leading-4 text-gray-600">
                              {candidate.project_label || "No project"}
                            </div>

                            <div className="mt-3 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                              {formatPercent(candidate.score)}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[12px] font-semibold uppercase tracking-wide text-gray-700">
                      Details
                    </h4>

                    {selectedFamilyCount > 1 ? (
                      <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                        {selectedFamilyCount} linked installments
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Input
                      kind="date"
                      label="Due date"
                      value={selectedDraft.due_date}
                      onValueChange={(valueIso: string) =>
                        updateDraft(selectedRow.id, (prev) => ({
                          ...prev,
                          due_date: valueIso,
                        }))
                      }
                    />

                    <div>
                      <Input
                        kind="amount"
                        id={`statement-import-amount-${selectedRow.id}`}
                        label="Amount"
                        value={selectedDraft.amount}
                        onValueChange={(next: string) => {
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            amount: next,
                          }));
                        }}
                        zeroAsEmpty
                      />
                      {!isDraftAmountValid(selectedDraft) ? (
                        <div className="mt-2 text-[11px] font-medium text-amber-700">
                          Amount is mandatory to create entries.
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <SelectDropdown<SelectItem>
                        label="Tx type"
                        items={txTypeOptions}
                        selected={
                          selectedDraft.tx_type
                            ? txTypeOptions.filter(
                                (item) => item.value === selectedDraft.tx_type
                              )
                            : []
                        }
                        onChange={(items) => {
                          const value = items[0]?.value || "";
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            tx_type: value,
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        buttonLabel="Select type"
                        customStyles={{ maxHeight: "180px" }}
                      />

                      {aiCompletion?.tx_type?.value != null ? (
                        <div className="mt-2 text-[11px] text-sky-700">
                          AI detected this as{" "}
                          <span className="font-semibold">
                            {String(aiCompletion.tx_type.value) === "1"
                              ? "Credit"
                              : "Debit"}
                          </span>
                          {" • "}confidence{" "}
                          {Math.round((aiCompletion.tx_type.confidence || 0) * 100)}%
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-3">
                      <Input
                        label="Description"
                        value={selectedDraft.description}
                        onChange={(e) =>
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Input
                        label="Observation"
                        value={selectedDraft.observation}
                        onChange={(e) =>
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            observation: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <SelectDropdown<SelectItem>
                        label="Document type"
                        items={optionMap.document_types}
                        selected={
                          selectedDraft.document_type
                            ? optionMap.document_types.filter(
                                (item) => item.value === selectedDraft.document_type
                              )
                            : []
                        }
                        onChange={(items) => {
                          const value = items[0]?.value || "";
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            document_type: value,
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        buttonLabel="Select document type"
                        customStyles={{ maxHeight: "220px" }}
                      />

                      {renderSuggestionButtons(
                        fieldSuggestions.document_type,
                        (item) => {
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            document_type: item.id || "",
                          }));
                        }
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <Input
                        label="Notes"
                        value={selectedDraft.notes}
                        onChange={(e) =>
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <h4 className="text-[12px] font-semibold uppercase tracking-wide text-gray-700">
                    Classification
                  </h4>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <SelectDropdown<EntityOption>
                        label="Entity"
                        items={filteredEntityOptions as EntityOption[]}
                        selected={
                          selectedDraft.entity_id
                            ? (filteredEntityOptions as EntityOption[]).filter(
                                (item) => item.value === selectedDraft.entity_id
                              )
                            : []
                        }
                        onChange={(items) => {
                          const value = items[0]?.value || "";
                          const entityType =
                            items[0]?.entity_type || selectedDraft.entity_type || "";
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            entity_id: value,
                            entity_type: entityType,
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        buttonLabel="Select entity"
                        customStyles={{ maxHeight: "240px" }}
                      />

                      {renderSuggestionButtons(fieldSuggestions.entity, (item) => {
                        updateDraft(selectedRow.id, (prev) => ({
                          ...prev,
                          entity_id: item.id || "",
                        }));
                      })}
                    </div>

                    <SelectDropdown<SelectItem>
                      label="Entity type"
                      items={entityTypeOptions}
                      selected={
                        selectedDraft.entity_type
                          ? entityTypeOptions.filter(
                              (item) => item.value === selectedDraft.entity_type
                            )
                          : []
                      }
                      onChange={(items) => {
                        const value = items[0]?.value || "";
                        updateDraft(selectedRow.id, (prev) => ({
                          ...prev,
                          entity_type: value,
                        }));
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel="Select entity type"
                      customStyles={{ maxHeight: "240px" }}
                    />

                    <div>
                      <SelectDropdown<SelectItem>
                        label="Ledger account"
                        items={optionMap.ledger_accounts}
                        selected={
                          selectedDraft.ledger_account_id
                            ? optionMap.ledger_accounts.filter(
                                (item) => item.value === selectedDraft.ledger_account_id
                              )
                            : []
                        }
                        onChange={(items) => {
                          const value = items[0]?.value || "";
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            ledger_account_id: value,
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        buttonLabel="Select ledger"
                        customStyles={{ maxHeight: "240px" }}
                      />

                      {renderSuggestionButtons(
                        fieldSuggestions.ledger_account,
                        (item) => {
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            ledger_account_id: item.id || "",
                          }));
                        }
                      )}

                      {!isDraftLedgerValid(selectedDraft) ? (
                        <div className="mt-2 text-[11px] font-medium text-amber-700">
                          Ledger account is mandatory to create entries.
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <SelectDropdown<SelectItem>
                        label="Project"
                        items={optionMap.projects}
                        selected={
                          selectedDraft.project_id
                            ? optionMap.projects.filter(
                                (item) => item.value === selectedDraft.project_id
                              )
                            : []
                        }
                        onChange={(items) => {
                          const value = items[0]?.value || "";
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            project_id: value,
                          }));
                        }}
                        getItemKey={(item) => item.value}
                        getItemLabel={(item) => item.label}
                        singleSelect
                        hideCheckboxes
                        buttonLabel="Select project"
                        customStyles={{ maxHeight: "240px" }}
                      />

                      {renderSuggestionButtons(fieldSuggestions.project, (item) => {
                        updateDraft(selectedRow.id, (prev) => ({
                          ...prev,
                          project_id: item.id || "",
                        }));
                      })}
                    </div>

                    <SelectDropdown<SelectItem>
                      label="Installment interval"
                      items={intervalOptions}
                      selected={
                        selectedDraft.interval_months
                          ? intervalOptions.filter(
                              (item) => item.value === selectedDraft.interval_months
                            )
                          : []
                      }
                      onChange={(items) => {
                        const value = items[0]?.value || "1";
                        updateDraft(selectedRow.id, (prev) => ({
                          ...prev,
                          interval_months: value,
                        }));
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel="Select interval"
                      customStyles={{ maxHeight: "240px" }}
                    />

                    <SelectDropdown<SelectItem>
                      label="Weekend action"
                      items={weekendOptions}
                      selected={
                        selectedDraft.weekend_action
                          ? weekendOptions.filter(
                              (item) => item.value === selectedDraft.weekend_action
                            )
                          : []
                      }
                      onChange={(items) => {
                        const value = items[0]?.value || "0";
                        updateDraft(selectedRow.id, (prev) => ({
                          ...prev,
                          weekend_action: value,
                        }));
                      }}
                      getItemKey={(item) => item.value}
                      getItemLabel={(item) => item.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel="Select weekend action"
                      customStyles={{ maxHeight: "240px" }}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center">
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            status: "pending",
                          }))
                        }
                      >
                        Mark pending
                      </Button>
                      <InfoHint text="Updates only the local draft. It will be persisted when the modal closes, when accepting confident rows, or when creating entries." />
                    </div>

                    <div className="inline-flex items-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const nextDraft = {
                            ...selectedDraft,
                            status: "ready",
                          };
                          setDraftsByRowId((prev) => ({
                            ...prev,
                            [selectedRow.id]: nextDraft,
                          }));
                          applyDraftToFamilyLocally(selectedRow, nextDraft);
                        }}
                      >
                        <CheckCircle2 size={16} className="mr-1" />
                        Mark family ready
                      </Button>
                      <InfoHint text="Updates only the local draft for this installment family. It will be persisted on explicit workflow actions or modal close." />
                    </div>

                    <div className="inline-flex items-center">
                      <Button
                        variant="cancel"
                        onClick={() =>
                          updateDraft(selectedRow.id, (prev) => ({
                            ...prev,
                            status: "excluded",
                          }))
                        }
                      >
                        Exclude row
                      </Button>
                      <InfoHint text="Updates only the local draft. It will be saved later when the modal closes or you continue the workflow." />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 inset-x-0 border-t border-gray-200 bg-white px-4 py-3 md:hidden">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void handleAcceptConfident()}
              disabled={busy || uploadBusy || polling || !session}
            >
              Accept confident
            </Button>
            <InfoHint text="Saves local edits first, then automatically marks highly confident rows as ready." />
          </div>

          <div className="flex items-center">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => void handleCommit()}
              disabled={!canCreateEntries}
            >
              Create entries
            </Button>
            <InfoHint text={createEntriesHint} />
          </div>
        </div>
      </div>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </div>
  );
};

export default StatementImportWizard;