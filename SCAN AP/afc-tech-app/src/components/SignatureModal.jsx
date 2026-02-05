import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { API } from '../api/api';

export default function SignatureModal({ isOpen, onClose, scheduleId }) {
  const sigRef = useRef(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Fetch schedule summary when modal opens
  useEffect(() => {
    if (isOpen && scheduleId) {
      fetchScheduleSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scheduleId]);

  const fetchScheduleSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get(`/schedule/${scheduleId}/summary`);
      setJobs(response.data.jobs || []);
    } catch (err) {
      console.error('Error fetching schedule summary:', err);
      setError('Failed to load schedule summary');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  const handleSubmit = async () => {
    // Clear previous validation errors
    setValidationError(null);
    
    // Validation
    if (!supervisorName.trim()) {
      setValidationError('Please enter supervisor name');
      return;
    }

    if (!sigRef.current || sigRef.current.isEmpty()) {
      setValidationError('Please provide a signature');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const signature_image = sigRef.current
        .getTrimmedCanvas()
        .toDataURL('image/png');

      const payload = {
        schedule_id: scheduleId,
        supervisor_name: supervisorName,
        jobs: jobs.map(job => job.id),
        signed_at: new Date().toISOString(),
        signature_image: signature_image
      };

      await API.post('/supervisor_sign', payload);
      
      // Success - close modal and reset form
      onClose();
      setSupervisorName('');
      clearSignature();
      setValidationError(null);
    } catch (err) {
      console.error('Error submitting signature:', err);
      setError(err.response?.data?.error || 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Supervisor Sign-off
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {validationError && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              {validationError}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading schedule summary...</p>
            </div>
          ) : (
            <>
              {/* Jobs Display */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  Completed Jobs ({jobs.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {jobs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No jobs found for this schedule</p>
                  ) : (
                    jobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 bg-green-100 border border-green-300 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {job.ahu_name} (#{job.ahu_id})
                            </p>
                            <p className="text-sm text-gray-600">
                              Technician: {job.technician}
                            </p>
                            <p className="text-xs text-gray-500">
                              Completed: {new Date(job.completed_at).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                            Job #{job.id}
                          </span>
                        </div>
                        {job.filters && job.filters.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-semibold">Filters: </span>
                            {job.filters.map((f, idx) => (
                              <span key={idx}>
                                {f.phase} ({f.size})
                                {idx < job.filters.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Supervisor Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="Enter your full name"
                  className="input input-bordered w-full"
                  disabled={submitting}
                />
              </div>

              {/* Signature Canvas */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-gray-300 rounded bg-white">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="black"
                    canvasProps={{
                      className: "w-full h-40 cursor-crosshair"
                    }}
                  />
                </div>
                <button
                  onClick={clearSignature}
                  className="btn btn-sm btn-outline mt-2"
                  disabled={submitting}
                >
                  Clear Signature
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className={`btn btn-primary ${submitting ? 'loading' : ''}`}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Sign-off'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
