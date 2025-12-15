import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";





export default function Hospitals() {
    const navigate = useNavigate();
    return (
        <>
        <AdminSidebar/>

        </>
    )
}