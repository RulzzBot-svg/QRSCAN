import React, { useEffect, useState } from 'react'

export default function HospitalJobsSummary({ hospitalId, defaultStart, defaultEnd }){
  const today = new Date()
  const defaultEndDate = defaultEnd || today.toISOString().slice(0,10)
  const defaultStartDate = defaultStart || new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState([])

  useEffect(()=>{
    if(!hospitalId) return
    async function load(){
      setLoading(true); setError(null)
      try{
        // Fetch AHUs to map ahu_id -> hospital_id and name
        const ahuRes = await fetch('/api/ahus')
        const ahuJson = ahuRes.ok ? await ahuRes.json() : []
        const ahuMap = new Map()
        for(const a of ahuJson){ ahuMap.set(String(a.id), { hospital_id: a.hospital_id, name: a.name }) }

        // Fetch jobs (backend may support filtering but fetch all to be safe)
        const jobsRes = await fetch('/api/jobs')
        if(!jobsRes.ok) throw new Error('Failed to fetch jobs')
        const jobs = await jobsRes.json()

        // Parse date range
        const s = new Date(startDate)
        s.setHours(0,0,0,0)
        const e = new Date(endDate)
        e.setHours(23,59,59,999)

        // Filter jobs for this hospital and date range
        const filtered = jobs.filter(j => {
          const ahuId = String(j.ahu_id)
          const meta = ahuMap.get(ahuId)
          if(!meta) return false
          if(String(meta.hospital_id) !== String(hospitalId)) return false
          const dt = new Date(j.completed_at)
          return dt >= s && dt <= e
        })

        // Group by AHU
        const groups = {}
        for(const j of filtered){
          const ahuId = String(j.ahu_id)
          const ahuName = (ahuMap.get(ahuId) && ahuMap.get(ahuId).name) || j.ahu_name || ahuId
          if(!groups[ahuId]) groups[ahuId] = { ahuId, ahuName, jobs: [] }
          groups[ahuId].jobs.push(j)
        }

        const out = Object.values(groups).map(g => {
          // sort jobs by completed_at desc
          g.jobs.sort((a,b)=> new Date(b.completed_at) - new Date(a.completed_at))
          return {
            ahuId: g.ahuId,
            ahuName: g.ahuName,
            count: g.jobs.length,
            latest: g.jobs[0] ? g.jobs[0].completed_at : null,
            jobs: g.jobs
          }
        }).sort((a,b)=> b.count - a.count)

        setSummary(out)
      }catch(err){
        console.error(err)
        setError(err.message || 'Failed to load')
      }finally{ setLoading(false) }
    }

    load()
  }, [hospitalId, startDate, endDate])

  if(!hospitalId) return <div className="p-4 bg-base-100 border rounded">Select a hospital to view completed work.</div>

  return (
    <div className="p-4 bg-base-100 border rounded">
      <div className="flex items-center gap-2 mb-3">
        <div>
          <label className="text-sm">From</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="input input-sm input-bordered" />
        </div>
        <div>
          <label className="text-sm">To</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="input input-sm input-bordered" />
        </div>
        <div className="ml-auto text-sm opacity-70">Showing {summary.reduce((acc,s)=>acc+s.count,0)} jobs across {summary.length} AHUs</div>
      </div>

      {loading ? (
        <div className="text-center py-6"><span className="loading loading-spinner"></span></div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : summary.length === 0 ? (
        <div className="text-sm opacity-70 py-4">No completed jobs for the selected range.</div>
      ) : (
        <div className="space-y-3">
          {summary.map(group => (
            <div key={group.ahuId} className="border rounded p-3 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{group.ahuName}</div>
                  <div className="text-xs opacity-60">Latest: {group.latest ? new Date(group.latest).toLocaleString() : '—'}</div>
                </div>
                <div className="text-sm badge badge-primary">{group.count} jobs</div>
              </div>

              <div className="mt-2 grid gap-2">
                {group.jobs.map(job => (
                  <div key={job.id} className="p-2 border rounded-sm bg-base-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Job #{job.id} — {job.technician || 'Unknown'}</div>
                      <div className="text-xs opacity-60">{new Date(job.completed_at).toLocaleString()}</div>
                    </div>
                    <div className="text-xs mt-1">
                      Filters: {job.filters ? job.filters.map(f=> `${f.phase}:${f.part_number}`).join(', ') : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
