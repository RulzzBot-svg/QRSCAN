// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HospitalCards from "./components/HospitalCards";
import AHU from "./components/AHU";
import FilterInfo from "./components/FilterInfo";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/hospitals" element={<HospitalCards />} />
        <Route path="/AHU" element={<AHU />} />
        <Route path="FilterInfo" element={<FilterInfo/>}/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
