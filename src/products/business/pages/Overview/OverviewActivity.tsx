import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import Card from "@/shared/ui/Card";
import TableCard from "@/shared/ui/TableCard";
import ActivityCalendar from "./ActivityCalendar";
import DataTable from "@/shared/ui/DataTable";
import { EmptyState } from "@/shared/ui/State";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { OverviewData, OverviewRecord } from "@/models/finance/overview";

export default function OverviewActivity({ data, canPreview, inspect }: { data: OverviewData; canPreview: boolean; inspect(row: OverviewRecord, allowSettlement?: boolean): Promise<void> }) {
  const { t } = useTranslation("overview");
  const [attention,setAttention] = useState<"attention"|"upcoming">("attention");
  const query = { basis: data.period.basis };
  const money = (value: string | number, currency?: string) => formatCurrency(value,currency || data.currency || undefined);
  return <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <div className="min-w-0 space-y-5">
      {data.capabilities.entries && <TableCard
        title={t("recent")}
        actions={<Link to={query.basis==="settled"?"/b/settled":"/b/cashflow"} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">{t("viewAll")}<ChevronRight size={13} aria-hidden="true" /></Link>}
      >
        <DataTable<OverviewRecord>
          frame={false}
          items={data.recent}
          pagination={false}
          emptyLabel={t("noActivity")}
          onInspect={canPreview ? row=>void inspect(row, data.period.basis === "planned") : undefined}
          columns={[
            {key:"name",label:t("description"),render:row=><span className="font-medium">{row.description || t("unnamed")}</span>},
            {key:"date",label:t("date"),render:row=>formatDateFromISO(row.date)},
            {key:"category",label:t("category"),render:row=>row.category || t("uncategorized")},
            {key:"amount",label:t("amount"),render:row=><span className={`whitespace-nowrap tabular-nums ${row.tx_type===1 ? "text-emerald-700" : "text-slate-800"}`}>{row.tx_type===1?"+":"−"}{money(row.amount)}</span>},
          ]}
        />
      </TableCard>}

      {data.capabilities.open_entries && <TableCard
        title={t("attention")}
        tooltip={t("attentionScope")}
        actions={<SegmentedControl<"attention" | "upcoming"> value={attention} label={t("attention")} onChange={setAttention} items={[{value:"attention",label:t("overdue")},{value:"upcoming",label:t("upcoming")}]} />}
      >
        <DataTable<OverviewRecord>
          frame={false}
          items={data[attention]}
          pagination={false}
          emptyLabel={t("nothingDue")}
          onInspect={row=>void inspect(row, true)}
          columns={[
            {key:"name",label:t("description"),render:row=><span className="font-medium">{row.description || t("unnamed")}</span>},
            {key:"date",label:t("date"),render:row=>formatDateFromISO(row.date)},
            {key:"amount",label:t("amount"),render:row=><span className={`whitespace-nowrap tabular-nums ${row.tx_type===1 ? "text-emerald-700" : "text-slate-800"}`}>{row.tx_type===1?"+":"−"}{money(row.amount)}</span>},
          ]}
        />
      </TableCard>}
    </div>

    <aside className="min-w-0 space-y-5">
      {data.capabilities.metrics && <ActivityCalendar data={data}/>}
      {data.capabilities.banks && <Card
        as="section"
        radius="xl"
        tone="slate"
        padding="none"
        bodyClassName="p-4 sm:p-5"
        title={t("accounts")}
        actions={<Link to="/b/settings/banks" className="text-xs font-medium text-slate-500 hover:text-slate-900">{t("manage")}</Link>}
      >
        <ul className="divide-y divide-slate-100">{data.banks.map(bank=><li key={bank.id} className="flex items-center gap-3 py-3"><span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500">{bank.name.slice(0,2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700">{bank.name}</p><p className="mt-1 truncate text-[10px] text-slate-400">{bank.currency} · {bank.account}</p></div><span className="text-xs font-medium tabular-nums text-slate-900">{money(bank.balance,bank.currency)}</span></li>)}</ul>
        {!data.banks.length && <EmptyState size="xs" title={t("noAccounts")} />}
      </Card>}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5"><p className="text-sm font-medium text-slate-900">{t("helpTitle")}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t("helpText")}</p><Link to="/b/help" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">{t("helpLink")}<ArrowUpRight size={13} aria-hidden="true" /></Link></section>
    </aside>
  </div>;
}
