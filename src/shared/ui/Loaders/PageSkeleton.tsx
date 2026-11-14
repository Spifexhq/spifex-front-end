import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import DataTableSkeleton, { SkeletonLine } from "../DataTable/DataTableSkeleton";

export type PageSkeletonVariant =
  | "table"
  | "limits"
  | "settings-table"
  | "form"
  | "sections"
  | "panel"
  | "settings-form"
  | "groups"
  | "settings-list"
  | "dashboard"
  | "billing"
  | "onboarding"
  | "review"
  | "accounting"
  | "correlations"
  | "fields";

export type PageSkeletonProps = {
  rows?: number;
  variant?: PageSkeletonVariant;
  pagination?: boolean;
};

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>;
}

function PanelHeading({ className = "" }: { className?: string }) {
  return <div className={`border-b border-gray-200 bg-gray-50 px-4 py-2.5 ${className}`}>
    <SkeletonLine className="h-3 w-28" />
  </div>;
}

function PanelRows({ count, action = true, toggle = false }: { count: number; action?: boolean; toggle?: boolean }) {
  return <div>
    {Array.from({ length: count }, (_, index) => <div key={index} className="flex min-h-16 items-center justify-between gap-5 border-b border-gray-100 px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-3 w-2/5" />
      </div>
      {toggle ? <SkeletonLine className="h-5 w-9 rounded-full" /> : action ? <SkeletonLine className="h-8 w-16 rounded-md" /> : null}
    </div>)}
  </div>;
}

function FilterChips({ count = 3 }: { count?: number }) {
  return <div className="flex flex-wrap items-center gap-2">
    {Array.from({ length: count }, (_, index) => <SkeletonLine key={index} className="h-8 w-24 rounded-md" />)}
  </div>;
}

function Toolbar({ setting = false }: { setting?: boolean }) {
  if (setting) {
    return <div className="settings-toolbar flex flex-wrap items-center justify-between gap-3">
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {Array.from({ length: 4 }, (_, index) => <SkeletonLine key={index} className="h-8 w-24 rounded-md" />)}
      </div>
      <SkeletonLine className="h-10 w-24 rounded-md md:hidden" />
      <SkeletonLine className="h-10 w-28 rounded-md md:h-9" />
    </div>;
  }
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <FilterChips count={3} />
    <SkeletonLine className="h-9 w-28 rounded-md" />
  </div>;
}

function MetricCard({ compact = false }: { compact?: boolean }) {
  return <div className={`space-y-4 rounded-xl border border-slate-200 bg-white ${compact ? "p-4" : "p-5"}`}>
    <SkeletonLine className="h-3 w-24" />
    <div className="flex flex-wrap items-end gap-3">
      <SkeletonLine className="h-7 w-2/5" />
      <SkeletonLine className="h-6 w-20" />
    </div>
    <SkeletonLine className="h-2 w-1/3" />
  </div>;
}

function ChartPanel({ tall = false }: { tall?: boolean }) {
  return <Panel>
    <PanelHeading />
    <div className="space-y-5 p-4 sm:p-5">
      <SkeletonLine className={`w-full ${tall ? "h-80" : "h-64"}`} />
      <div className="flex flex-wrap items-center gap-4">
        <SkeletonLine className="h-2 w-20" />
        <SkeletonLine className="h-2 w-20" />
        <SkeletonLine className="ml-auto h-2 w-12" />
      </div>
    </div>
  </Panel>;
}

function FormSection({ rows, action = true }: { rows: number; action?: boolean }) {
  return <Panel>
    <PanelHeading />
    <PanelRows count={rows} action={action} />
  </Panel>;
}

function PlanCard() {
  return <Panel className="flex min-h-44 flex-col p-5">
    <div className="flex items-center justify-between gap-3">
      <SkeletonLine className="h-4 w-24" />
      <SkeletonLine className="h-5 w-16 rounded-full" />
    </div>
    <SkeletonLine className="mt-5 h-7 w-32" />
    <div className="mt-4 space-y-2">
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-4/5" />
    </div>
    <SkeletonLine className="mt-5 h-9 w-28 rounded-md" />
  </Panel>;
}

