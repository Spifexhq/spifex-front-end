import { Navigate, useSearchParams } from "react-router-dom";
import PersonalTransactionsWorkspace, { type Basis } from "../../components/PersonalTransactionsWorkspace";

export default function TransactionsPage({ basis = "outstanding" }: { basis?: Basis }) {
  const [params] = useSearchParams();
  const tab = params.get("tab");

  // Keep old ?tab=settled links working while the pages now live at dedicated routes.
  if (tab && tab !== basis) {
    const next = new URLSearchParams(params);
    next.delete("tab");
    const target = tab === "settled" ? "/personal/transactions/settled" : "/personal/transactions";
    const query = next.toString();
    return <Navigate to={query ? `${target}?${query}` : target} replace />;
  }

  return <PersonalTransactionsWorkspace key={basis} basis={basis} />;
}
