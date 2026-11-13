import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { AnimatePresence } from "framer-motion";
import { ArrowUpRight, Clipboard, KeyRound, Settings2, ShieldCheck, Unplug } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/core/api/requests";
import Button from "@/shared/ui/Button";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import DataTable, { type Column } from "@/shared/ui/DataTable";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import type { IntegrationConnection } from "@/models/integrations/connections";
import ConnectionPolicyEditor from "./ConnectionPolicyEditor";

type Snack =
  | { message: string; severity: "success" | "error" | "info" | "warning" }
  | null;

type Row = IntegrationConnection & { id: string };

const DOCS_URL = "https://spifex.com/docs/ai-connections";

function ConnectionsPage() {
  const { t, i18n } = useTranslation("aiConnections");
  const [connections, setConnections] = useState<IntegrationConnection[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Row | null>(null);
  const [configuring, setConfiguring] = useState<Row | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);
  const endpoint = "https://api.spifex.com/mcp";

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getIntegrationConnections();
      setConnections(response.data.results);
    } catch (cause) {
      setConnections(null);
      setError(apiErrorMessage(cause, t("errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatMoment = useCallback(
    (value: string | null) => {
      if (!value) return t("never");
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return t("never");
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
    },
    [i18n.language, t],
  );

  const scopeLabel = useCallback(
    (scope: string) => scope === "spifex:access" || scope === "cashflow:read" ? t("scope.access") : scope,
    [t],
  );

  const rows = useMemo<Row[]>(
    () => (connections ?? []).map(connection => ({ ...connection, id: connection.application_id })),
    [connections],
  );

  const hasDuplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const connection of connections ?? []) {
      counts.set(connection.client_name, (counts.get(connection.client_name) ?? 0) + 1);
    }
    return [...counts.values()].some(count => count > 1);
  }, [connections]);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setSnack({ message: t("endpoint.copied"), severity: "success" });
    } catch {
      setSnack({ message: t("endpoint.copyError"), severity: "error" });
    }
  };

  const columns = useMemo<Column<Row>[]>(
    () => [
      {
        key: "client",
        label: t("columns.client"),
        mobile: true,
        render: row => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <KeyRound size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-gray-900">{row.client_name}</span>
              <span className="block truncate text-[11px] text-gray-500">
                {t("registration", { id: row.application_id.slice(0, 8) })}
              </span>
              <span className="block truncate text-xs text-gray-500">{row.scopes.map(scopeLabel).join(", ")}</span>
            </span>
          </div>
        ),
      },
      {
        key: "status",
        label: t("columns.status"),
        render: row => (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-700">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${row.status === "active" ? "bg-emerald-500" : "bg-gray-300"}`} />
            {t(`status.${row.status}`)}
          </span>
        ),
      },
      {
        key: "created",
        label: t("columns.created"),
        render: row => <span className="text-[13px] text-gray-600">{formatMoment(row.created_at)}</span>,
      },
      {
        key: "lastUsed",
        label: t("columns.lastUsed"),
        render: row => <span className="text-[13px] text-gray-600">{formatMoment(row.last_used_at)}</span>,
      },
      {
        key: "expires",
        label: t("columns.expires"),
        render: row => <span className="text-[13px] text-gray-600">{formatMoment(row.expires_at)}</span>,
      },
    ],
    [formatMoment, scopeLabel, t],
  );

  const previewColumns = useMemo<Column<Row>[]>(
    () => [
      {
        key: "client",
        label: t("columns.client"),
        render: row => (
          <span className="block">
            <span className="block font-medium text-gray-900">{row.client_name}</span>
            <span className="block text-xs text-gray-500">
              {t("registration", { id: row.application_id.slice(0, 8) })}
            </span>
          </span>
        ),
      },
      {
        key: "status",
        label: t("columns.status"),
        render: row => (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${row.status === "active" ? "bg-emerald-500" : "bg-gray-300"}`} />
            {t(`status.${row.status}`)}
          </span>
        ),
      },
      {
        key: "application_id",
        label: t("details.registrationId"),
        render: row => <span className="break-all font-mono text-xs text-gray-700">{row.application_id}</span>,
      },
      {
        key: "scopes",
        label: t("details.scopes"),
        render: row => <span className="text-xs text-gray-700">{row.scopes.map(scopeLabel).join(", ")}</span>,
      },
      {
        key: "created",
        label: t("columns.created"),
        render: row => <span className="text-xs text-gray-700">{formatMoment(row.created_at)}</span>,
      },
      {
        key: "lastUsed",
        label: t("columns.lastUsed"),
        render: row => <span className="text-xs text-gray-700">{formatMoment(row.last_used_at)}</span>,
      },
      {
        key: "expires",
        label: t("columns.expires"),
        render: row => <span className="text-xs text-gray-700">{formatMoment(row.expires_at)}</span>,
      },
      {
        key: "registration_source",
        label: t("details.registrationSource"),
        render: row => <span className="text-xs text-gray-700">{t(`source.${row.registration_source}`)}</span>,
      },
      {
        key: "client_type",
        label: t("details.clientType"),
        render: row => <span className="text-xs text-gray-700">{t(`clientType.${row.client_type}`)}</span>,
      },
      {
        key: "grant_type",
        label: t("details.grantType"),
        render: row => <span className="text-xs text-gray-700">{row.grant_type}</span>,
      },
    ],
    [formatMoment, scopeLabel, t],
  );

  const revoke = async () => {
    if (!pending) return;
    setRevoking(true);
    try {
      await api.revokeIntegrationConnection(pending.application_id);
      setConnections(current =>
        current ? current.filter(item => item.application_id !== pending.application_id) : current,
      );
      setSnack({ message: t("revoke.success", { client: pending.client_name }), severity: "success" });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("revoke.error")), severity: "error" });
      void load();
    } finally {
      setRevoking(false);
      setPending(null);
    }
  };

  return (
    <main className="settings-page">
    <div className="settings-content flex w-full min-w-0 flex-col gap-5">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">{t("how.title")}</h2>
            <p className="mt-1 text-[13px] leading-5 text-gray-600">{t("how.description")}</p>
            <button type="button" onClick={() => void copyEndpoint()} title={t("endpoint.copy")} aria-label={t("endpoint.copy")} className="group mt-3 flex w-full max-w-xl items-center justify-between gap-3 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-gray-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 sm:w-auto">
              <span className="min-w-0 truncate font-mono text-sm font-medium text-gray-900">{endpoint}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-500 group-hover:text-gray-800"><Clipboard size={15} aria-hidden="true" />{t("endpoint.copy")}</span>
            </button>
            <ol className="mt-4 grid gap-2 text-[13px] text-gray-700 sm:grid-cols-3">
              {["step1", "step2", "step3"].map((step, index) => (
                <li key={step} className="flex min-w-0 items-start gap-2 rounded-md bg-gray-50 px-3 py-2.5 leading-5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-[11px] font-medium text-gray-500">{index + 1}</span>
                  <span>{t(`how.${step}`)}</span>
                </li>
              ))}
            </ol>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-md text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-gray-950 hover:decoration-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              {t("how.docs")}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t("list.title")}</h2>
            <p className="mt-0.5 text-xs leading-5 text-gray-500">{t("list.description")}</p>
            {hasDuplicateNames && (
              <p className="mt-1 max-w-xl text-xs leading-5 text-amber-700">
                {t("list.duplicates")}
              </p>
            )}
          </div>
          <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => void load()} disabled={loading}>
            {t("list.refresh")}
          </Button>
        </div>

        {loading ? (
          <div className="p-4 sm:p-5">
            <PageSkeleton rows={4} />
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-4 sm:p-5">
            <p className="text-sm text-red-700">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              {t("list.retry")}
            </Button>
          </div>
        ) : (
          <div className="min-w-0 [&_table]:!text-[13px] [&_th]:!text-xs [&_td]:!text-[13px]">
            <DataTable<Row>
              items={rows}
              columns={columns}
              previewColumns={previewColumns}
              emptyLabel={t("empty")}
              pagination={false}
              canEdit={false}
              canDelete={false}
              actions={row => (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfiguring(row)}
                  >
                    <Settings2 size={15} aria-hidden="true" />
                    <span className="ml-1.5">{t("policy.configure", "Configure")}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPending(row)}
                    disabled={!row.revocable}
                  >
                    <Unplug size={15} aria-hidden="true" />
                    <span className="ml-1.5">{t("revoke.action")}</span>
                  </Button>
                </div>
              )}
            />
          </div>
        )}
      </section>

      <AnimatePresence initial={false}>
        {configuring && <ConnectionPolicyEditor
          connection={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={policy => {
            setConnections(current => current ? current.map(item => item.application_id === configuring.application_id ? { ...item, policy } : item) : current);
            setConfiguring(previous => previous ? { ...previous, policy } : previous);
          }}
        />}
      </AnimatePresence>

      <ConfirmToast
        open={Boolean(pending)}
        text={pending ? t("revoke.confirm", { client: pending.client_name }) : ""}
        confirmLabel={t("revoke.confirmLabel")}
        cancelLabel={t("revoke.cancel")}
        variant="danger"
        busy={revoking}
        onConfirm={() => void revoke()}
        onCancel={() => setPending(null)}
      />

      <Snackbar
        notificationKey={snack}
        open={Boolean(snack)}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        showCloseButton
      />
    </div>
    </main>
  );
}

export default ConnectionsPage;
