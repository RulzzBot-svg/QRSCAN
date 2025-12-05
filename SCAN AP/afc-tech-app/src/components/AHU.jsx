import React from "react";
import { useNavigate } from "react-router-dom";


function AHU() {
    const navigate = useNavigate();
    return (

        <div class="bg-neutral-primary-soft block max-w-sm p-6 border border-default rounded-base shadow-xs">
            <h5 class="mb-3 text-2xl font-semibold tracking-tight text-heading leading-8">AHU</h5>
            <p class="text-body mb-6">Here are the biggest technology acquisitions of 2025 so far, in reverse chronological order.</p>
            <button className="btn btn-outline w-full"  onClick={()=>navigate("/FilterInfo")}>Load filter information</button>
            <button className="btn btn-outline w-full"  onClick={()=>navigate("/hospitals")}>Back</button>

        </div>

    );
}

export default AHU;
