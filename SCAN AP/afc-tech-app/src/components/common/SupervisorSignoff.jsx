import React, { useRef, useState, useEffect } from 'react'

export default function SupervisorSignoff({ open, onClose, hospitals = [] }){
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [supervisorName, setSupervisorName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [summary, setSummary] = useState('')
  const [hospitalId, setHospitalId] = useState(hospitals.length ? hospitals[0].id : '')
  const [jobIds, setJobIds] = useState('')

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
            <label className="block text-sm">Date</label>
            <input type="date" className="input input-bordered w-full" value={date} onChange={e=>setDate(e.target.value)} />
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
