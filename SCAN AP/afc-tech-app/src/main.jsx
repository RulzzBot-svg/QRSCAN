// main.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import App from "./App";
import HospitalCards from "./components/common/HospitalCards";
import AHU from "./components/common/AHU";
import FilterInfo from "./components/common/FilterInfo";
import AHUPage from "./components/common/AHUPage";
import BuildingsPage from "./components/common/BuildingsPage";
import jobCompleted from "./components/common/job-completed";
import "./index.css";
import QRScanner from "./components/common/QRScanner";
import AdminDashboard from "./components/admin/admin";
import Hospitals from "./components/admin/hospitals";
import AdminAHUs from "./components/admin/adminahus";
import AdminJobs from "./components/admin/adminjobs";
import AdminSignoffs from "./components/admin/AdminSignoffs";
import AdminLayout from "./components/admin/AdminLayout";
import Login from "./components/common/login";
import JobSignature from "./components/common/jobSignatures";
import SummaryExample from "./pages/SummaryExample";
import QrPrintExample from "./pages/QrPrintExample";
import TechSignoff from "./pages/TechSignoff";
import ClientApp from "./client/ClientApp";
import ClientLogin from "./client/ClientLogin";
import ClientHome from "./client/ClientHome";
import ClientScan from "./client/ClientScan";
import ClientUnits from "./client/ClientUnits";
import ClientAhu from "./client/ClientAhu";
import ClientGraphs from "./client/ClientGraphs";
import ClientContact from "./client/ClientContact";
import ClientHelp from "./client/ClientHelp";
import ClientDocs from "./client/ClientDocs";
import { applyPwaManifest } from "./client/pwa";
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

function PwaManifest() {
  const location = useLocation();
  useEffect(() => {
    applyPwaManifest(location.pathname);
  }, [location.pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <PwaManifest />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Home" element={<App />} />
        <Route path="/hospitals" element={<HospitalCards />} />
        <Route path="/buildings/:hospitalId" element={<BuildingsPage />} />
        <Route path="/AHU" element={<AHU />} />
        <Route path="/AHU/:hospitalId" element={<AHUPage />} />
        <Route path="/AHU/:hospitalId/building/:buildingId" element={<AHUPage />} />
        <Route path="/FilterInfo/:ahuId" element={<FilterInfo />} />
        <Route path="/job-completed" element={<jobCompleted />} />
        <Route path="/scan" element={<QRScanner />} />
        <Route path="/jobs/:jobId/signature" element={<JobSignature />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="hospitals" element={<Hospitals />} />
          <Route path="ahus" element={<AdminAHUs />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="signoffs" element={<AdminSignoffs />} />
        </Route>

        {import.meta.env.DEV ? (
          <>
            <Route path="/dev/summary" element={<SummaryExample />} />
            <Route path="/dev/qr-print" element={<QrPrintExample />} />
          </>
        ) : null}

        <Route path="/tech/signoff" element={<TechSignoff />} />

        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client" element={<ClientApp />}>
          <Route index element={<ClientHome />} />
          <Route path="scan" element={<ClientScan />} />
          <Route path="units" element={<ClientUnits />} />
          <Route path="ahu/:ahuId" element={<ClientAhu />} />
          <Route path="graphs" element={<ClientGraphs />} />
          <Route path="contact" element={<ClientContact />} />
          <Route path="help" element={<ClientHelp />} />
          <Route path="datasheet" element={<Navigate to="/client" replace />} />
          <Route path="docs" element={<ClientDocs />} />
        </Route>



      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
