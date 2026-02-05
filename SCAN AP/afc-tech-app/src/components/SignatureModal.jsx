import React, { useEffect, useRef, useState } from 'react';

function useCanvas(width = 400, height = 150) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setIsDrawing(true);
    setPaths(p => [...p, [{ x, y }]]);
  }
  function move(e) {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setPaths(p => {
      const next = [...p];
      next[next.length - 1] = [...next[next.length - 1], { x, y }];
      return next;
    });
  }
  function end() { setIsDrawing(false); }
  function clear() { setPaths([]); const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
  function undo() { setPaths(p => p.slice(0, -1)); }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(2, 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const path of paths) {
      if (!path || path.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  useEffect(() => { redraw(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [paths]);

  function toDataUrl(type = 'image/png') {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL(type);
  }

  return { canvasRef, start, move, end, clear, undo, toDataUrl, paths };
}

export default function SignatureModal({ scheduleId, onClose, onSigned }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [supervisorName, setSupervisorName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { canvasRef, start, move, end, clear, undo, toDataUrl, paths } = useCanvas(480, 160);

  useEffect(() => {
    if (!scheduleId) return;
    setLoading(true);
    fetch(`/api/schedule/${encodeURIComponent(scheduleId)}/summary`)
      .then(res => { if (!res.ok) throw new Error('Failed to fetch summary'); return res.json(); })
      .then(data => setJobs(data.jobs || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  const handleSign = async () => {
    if (!supervisorName.trim()) { setError('Please enter supervisor name'); return; }
    setSaving(true); setError(null);
    try {
      const signatureImage = paths.length ? toDataUrl('image/png') : null;
      const payload = {
        schedule_id: scheduleId,
        supervisor_name: supervisorName.trim(),
        jobs: jobs.map(j => ({ id: j.id, ahuName: j.ahuName, status: j.status, filter: j.filter })),
        signed_at: new Date().toISOString(),
        signature_image: signatureImage
      };
      const res = await fetch('/api/supervisor_sign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) { const text = await res.text(); throw new Error(text || 'Failed to save signature'); }
      const body = await res.json();
      onSigned && onSigned(body);
      onClose && onClose();
      clear();
      setSupervisorName('');
    } catch (e) { setError(e.message || 'Error saving signature'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: '95%', maxWidth: 980, background: '#fff', borderRadius: 10, padding: 18, maxHeight: '90vh', overflowY: 'auto' }} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Supervisor Sign-off</h2>
          <button aria-label="Close" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <p style={{ marginTop: 8 }}>Review the completed AHUs and enter your name to sign. Optionally draw your signature below.</p>

        {loading ? <p>Loading summary…</p> : error ? <div style={{ color: 'crimson' }}>{error}</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
            {jobs.map(job => (
              <div key={job.id} style={{ background: '#e9f7ef', border: '1px solid #c3e6cb', borderRadius: 8, padding: 12, minHeight: 80 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{job.ahuName}</div>
                <div style={{ marginTop: 6 }}>
                  <div><strong>Status:</strong> {job.status}</div>
                  <div><strong>Filter:</strong> {job.filter || '—'}</div>
                  {job.notes ? <div style={{ marginTop: 6 }}>{job.notes}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 600 }}>Supervisor name</label>
          <input value={supervisorName} onChange={e => setSupervisorName(e.target.value)} placeholder="Type name here..." style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', marginTop: 8 }} disabled={saving} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 600 }}>Signature (optional)</label>
          <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, marginTop: 8 }}>
            <canvas
              ref={canvasRef}
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
              style={{ width: '100%', height: 160, background: '#fff', touchAction: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => clear()} style={{ padding: '6px 10px', borderRadius: 6 }}>Clear</button>
              <button type="button" onClick={() => undo()} style={{ padding: '6px 10px', borderRadius: 6 }}>Undo</button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving} style={{ background: '#f0f0f0', color: '#333', border: 'none', padding: '8px 14px', borderRadius: 6 }}>Cancel</button>
          <button onClick={handleSign} disabled={saving || loading} style={{ background: '#2f9e44', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6 }}>{saving ? 'Saving…' : 'Sign & Complete'}</button>
        </div>
      </div>
    </div>
  );
}
