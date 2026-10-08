import { Navigate } from "react-router-dom";

export default function ClientDatasheet() {
  return <Navigate to="/client/docs?tab=datasheet" replace />;
}
