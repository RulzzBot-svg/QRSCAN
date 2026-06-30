import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginTech } from "../../api/tech";

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
    } catch (e) {
      /* ignore */
    }
  }, []);

  const dismissRedirectMessage = () => {
    setRedirectMessage("");
    try {
      sessionStorage.removeItem("post_login_path");
    } catch (e) {
      /* ignore */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!navigator.onLine) {
        const stored = localStorage.getItem("offline_tech");
        if (!stored) throw new Error("No offline credentials available");
        const offline = JSON.parse(stored);
        const pinHash = await digestPin(pin);
        if (offline.username === username && offline.pinHash === pinHash) {
          localStorage.setItem(
            "tech",
            JSON.stringify({
              id: offline.id,
              name: offline.name,
              role: offline.role || "technician",
            })
          );
          navigate("/Home");
          return;
        }
        throw new Error("Offline login failed — go online to sign in");
      }

      const res = await loginTech(username, pin);
      const data = res.data || {};
      const token = data.token ?? data.access_token;
      const { id, name, role } = data;

      if (!token) {
        throw new Error(
          "The server accepted your login but did not return a session token. " +
            "The deployed API is likely still on the old version — redeploy the backend on Render " +
            "and set the JWT_SECRET environment variable, then try again."
        );
      }

      localStorage.setItem("auth_token", token);
      localStorage.setItem(
        "tech",
        JSON.stringify({
          id,
          name,
          role: role || "technician",
        })
      );

      try {
        const pinHash = await digestPin(pin);
        localStorage.setItem(
          "offline_tech",
          JSON.stringify({
            username,
            pinHash,
            id,
            name,
            role: role || "technician",
          })
        );
      } catch (e) {
        console.warn("Failed to store offline credential:", e);
      }

      const post = sessionStorage.getItem("post_login_path");
      if (post) {
        try {
          sessionStorage.removeItem("post_login_path");
        } catch {
          /* ignore */
        }
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

  async function digestPin(pinValue) {
    const subtle = window?.crypto?.subtle;
    if (!subtle) {
      throw new Error(
        "WebCrypto unavailable. Use HTTPS/localhost or sign in while online."
      );
    }
    const enc = new TextEncoder();
    const data = enc.encode(pinValue);
    const hash = await subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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
            <button
              className="btn btn-ghost btn-sm"
              onClick={dismissRedirectMessage}
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && (
            <div className="text-sm text-error text-center">{error}</div>
          )}

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
