import { Suspense, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { PageSkeletonShell } from "@/shared/ui/Loaders/PageSkeleton";

export default function SectionLayout({ sidebar, heading, children, fallback }: { sidebar: ReactNode; heading?: ReactNode; children?: ReactNode; fallback?: ReactNode }) {
  return <>{sidebar}<div className="min-h-full min-w-0 bg-white text-[13px] text-gray-900">{heading}<Suspense fallback={fallback ?? <PageSkeletonShell />}>{children ?? <Outlet />}</Suspense></div></>;
}
