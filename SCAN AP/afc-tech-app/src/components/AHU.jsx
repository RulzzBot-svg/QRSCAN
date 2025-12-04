import { hospitals } from "../data/hospitals"
import { useNavigate } from "react-router-dom"

export default function HospitalList() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-base-200 p-4 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Select Hospital</h1>

      <div className="grid gap-4">
        {hospitals.map((hosp) => (
          <div
            key={hosp.id}
            className="card bg-base-100 shadow-sm border border-base-300"
          >
            <div className="card-body p-4">
              <h2 className="card-title text-base mb-2">{hosp.name}</h2>
              <button
                className="btn btn-primary btn-sm w-full"
                onClick={() => navigate(`/hospital/${hosp.id}/ahus`)}
              >
                View AHUs →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
