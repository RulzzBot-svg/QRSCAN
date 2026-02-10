import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {loginTech} from "../../api/tech"

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("");

  useEffect(() => {
    try {
      const post = sessionStorage.getItem("post_login_path");
      if (post) {
        setRedirectMessage("Please sign in to view the scanned AHU.");
      }
    } catch (e) {}
  }, []);

  const dismissRedirectMessage = () => {
    setRedirectMessage("");
    try {
      sessionStorage.removeItem("post_login_path");
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!navigator.onLine) {
        // Attempt offline login using stored offline cred
        const stored = localStorage.getItem("offline_tech");
        if (!stored) throw new Error("No offline credentials available");
        const offline = JSON.parse(stored);
        const pinHash = await digestPin(pin);
        if (offline.username === username && offline.pinHash === pinHash) {
          // restore tech session
          localStorage.setItem("tech", JSON.stringify({ id: offline.id, name: offline.name }));
          navigate("/Home");
          return;
        }
        throw new Error("Offline login failed");
      }

      const res = await loginTech(username, pin);

      // Save tech session
      localStorage.setItem(
        "tech",
        JSON.stringify({ id: res.data.id, name: res.data.name })
      );

      // Save offline credential (hashed PIN) so user can login when offline
      try {
        const pinHash = await digestPin(pin);
        localStorage.setItem(
          "offline_tech",
          JSON.stringify({ username, pinHash, id: res.data.id, name: res.data.name })
        );
      } catch (e) {
        console.warn("Failed to store offline credential:", e);
      }

      // Navigate to technician app
      const post = sessionStorage.getItem("post_login_path");
      if (post) {
        try {
          sessionStorage.removeItem("post_login_path");
        } catch {}
        window.location.assign(post);
      } else {
        navigate("/Home");
      }

    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // helper: hash PIN using SHA-256 and return hex
  async function digestPin(pin) {
    const enc = new TextEncoder();
    const data = enc.encode(pin);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return (
    <div
      data-theme="corporate"
      className="min-h-screen flex items-center justify-center bg-base-200"
    >
      <div className="w-full max-w-sm bg-base-100 border border-base-300 rounded-xl shadow-lg p-8">

        <h1 className="text-2xl font-bold text-primary text-center mb-6">
          Technician Login
        </h1>

        {redirectMessage && (
          <div className="mb-4 rounded-lg bg-info/20 border border-info p-3 text-sm text-info flex justify-between items-center">
            <div>{redirectMessage}</div>
            <button className="btn btn-ghost btn-sm" onClick={dismissRedirectMessage}>Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Username */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Technician name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* PIN */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">PIN</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-error text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className={`btn btn-primary w-full ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            Login
          </button>
        </form>

        <p className="text-xs text-base-content/60 text-center mt-6">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
