// src/pages/AccountingSettings/pages/AccountingReconciliationPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/shared/ui/Button";

const AccountingReconciliationPage: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Missing category policy",
      description:
        "Operational entries are categorized, but the category still does not translate into accounting accounts.",
      cta: "Open posting policies",
      onClick: () => navigate("/settings/accounting/posting-policies"),
    },
    {
      title: "Missing bank mapping",
      description:
        "Bank movements cannot post because the operational bank account is not linked to a bank-control ledger account.",
      cta: "Open bank mappings",
      onClick: () => navigate("/settings/accounting/bank-mappings"),
    },
    {
      title: "Ready to post",
      description:
        "Entries already have category, policy, bank mapping, and accounting context resolved for posting review.",
      cta: "Review journals",
      onClick: () => navigate("/settings/accounting/journals"),
    },
    {
      title: "Posted with exception",
      description:
        "Entries posted successfully but still need manual review, reversal, or deeper reconciliation follow-up.",
      cta: "Open journals",
      onClick: () => navigate("/settings/accounting/journals"),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-600">Reconciliation</div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <h2 className="text-[16px] font-semibold text-gray-900">Accounting readiness board</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-6 text-gray-600">
            This area should act as the bridge between the operational cashflow layer and the
            accounting layer, surfacing what blocks posting, what is ready, and what needs review.
          </p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Queue</div>
            <h3 className="mt-2 text-[14px] font-semibold text-gray-900">{card.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-gray-600">{card.description}</p>
            <div className="mt-4">
              <Button type="button" variant="outline" onClick={card.onClick}>
                {card.cta}
              </Button>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="text-[10px] uppercase tracking-wide text-gray-600">Backend proposal</div>
        <p className="mt-2 text-[13px] leading-6 text-gray-700">
          Suggested endpoint: <code>GET cashflow/accounting-readiness/</code>, returning grouped
          queues by readiness state so this page can evolve from static guidance into a true
          operational board.
        </p>
      </section>
    </section>
  );
};

export default AccountingReconciliationPage;
