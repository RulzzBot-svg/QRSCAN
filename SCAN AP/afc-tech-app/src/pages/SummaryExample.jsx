import React, { useState } from 'react';
import SignatureModal from '../components/SignatureModal';

export default function SummaryExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scheduleId = 'sample-schedule-1';

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-base-100 rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Supervisor Signature Demo
          </h1>
          <p className="text-base-content/70">
            This is a demonstration page for the supervisor signature modal component.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-base-100 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">About This Feature</h2>
          <div className="space-y-3 text-sm">
            <p>
              The Supervisor Signature Modal allows supervisors to review completed jobs
              and provide their digital signature to sign off on the work.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>View all completed jobs for a schedule</li>
              <li>Jobs are displayed as green cards with job details</li>
              <li>Enter supervisor name</li>
              <li>Draw signature using touch or mouse</li>
              <li>Submit sign-off to the backend</li>
            </ul>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="bg-base-100 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Try It Out</h2>
          <div className="space-y-4">
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="font-bold">Schedule ID</div>
                <div className="text-xs">Current schedule: <code className="bg-base-200 px-2 py-1 rounded">{scheduleId}</code></div>
              </div>
            </div>

            <button
              onClick={openModal}
              className="btn btn-primary btn-lg w-full"
            >
              Open Supervisor Signature Modal
            </button>

            <div className="divider">Additional Information</div>

            <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
              <div className="stat">
                <div className="stat-title">Demo Schedule</div>
                <div className="stat-value text-primary text-xl">{scheduleId}</div>
                <div className="stat-desc">Sample data from backend</div>
              </div>

              <div className="stat">
                <div className="stat-title">Feature Status</div>
                <div className="stat-value text-success text-xl">Active</div>
                <div className="stat-desc">Ready for testing</div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-base-100 rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code className="text-xs">GET /api/schedule/:id/summary</code></td>
                  <td><span className="badge badge-info">GET</span></td>
                  <td>Fetch jobs for schedule</td>
                </tr>
                <tr>
                  <td><code className="text-xs">POST /api/supervisor_sign</code></td>
                  <td><span className="badge badge-success">POST</span></td>
                  <td>Submit supervisor signature</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={closeModal}
        scheduleId={scheduleId}
      />
    </div>
  );
}
