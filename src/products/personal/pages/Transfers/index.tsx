import { Navigate } from "react-router-dom";

export default function TransfersPage() {
  return <Navigate to="/p/transactions/settled?kind=transfer" replace />;
}
