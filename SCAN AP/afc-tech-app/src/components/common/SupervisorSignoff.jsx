import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '../../api/api'

export default function SupervisorSignoff({ open, onClose, hospitals = [], ahus = [], initialHospitalId = null }){
	const canvasRef = useRef(null)
	const [isDrawing, setIsDrawing] = useState(false)
	const [supervisorName, setSupervisorName] = useState('')
	const [date, setDate] = useState(new Date().toISOString().slice(0,10))
	const [summary, setSummary] = useState('')
	const [hospitalId, setHospitalId] = useState(initialHospitalId || (hospitals.length ? hospitals[0].id : ''))
	const [jobIds, setJobIds] = useState('')
	const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10))
	const [endDate, setEndDate] = useState(new Date().toISOString().slice(0,10))
	const [summaryJobs, setSummaryJobs] = useState([])
	const navigate = useNavigate()

	useEffect(()=>{
		if(!hospitals.length) return
		if(initialHospitalId) {
			setHospitalId(initialHospitalId)
			return
		}
		if(!hospitalId) setHospitalId(hospitals[0].id)
	},[hospitals, initialHospitalId])

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
		if(!c) return
		const ctx = c.getContext('2d')
		ctx.clearRect(0,0,c.width,c.height)
	}

	async function submit(){
		const canvas = canvasRef.current
		const dataUrl = canvas ? canvas.toDataURL('image/png') : null
		if(!hospitalId || !supervisorName){
			alert('Hospital and supervisor name required')
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
			const res = await API.post('/admin/supervisor-signoff', payload)
			if(res.status === 200 || res.status === 201){
				alert('Supervisor signoff saved')
				handleClose()
			} else {
				alert('Error saving signoff')
			}
		}catch(e){
			console.error(e)
			alert('Network error')
		}
	}

	async function loadSummary(){
		try{
			const res = await API.get('/jobs')
			const jobs = Array.isArray(res.data) ? res.data : []

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

	function handleClose(){
		if(initialHospitalId){
			navigate(`/AHU/${initialHospitalId}`)
			return
		}
		onClose && onClose()
	}

	if(!open) return null
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-base-200/60 backdrop-blur-sm" onClick={handleClose} />
			<div className="relative bg-base-100 rounded-lg shadow-lg w-11/12 max-w-2xl p-4">
				<h3 className="text-lg font-bold mb-2">Supervisor Sign-off</h3>
				<div className="grid grid-cols-2 gap-2">
					<div>
						<label className="block text-sm">Hospital</label>
						<div className="dropdown w-full">
							<button tabIndex={0} className="btn btn-outline w-full justify-start">
								{hospitals && hospitals.length
									? (hospitals.find(h => String(h.id) === String(hospitalId)) || hospitals[0]).name
									: 'Loading hospitals...'}
							</button>
							<ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full mt-2">
								{hospitals && hospitals.length ? (
									hospitals.map(h => (
										<li key={h.id}>
											<button className="w-full text-left" onClick={() => setHospitalId(h.id)}>{h.name}</button>
										</li>
									))
								) : (
									<li className="text-sm opacity-60 px-2 py-1">No hospitals available</li>
								)}
							</ul>
						</div>
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
									<div key={j.id} className="text-sm py-1 border-b last:border-b-0 bg-green-50">
										<div className="font-semibold">{j.ahu_id} — Job #{j.id}</div>
										<div className="text-xs opacity-70">{new Date(j.completed_at).toLocaleString()}</div>
									</div>
								))
							)}
						</div>
					</div>
					<div className="col-span-2">
						<label className="block text-sm">Signature</label>
						<div className="border rounded p-2 mt-2">
							<canvas ref={canvasRef} width={600} height={140} className="w-full h-28 bg-white" onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
						</div>
						<div className="mt-2 flex gap-2">
							<button className="btn btn-sm" onClick={clear}>Clear</button>
							<button className="btn btn-sm btn-primary" onClick={submit}>Submit</button>
							<button className="btn btn-sm" onClick={handleClose}>Cancel</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

