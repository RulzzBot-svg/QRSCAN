import React, { useState } from 'react';
import SignatureModal from '../components/SignatureModal';

export default function SummaryExample() {
  const [open, setOpen] = useState(false);
  const scheduleId = 'sample-schedule-1';
  return (
    <div style={{ padding: 20 }}>
      <h1>Summary Example</h1>
      <p>Click the button to open the supervisor sign-off modal (demo).</p>
      <button onClick={() => setOpen(true)} style={{ padding: '8px 12px', background: '#2f9e44', color: '#fff', borderRadius: 6 }}>Open Supervisor Sign-Off</button>
      {open && <SignatureModal scheduleId={scheduleId} onClose={() => setOpen(false)} onSigned={(body) => { alert('Signed! ID: ' + (body.record?.id || 'unknown')); }} />}
    </div>
  );
}