function PageBody({ variant, rows, pagination }: Required<Pick<PageSkeletonProps, "variant" | "rows" | "pagination">>) {
  switch (variant) {
    case "limits":
      return <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-3">
            <SkeletonLine className="h-3 w-72 max-w-full" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => <SkeletonLine key={index} className="h-6 w-16 rounded-full" />)}
            </div>
          </div>
          <SkeletonLine className="h-9 w-full rounded-md sm:w-64" />
        </div>
        <DataTableSkeleton rows={rows} columns={5} pagination={pagination} announce={false} />
      </div>;

    case "settings-table":
      return <div className="space-y-6">
        <Toolbar setting />
        <DataTableSkeleton rows={rows} columns={5} pagination={pagination} announce={false} />
      </div>;

    case "form": {
      const primaryRows = Math.max(3, Math.ceil(rows / 2));
      const secondaryRows = Math.max(3, rows - primaryRows);
      return <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <FormSection rows={primaryRows} />
          <FormSection rows={secondaryRows} />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <Panel>
            <PanelHeading />
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-3 w-16" />
                <SkeletonLine className="h-3 w-32" />
              </div>
              <SkeletonLine className="h-8 w-16 rounded-md" />
            </div>
          </Panel>
          <FormSection rows={4} />
          <Panel>
            <PanelHeading />
            <div className="space-y-3 px-4 py-4">
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-4/5" />
              <SkeletonLine className="h-8 w-28 rounded-md" />
            </div>
          </Panel>
          <Panel>
            <PanelHeading />
            <div className="space-y-3 px-4 py-4">
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-8 w-28 rounded-md" />
            </div>
          </Panel>
        </div>
      </section>;
    }

    case "sections":
      return <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">
          <Panel>
            <PanelHeading />
            <PanelRows count={rows} action={false} toggle />
          </Panel>
        </div>
        <div className="col-span-12 xl:col-span-4">
          <Panel>
            <PanelHeading />
            <div className="space-y-3 px-4 py-4">
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-3/4" />
              <SkeletonLine className="h-3 w-2/3" />
            </div>
          </Panel>
        </div>
      </section>;

    case "panel":
      return <Panel>
        <PanelHeading />
        <PanelRows count={rows} />
      </Panel>;

    case "settings-form":
      return <Panel>
        <PanelHeading />
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="h-3 w-16" />
              <SkeletonLine className="h-3 w-48" />
            </div>
            <SkeletonLine className="h-8 w-16 rounded-md" />
          </div>
        </div>
        <div className="grid gap-3 border-b border-gray-100 px-4 py-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-2 rounded-lg border border-gray-200 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <SkeletonLine className="h-3 w-16" />
              <SkeletonLine className="h-4 w-4 rounded-full" />
            </div>
            <SkeletonLine className="h-2 w-3/4" />
          </div>)}
        </div>
        <PanelRows count={2} action={false} />
      </Panel>;

    case "groups":
      return <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel>
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-3">
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="h-2 w-16" />
            </div>
            <SkeletonLine className="h-8 w-16 rounded-md" />
          </div>
          <div className="border-b border-gray-200 p-3"><SkeletonLine className="h-9 w-full rounded-md" /></div>
          <div className="space-y-1 p-2">
            {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
              <SkeletonLine className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonLine className="h-3 w-3/4" />
                <SkeletonLine className="h-2 w-1/2" />
              </div>
            </div>)}
          </div>
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonLine className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="space-y-2">
                <SkeletonLine className="h-2 w-20" />
                <SkeletonLine className="h-4 w-40" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonLine className="h-8 w-24 rounded-md" />
              <SkeletonLine className="h-8 w-24 rounded-md" />
            </div>
          </div>
          <PanelRows count={rows} />
        </Panel>
      </div>;

    case "settings-list":
      return <Panel>
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="space-y-2">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-2 w-48" />
          </div>
          <SkeletonLine className="h-3 w-6" />
        </div>
        <div>
          {Array.from({ length: rows }, (_, index) => <div key={index} className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <SkeletonLine className="h-5 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-3 w-40" />
                <SkeletonLine className="h-2 w-56" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonLine className="h-8 w-24 rounded-md" />
              <SkeletonLine className="h-8 w-20 rounded-md" />
            </div>
          </div>)}
        </div>
      </Panel>;

    case "dashboard":
      return <div className="space-y-5">
        <div className="space-y-2">
          <SkeletonLine className="h-8 w-72 max-w-full" />
          <SkeletonLine className="h-4 w-96 max-w-full" />
        </div>
        <Panel className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <SkeletonLine className="h-14 min-w-36 flex-1 rounded-md" />
            <SkeletonLine className="h-14 min-w-36 flex-1 rounded-md" />
            <SkeletonLine className="h-14 min-w-40 flex-1 rounded-md" />
            <SkeletonLine className="h-14 min-w-40 flex-[1.5] rounded-md" />
            <SkeletonLine className="h-9 w-20 rounded-md" />
          </div>
        </Panel>
        <div className="flex flex-wrap items-center gap-4">
          <SkeletonLine className="h-3 w-32" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="ml-auto h-3 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <MetricCard key={index} />)}
        </div>
        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <ChartPanel />
          <Panel>
            <div className="space-y-4 p-5">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="h-3 w-3/4" />
              <SkeletonLine className="h-7 w-32" />
              <SkeletonLine className="h-2 w-full rounded-full" />
              {Array.from({ length: 5 }, (_, index) => <div key={index} className="flex items-center gap-3">
                <SkeletonLine className="h-2 w-2" />
                <SkeletonLine className="h-3 flex-1" />
                <SkeletonLine className="h-3 w-14" />
              </div>)}
            </div>
          </Panel>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => <Panel key={index} className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="h-3 w-12" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, row) => <div key={row} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <SkeletonLine className="h-3 w-1/2" />
                  <SkeletonLine className="h-3 w-10" />
                </div>
                <SkeletonLine className="h-1.5 w-full rounded-full" />
              </div>)}
            </div>
          </Panel>)}
        </div>
        <section className="space-y-3">
          <SkeletonLine className="h-4 w-32" />
          <DataTableSkeleton rows={5} columns={4} pagination={false} announce={false} />
        </section>
        <Panel>
          <div className="p-4">
            <SkeletonLine className="h-4 w-28" />
            <div className="mt-3 divide-y divide-gray-100">
              {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="h-3 w-2/5" />
                  <SkeletonLine className="h-2 w-24" />
                </div>
                <SkeletonLine className="h-3 w-16" />
              </div>)}
            </div>
          </div>
        </Panel>
      </div>;

    case "billing":
      return <div className="space-y-5">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <div className="mx-4 my-3 space-y-2 rounded-md border-l-4 border-gray-200 bg-gray-50 px-4 py-3">
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-4/5" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
            <SkeletonLine className="h-3 w-56" />
            <SkeletonLine className="h-8 w-24 rounded-md" />
          </div>
        </Panel>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <PlanCard key={index} />)}
        </div>
        <SkeletonLine className="h-3 w-80 max-w-full" />
      </div>;

    case "onboarding":
      return <div className="flex flex-col gap-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <SkeletonLine className="h-8 w-64 max-w-full" />
            <SkeletonLine className="h-4 w-full max-w-lg" />
          </div>
          <SkeletonLine className="h-10 w-full max-w-2xl rounded-lg" />
        </div>
        <Panel>
          <PanelHeading />
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="h-10 w-full rounded-md" />
              {index < 2 && <SkeletonLine className="h-2 w-2/3" />}
            </div>)}
          </div>
          <div className="flex justify-end border-t border-gray-100 px-4 py-3">
            <SkeletonLine className="h-9 w-28 rounded-md" />
          </div>
        </Panel>
      </div>;

    case "review":
      return <section className="space-y-5">
        <Panel>
          <div className="flex flex-col justify-between gap-4 bg-slate-50/50 p-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-48" />
              <SkeletonLine className="h-3 w-80 max-w-full" />
            </div>
            <SkeletonLine className="h-9 w-32 rounded-md" />
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2">
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-6 w-12" />
          </div>)}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SkeletonLine className="h-9 min-w-40 flex-1 rounded-md" />
          <SkeletonLine className="h-9 w-40 rounded-md" />
          <SkeletonLine className="h-8 w-24 rounded-md" />
          <SkeletonLine className="h-8 w-36 rounded-md" />
        </div>
        <DataTableSkeleton rows={rows} columns={5} pagination={pagination} selectable announce={false} />
      </section>;

    case "accounting":
      return <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl flex-1 space-y-2">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-2/3" />
          </div>
          <SkeletonLine className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-10 w-full rounded-md" />
          </div>
          <SkeletonLine className="h-9 w-20 rounded-md" />
          <SkeletonLine className="h-9 w-24 rounded-md" />
        </div>
        <DataTableSkeleton rows={rows} columns={5} pagination={pagination} announce={false} />
      </div>;

    case "correlations":
      return <div className="space-y-5">
        <Panel>
          <PanelHeading />
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl flex-1 space-y-2">
              <SkeletonLine className="h-3 w-72 max-w-full" />
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-2/3" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 4 }, (_, index) => <SkeletonLine key={index} className="h-8 w-20 rounded-md" />)}
            </div>
          </div>
        </Panel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel>
            <PanelHeading />
            <div className="p-4 sm:p-5"><SkeletonLine className="h-80 w-full" /></div>
          </Panel>
          <Panel>
            <PanelHeading />
            <PanelRows count={rows} action={false} />
          </Panel>
        </div>
      </div>;

    case "fields":
      return <div className="space-y-6">
        {Array.from({ length: 2 }, (_, section) => <Panel key={section}>
          <PanelHeading />
          <div className="space-y-5 px-5 py-5">
            <SkeletonLine className="h-3 w-3/4" />
            <SkeletonLine className="h-3 w-1/2" />
            <SkeletonLine className="h-10 w-full rounded-md" />
            <div className="grid gap-5 sm:grid-cols-2">
              <SkeletonLine className="h-10 w-full rounded-md" />
              <SkeletonLine className="h-10 w-full rounded-md" />
            </div>
          </div>
        </Panel>)}
        <div className="flex justify-end border-t border-gray-200 pt-5">
          <SkeletonLine className="h-9 w-36 rounded-md" />
        </div>
      </div>;

    case "table":
    default:
      return <div className="space-y-5">
        <Toolbar />
        <DataTableSkeleton rows={rows} columns={5} pagination={pagination} announce={false} />
      </div>;
  }
}

/** Content-only skeleton; the surrounding layout owns the page frame. */
export default function PageSkeleton({ rows = 6, variant = "table", pagination = true }: PageSkeletonProps) {
  const { t } = useTranslation("common");
  return <div role="status" aria-busy="true" className="min-w-0">
    <span className="sr-only">{t("previewLoading")}</span>
    <div aria-hidden="true">
      <PageBody variant={variant} rows={rows} pagination={pagination} />
    </div>
  </div>;
}

/** Canonical page frame used when the route does not provide its own container. */
export function PageSkeletonShell({ rows = 6, variant = "table", pagination = true }: PageSkeletonProps) {
  return <main className="mx-auto min-w-0 w-full max-w-[1440px] px-4 py-6 sm:px-7">
    <PageSkeleton rows={rows} variant={variant} pagination={pagination} />
  </main>;
}

/** Settings surface frame; the layout heading stays rendered above it. */
export function SettingsPageSkeleton({ rows = 6, variant = "settings-table", pagination = true }: PageSkeletonProps) {
  return <main className="settings-page">
    <div className="settings-content space-y-6">
      <PageSkeleton rows={rows} variant={variant} pagination={pagination} />
    </div>
  </main>;
}
