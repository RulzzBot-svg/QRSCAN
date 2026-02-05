import React, { useRef, useState, useEffect } from 'react'

export default function SupervisorSignoff({ open, onClose, hospitals = [], ahus = [] }){
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [supervisorName, setSupervisorName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [summary, setSummary] = useState('')
  const [hospitalId, setHospitalId] = useState(hospitals.length ? hospitals[0].id : '')
  const [jobIds, setJobIds] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0,10))
  const [summaryJobs, setSummaryJobs] = useState([])

  useEffect(()=>{
    if(hospitals.length && !hospitalId) setHospitalId(hospitals[0].id)
  },[hospitals])

  useEffect(()=>{
    if(!open) return
    const canvas = canvasRef.current
    if(!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
  },[open])

  function getPos(e){
    const rect = canvasRef.current.getBoundingClientRect()
    if(e.touches && e.touches[0]){
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e){
    setIsDrawing(true)
    const p = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  function draw(e){
    if(!isDrawing) return
    e.preventDefault()
    const p = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }
  function end(){
    setIsDrawing(false)
  }
  function clear(){
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.clearRect(0,0,c.width,c.height)
  }

  async function submit(){
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    if(!hospitalId || !supervisorName || !dataUrl){
      alert('Hospital, supervisor name and signature required')
      return
    }
    const payload = {
      hospital_id: hospitalId,
      date: date,
      supervisor_name: supervisorName,
      summary: summary,
      signature_data: dataUrl,
      job_ids: jobIds
    }
    try{
      const res = await fetch('/api/admin/supervisor-signoff',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if(res.ok){
        alert('Supervisor signoff saved')
        onClose()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || res.statusText))
      }
    }catch(e){
      alert('Network error')
    }
  }

  async function loadSummary(){
    try{
      const res = await fetch('/api/admin/jobs')
      if(!res.ok) throw new Error('Failed to fetch jobs')
      const jobs = await res.json()

      // build a map of ahu_id -> hospital_id from passed `ahus`
      const ahuMap = new Map()
      for(const a of ahus) ahuMap.set(String(a.id), a.hospital_id)

      const s = new Date(startDate)
      const e = new Date(endDate)
      e.setHours(23,59,59,999)

      const filtered = jobs.filter(j => {
        const jobAhu = String(j.ahu_id)
        const hospId = ahuMap.get(jobAhu)
        if(String(hospId) !== String(hospitalId)) return false
        const dt = new Date(j.completed_at)
        return dt >= s && dt <= e
      })

      setSummaryJobs(filtered)
      setJobIds(filtered.map(j=>j.id).join(','))
    }catch(err){
      console.error('Failed to load summary', err)
      alert('Failed to load completed work')
    }
  }

  if(!open) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded shadow-lg w-11/12 max-w-2xl p-4">
        <h3 className="text-lg font-bold mb-2">Supervisor Sign-off</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm">Hospital</label>
            <select className="input input-bordered w-full" value={hospitalId} onChange={e=>setHospitalId(e.target.value)}>
              {hospitals.map(h=> <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Sign Date</label>
            <input type="date" className="input input-bordered w-full" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">From</label>
            <input type="date" className="input input-bordered w-full" value={startDate} onChange={e=>setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">To</label>
            <input type="date" className="input input-bordered w-full" value={endDate} onChange={e=>setEndDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm">Supervisor Name</label>
            <input className="input input-bordered w-full" value={supervisorName} onChange={e=>setSupervisorName(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm">Summary (optional)</label>
            <textarea className="textarea textarea-bordered w-full" value={summary} onChange={e=>setSummary(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm">Related Job IDs (comma-separated)</label>
            <input className="input input-bordered w-full" value={jobIds} onChange={e=>setJobIds(e.target.value)} />
          </div>
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <button className="btn btn-sm" onClick={loadSummary} type="button">Load Completed Work</button>
              <div className="text-sm opacity-70">Loaded: {summaryJobs.length} jobs, {new Set(summaryJobs.map(j=>j.ahu_id)).size} AHUs</div>
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 bg-base-100">
              {summaryJobs.length === 0 ? (
                <div className="text-xs opacity-60">No jobs loaded for the selected range.</div>
              ) : (
                summaryJobs.map(j => (
                  <div key={j.id} className="text-sm py-1 border-b last:border-b-0">
                    <div className="font-semibold">{j.ahu_id} — Job #{j.id}</div>
                    <div className="text-xs opacity-70">{new Date(j.completed_at).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm">Signature</label>
            <canvas ref={canvasRef} width={700} height={200} className="border" onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
            <div className="mt-2 flex gap-2">
              <button className="btn btn-sm" onClick={clear}>Clear</button>
              <button className="btn btn-sm btn-primary" onClick={submit}>Submit</button>
              <button className="btn btn-sm" onClick={onClose}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
