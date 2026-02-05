import React, { useRef, useState, useEffect } from 'react'

export default function SupervisorSignoff({ open, onClose, hospitals = [], ahus = [], scheduleId = null }){
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
  const [scheduleData, setScheduleData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if(hospitals.length && !hospitalId) setHospitalId(hospitals[0].id)
  },[hospitals])

  // Load schedule data if scheduleId is provided
  useEffect(()=>{
    if(scheduleId && open) {
      loadSchedule(scheduleId)
    }
  },[scheduleId, open])

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

  async function loadSchedule(schedId){
    try{
      setLoading(true)
      const params = new URLSearchParams()
      if(startDate) params.append('start_date', startDate)
      if(endDate) params.append('end_date', endDate)
      
      const res = await fetch(`/api/schedule/${schedId}?${params}`)
      if(!res.ok) throw new Error('Failed to fetch schedule')
      
      const data = await res.json()
      setScheduleData(data)
      
      // Pre-populate form with schedule data
      if(data.hospital_id) setHospitalId(data.hospital_id)
      if(data.jobs) {
        setSummaryJobs(data.jobs)
        setJobIds(data.jobs.map(j=>j.job_id).join(','))
        
        // Auto-generate summary
        const autoSummary = `${data.hospital_name}\n${data.total_jobs} jobs completed\n${data.unique_ahus_serviced} AHUs serviced\n${data.total_filters_serviced} filters serviced\nPeriod: ${data.start_date} to ${data.end_date}`
        setSummary(autoSummary)
      }
    }catch(err){
      console.error('Failed to load schedule', err)
      alert('Failed to load schedule data')
    }finally{
      setLoading(false)
    }
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
    // If scheduleId is provided, use the schedule endpoint instead
    if(scheduleId){
      await loadSchedule(scheduleId)
      return
    }
    
    try{
      setLoading(true)
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
    }finally{
      setLoading(false)
    }
  }

  if(!open) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">✍️</span>
            Supervisor Sign-off
          </h3>
          <p className="text-blue-100 text-sm mt-1">Complete and authorize work for the selected period</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Hospital & Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">🏥 Hospital</span>
              </label>
              <select 
                className="select select-bordered w-full focus:border-blue-500 transition-colors" 
                value={hospitalId} 
                onChange={e=>setHospitalId(e.target.value)}
              >
                {hospitals.map(h=> <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📅 Sign-off Date</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full focus:border-blue-500 transition-colors" 
                value={date} 
                onChange={e=>setDate(e.target.value)} 
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📆 Period From</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full focus:border-blue-500 transition-colors" 
                value={startDate} 
                onChange={e=>setStartDate(e.target.value)} 
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">📆 Period To</span>
              </label>
              <input 
                type="date" 
                className="input input-bordered w-full focus:border-blue-500 transition-colors" 
                value={endDate} 
                onChange={e=>setEndDate(e.target.value)} 
              />
            </div>
          </div>

          {/* Supervisor Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">👤 Supervisor Name *</span>
            </label>
            <input 
              className="input input-bordered w-full focus:border-blue-500 transition-colors" 
              placeholder="Enter supervisor name"
              value={supervisorName} 
              onChange={e=>setSupervisorName(e.target.value)} 
            />
          </div>

          {/* Summary */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">📝 Summary (Optional)</span>
            </label>
            <textarea 
              className="textarea textarea-bordered w-full h-24 focus:border-blue-500 transition-colors" 
              placeholder="Enter a summary of the work completed..."
              value={summary} 
              onChange={e=>setSummary(e.target.value)} 
            />
          </div>

          {/* Job IDs */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">🔢 Related Job IDs (comma-separated)</span>
            </label>
            <input 
              className="input input-bordered w-full focus:border-blue-500 transition-colors" 
              placeholder="e.g., 123,124,125"
              value={jobIds} 
              onChange={e=>setJobIds(e.target.value)} 
            />
          </div>

          {/* Load Summary Section */}
          <div className="card bg-base-200 border border-gray-300 shadow-sm">
            <div className="card-body p-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={loadSummary} 
                  type="button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Loading...
                    </>
                  ) : (
                    <>📊 Load Completed Work</>
                  )}
                </button>
                {scheduleData && (
                  <div className="badge badge-info gap-2">
                    📋 Schedule #{scheduleData.schedule_id}
                  </div>
                )}
                <div className="text-sm font-medium text-gray-700">
                  {summaryJobs.length > 0 && (
                    <>
                      <span className="text-blue-600">{summaryJobs.length}</span> jobs, 
                      <span className="text-green-600 ml-1">{new Set(summaryJobs.map(j=>j.ahu_id)).size}</span> AHUs
                    </>
                  )}
                </div>
              </div>
              
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-white">
                {summaryJobs.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    📭 No jobs loaded yet. Click "Load Completed Work" to fetch jobs.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summaryJobs.map(j => (
                      <div key={j.id || j.job_id} className="p-2 border-b last:border-b-0 hover:bg-gray-50 transition-colors rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800">
                              {j.ahu_id} {j.ahu_name && `— ${j.ahu_name}`}
                            </div>
                            <div className="text-xs text-gray-600">
                              Job #{j.id || j.job_id} • {new Date(j.completed_at).toLocaleString()}
                            </div>
                          </div>
                          {j.technician && (
                            <div className="badge badge-sm badge-ghost">{j.technician}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Signature Canvas */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">✍️ Signature *</span>
              <span className="label-text-alt text-gray-500">Sign in the box below</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white hover:border-blue-400 transition-colors">
              <canvas 
                ref={canvasRef} 
                width={700} 
                height={200} 
                className="w-full cursor-crosshair touch-none" 
                onMouseDown={start} 
                onMouseMove={draw} 
                onMouseUp={end} 
                onMouseLeave={end} 
                onTouchStart={start} 
                onTouchMove={draw} 
                onTouchEnd={end} 
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <button className="btn btn-outline btn-sm" onClick={clear}>
              🗑️ Clear Signature
            </button>
            <div className="flex-1"></div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              ❌ Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={submit}>
              ✅ Submit Sign-off
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
