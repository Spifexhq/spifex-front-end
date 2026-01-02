import React from "react";
import Shimmer from "./Shimmer";

const Line = ({ w = "w-40" }: { w?: string }) => <Shimmer className={`h-3 ${w}`} rounded="rounded-md" />;

const RowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <div className="min-w-0">
      <Line w="w-44" />
      <div className="mt-2"><Line w="w-64" /></div>
    </div>
    <div className="flex gap-2">
      <Shimmer className="h-8 w-20 rounded-md" />
      <Shimmer className="h-8 w-24 rounded-md" />
    </div>
  </div>
);

const PageSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-3">
          <Shimmer className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Line w="w-24" />
            <Line w="w-48" />
          </div>
        </div>
      </div>

      {/* List card */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <Line w="w-24" />
          <Shimmer className="h-8 w-28 rounded-md" />
        </div>
        {/* </div><div className="divide-y divide-gray-200"> */}
        <div className="flex flex-col">
          {Array.from({ length: rows }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </main>
);

export default PageSkeleton;
