import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

const SectionCard: React.FC<Props> = ({ title, subtitle, children, right, className = "" }) => {
  return (
    <section className={`border border-gray-300 rounded-md bg-white px-3 py-3 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-gray-900">{title}</p>
          {subtitle ? <p className="mt-1 text-[11px] text-gray-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
};

export default SectionCard;
