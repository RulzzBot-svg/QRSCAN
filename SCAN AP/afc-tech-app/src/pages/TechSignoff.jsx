import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SupervisorSignoff from '../components/common/SupervisorSignoff'

export default function TechSignoff(){
  const [open, setOpen] = useState(true)
  const [hospitals, setHospitals] = useState([])
  const [ahus, setAhus] = useState([])
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const initialHospitalId = params.get('h') || null

  useEffect(()=>{
    async function load(){
      try{
        const h = await fetch('/api/admin/hospitals')
        const ah = await fetch('/api/admin/ahus')
        const hospitalsJson = h.ok ? await h.json() : []
        const ahusJson = ah.ok ? await ah.json() : []
        setHospitals(hospitalsJson)
        setAhus(ahusJson)
      }catch(e){ console.error('Failed to load hospitals/ahus', e) }
    }
    load()
  },[])

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Technician Sign-off</h2>
      <p className="text-sm opacity-70 mb-4">This page is for technicians to submit supervisor sign-offs without accessing the admin dashboard.</p>

      <div data-theme="corporate">
        <SupervisorSignoff
          initialHospitalId={initialHospitalId}
          open={open}
          onClose={() => {
            setOpen(false);
            if (initialHospitalId) {
              navigate(`/AHU/${initialHospitalId}`);
            } else {
              navigate(-1);
            }
          }}
          hospitals={hospitals}
          ahus={ahus}
        />
      </div>
    </div>
  )
}
