import { Navigate } from "react-router-dom";

export default function TransfersPage() {
  return <Navigate to="/personal/transactions/settled?kind=transfer" replace />;
}
