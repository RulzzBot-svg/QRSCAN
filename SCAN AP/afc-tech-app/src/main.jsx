// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HospitalCards from "./components/HospitalCards";
import AHU from "./components/AHU";
import FilterInfo from "./components/FilterInfo";
import AHUPage from "./components/AHUPage";
import jobCompleted from "./components/job-completed";
import "./index.css";
import QRScanner from "./components/QRScanner";

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

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
