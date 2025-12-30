import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";
import { queueJob } from "../../offline/jobQueue";

export default function JobSignature() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const sigRef = useRef(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Signature is required");
      return;
    }

    setSaving(true);

    const signature_data = sigRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png");

    const payload = {
      signature_data,
      signer_name: name,
      signer_role: role
    };

    try {
      if (!navigator.onLine) {
        await queueJob({
          type: "signature",
          job_id: Number(jobId),
          payload
        });
      } else {
        await axios.post(`/jobs/${jobId}/signature`, payload);
      }

      navigate("/job-completed");
    } catch (err) {
      console.error("Signature save failed:", err);
      await queueJob({
        type: "signature",
        job_id: Number(jobId),
        payload
      });
      navigate("/job-completed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-theme="corporate" className="min-h-screen bg-base-200 p-4">
      <div className="max-w-xl mx-auto bg-base-100 border border-base-300 rounded-xl shadow p-4">

        <h1 className="text-xl font-bold text-primary mb-3">
          Customer Signature
        </h1>

        <p className="text-sm text-base-content/70 mb-3">
          Please have the customer sign below to confirm job completion.
        </p>

        {/* Signature Pad */}
        <div className="border border-base-300 rounded mb-3 bg-white">
          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{
              className: "w-full h-48"
            }}
          />
        </div>

        <div className="flex justify-between mb-4">
          <button className="btn btn-xs btn-outline" onClick={clearSignature}>
            Clear
          </button>
        </div>

        {/* Signer Info */}
        <div className="space-y-3">
          <input
            className="input input-bordered w-full"
            placeholder="Signer Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="input input-bordered w-full"
            placeholder="Signer Role (e.g. Facilities Manager)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <button
            className="btn btn-outline w-1/2"
            onClick={() => navigate(-1)}
          >
            Back
          </button>

          <button
            className={`btn btn-primary w-1/2 ${saving ? "loading" : ""}`}
            onClick={handleSubmit}
            disabled={saving}
          >
            Confirm & Submit
          </button>
        </div>

      </div>
    </div>
  );
}
