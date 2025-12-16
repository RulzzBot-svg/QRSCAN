// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HospitalCards from "./components/common/HospitalCards";
import AHU from "./components/common/AHU";
import FilterInfo from "./components/common/FilterInfo";
import AHUPage from "./components/common/AHUPage";
import jobCompleted from "./components/common/job-completed";
import "./index.css";
import QRScanner from "./components/common/QRScanner";
import AdminDashboard from "./components/admin/admin";
import Hospitals from "./components/admin/hospitals";
import AdminAHUs from "./components/admin/adminahus";
import AdminJobs from "./components/admin/adminjobs";




ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/hospitals" element={<HospitalCards />} />
        <Route path="/AHU" element={<AHU />} />
        <Route path="/AHU/:hospitalId" element={<AHUPage/>}/>
        <Route path="FilterInfo/:ahuId" element={<FilterInfo/>}/>
        <Route path="/job-completed" element={<jobCompleted/>}/>
        <Route path="/scan" element={<QRScanner/>}/>
        <Route path="/admin" element={<AdminDashboard/>}/>
        <Route path="/admin/hospitals" element={<Hospitals/>}/>
        <Route path="/admin/ahus" element={<AdminAHUs/>}/>
        <Route path="/admin/jobs" element={<AdminJobs/>}/>


      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
