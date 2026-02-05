import React, { useEffect, useState } from 'react';

/*
Props:
- scheduleId: id of the scheduled changeout to load summary for
- onClose: callback when modal is closed
- onSigned: callback on successful signature (passes recorded data)
*/
export default function SignatureModal({ scheduleId, onClose, onSigned }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]); // array of job summaries { id, ahuName, status, filter, notes }
  const [supervisorName, setSupervisorName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scheduleId) return;
    setLoading(true);
    fetch(`/api/schedule/${encodeURIComponent(scheduleId)}/summary`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch summary');
        return res.json();
      })
      .then(data => setJobs(data.jobs || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  const handleSign = async () => {
    if (!supervisorName.trim()) {
      setError('Please enter supervisor name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        schedule_id: scheduleId,
        supervisor_name: supervisorName.trim(),
        jobs: jobs.map(j => ({ id: j.id, ahuName: j.ahuName, status: j.status, filter: j.filter })),
        signed_at: new Date().toISOString()
      };
      const res = await fetch('/api/supervisor_sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save signature');
      }
      const body = await res.json();
      onSigned && onSigned(body);
      onClose && onClose();
    } catch (e) {
      setError(e.message || 'Error saving signature');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="signature-modal-overlay" style={overlayStyle}>
      <div className="signature-modal" style={modalStyle} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Supervisor Sign-off</h2>
          <button aria-label="Close" onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <p style={{ marginTop: 0 }}>Review the completed AHUs and enter your name to sign:</p>
          {loading ? (
            <p>Loading summary…</p>
          ) : error ? (
            <div style={{ color: 'crimson' }}>{error}</div>
          ) : (
            <div style={cardsGridStyle}>
              {jobs.map(job => (
                <div key={job.id} style={greenCardStyle}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{job.ahuName}</div>
                  <div style={{ marginTop: 6 }}>
                    <div><strong>Status:</strong> {job.status}</div>
                    <div><strong>Filter:</strong> {job.filter || '—'}</div>
                    {job.notes ? <div style={{ marginTop: 6 }}>{job.notes}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 600 }}>Supervisor name</label>
          <input
            value={supervisorName}
            onChange={e => setSupervisorName(e.target.value)}
            placeholder="Type name here..."
            style={inputStyle}
            disabled={saving}
          />
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={saving} style={secondaryButtonStyle}>Cancel</button>
          <button onClick={handleSign} disabled={saving || loading} style={primaryButtonStyle}>
            {saving ? 'Saving…' : 'Sign & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Inline styles included for quick drop-in. Replace with your CSS or Tailwind classes. */
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const modalStyle = {
  width: '90%', maxWidth: 900, background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
};
const closeButtonStyle = { border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' };
const cardsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginTop: 8 };
const greenCardStyle = { background: '#e9f7ef', border: '1px solid #c3e6cb', borderRadius: 8, padding: 12, minHeight: 80 };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', marginTop: 8 };
const primaryButtonStyle = { background: '#2f9e44', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' };
const secondaryButtonStyle = { background: '#f0f0f0', color: '#333', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' };
