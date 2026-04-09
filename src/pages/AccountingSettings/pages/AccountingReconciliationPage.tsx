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
        "Operational entries already categorized, but no policy translates the category into accounting accounts.",
      cta: "Open posting policies",
      onClick: () => navigate("/settings/accounting/posting-policies"),
    },
    {
      title: "Missing bank mapping",
      description:
        "Bank movements cannot post because the bank account is not linked to a bank-control ledger account.",
      cta: "Open bank mappings",
      onClick: () => navigate("/settings/accounting/bank-mappings"),
    },
    {
      title: "Ready to post",
      description:
        "Operational entries with category, policy, bank mapping, and accounting book all resolved.",
      cta: "Review journals",
      onClick: () => navigate("/settings/accounting/journals"),
    },
    {
      title: "Posted with exception",
      description:
        "Items that posted but still require review, reversal, or drill-down.",
      cta: "Open journals",
      onClick: () => navigate("/settings/accounting/journals"),
    },
  ];

  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Reconciliation control center</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
          This page becomes the bridge between the operational cash flow universe and the accounting universe.
          It should list everything that blocks or qualifies accounting posting.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-base font-semibold text-gray-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{card.description}</p>
            <div className="mt-4">
              <Button type="button" variant="outline" onClick={card.onClick}>
                {card.cta}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-6 text-sm leading-6 text-gray-600">
        Proposed backend endpoint for this page: <code>GET cashflow/accounting-readiness/</code> returning grouped queues by readiness status.
      </div>
    </section>
  );
};

export default AccountingReconciliationPage;