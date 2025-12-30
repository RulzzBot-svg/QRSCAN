import React from "react";
import { useNavigate } from "react-router-dom";



export default function jobCompleted() {
    const navigate = useNavigate();

    return (
        <>
            <div data-theme="corporate" className="min-h-screen bg-base-200 flex items-center justify-center p-4">
                <div className="card bg-base-100 shadow-xl p-6 w-full max-w-md text-center border border-base-300">

                    <h2 className="text-3xl font-bold text-primary mb-3">🎉 Job Completed!</h2>

                    <p className="text-base-content/70 mb-6">
                        Your filter checklist has been successfully submitted.
                    </p>

                    <div className="divider"></div>

                    <button
                        className="btn btn-primary w-full mb-3"
                        onClick={() => navigate("/hospitals")}
                    >
                        Back to Hospitals
                    </button>

                    <button
                        className="btn btn-outline w-full"
                        onClick={() => navigate("/Home")}
                    >
                        Return Home
                    </button>

                </div>
            </div>
        </>
    )

}