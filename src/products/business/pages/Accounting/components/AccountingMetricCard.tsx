import MetricCard from "@/shared/ui/MetricCard";

/**
 * Accounting keeps its historical module path while sharing the canonical
 * Business metric tile.
 */
export default function AccountingMetricCard(props: Parameters<typeof MetricCard>[0]) {
  return <MetricCard {...props} />;
}
