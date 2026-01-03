import React from "react";

const PageLoader: React.FC<{ label?: string }> = ({ label = "Carregando…" }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] grid place-items-center">
      <div className="relative px-8 py-6 rounded-2xl border border-white/30 bg-white/50 backdrop-blur-xl shadow-md">
        <div className="mx-auto mb-3 h-9 w-9 rounded-full bg-white/60 grid place-items-center">
          <div className="h-4 w-4 rounded-full border-2 border-gray-800 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-800">{label}</p>
      </div>
    </div>
  );
};
export default PageLoader;
