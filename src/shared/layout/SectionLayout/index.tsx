import { Suspense, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";

export default function SectionLayout({ sidebar, heading, children }: { sidebar: ReactNode; heading?: ReactNode; children?: ReactNode }) {
  return <>{sidebar}<div className="min-h-full min-w-0 bg-white text-[13px] text-gray-900">{heading}<Suspense fallback={<PageSkeleton />}>{children ?? <Outlet />}</Suspense></div></>;
}
