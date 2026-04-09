// src\pages\LedgerAccountSettings\components\LedgerSummaryCards.tsx
import React from 'react';

type Card = {
  title: string;
  value: string | number;
  subtitle: string;
};

type Props = {
  items: Card[];
};

const LedgerSummaryCards: React.FC<Props> = ({ items }) => {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.title}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-gray-700">{item.title}</div>
          </div>
          <div className="px-4 py-4">
            <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
            <p className="mt-1 text-sm text-gray-600">{item.subtitle}</p>
          </div>
        </article>
      ))}
    </section>
  );
};

export default LedgerSummaryCards;
