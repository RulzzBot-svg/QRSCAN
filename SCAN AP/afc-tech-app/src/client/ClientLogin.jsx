import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isClientDirector, loginClient, saveClientSession } from "./api";
import { readClientTheme, storeClientTheme, toggleClientTheme, applyClientTheme } from "./theme";
import ThemeToggle from "./ThemeToggle";
import InstallHint from "./InstallHint";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(readClientTheme);

  useEffect(() => {
    applyClientTheme(theme);
  }, [theme]);

  const switchTheme = () => {
    const next = toggleClientTheme(theme);
    setTheme(next);
    storeClientTheme(next);
    applyClientTheme(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginClient(username.trim(), pin);
      saveClientSession(res.data);
      const director = isClientDirector(res.data);
      let next = director ? "/client" : "/client/units";
      try {
        const stored = sessionStorage.getItem("post_client_path");
        if (stored && stored.startsWith("/client")) next = stored;
        sessionStorage.removeItem("post_client_path");
      } catch {
        /* ignore */
      }
      if (
        !director &&
        (next === "/client" ||
          next === "/client/" ||
          next.startsWith("/client/graphs") ||
          next.startsWith("/client/contact") ||
          next.startsWith("/client/datasheet"))
      ) {
        next = "/client/units";
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-theme={theme} className="min-h-dvh bg-base-200 flex items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle theme={theme} onToggle={switchTheme} fit />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-[11px] font-extrabold tracking-[0.22em] text-primary">ADVANCED FILTRATION CONCEPTS</p>
          <h1 className="text-2xl font-bold mt-2">Hospital Portal</h1>
          <p className="text-sm text-base-content/60 mt-1">
            Scan a unit QR or browse service status for your hospital.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-base-100 border border-base-300 rounded-2xl shadow-lg p-6 space-y-4"
        >
          <label className="form-control">
            <span className="label-text text-sm">Username</span>
            <input
              className="input input-bordered w-full"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text text-sm">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              className="input input-bordered w-full"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-error text-center">{error}</p> : null}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Enter portal"}
          </button>
        </form>
        <div className="mt-4">
          <InstallHint />
        </div>
        <p className="text-center text-xs text-base-content/50 mt-6">
          Technician?{" "}
          <Link className="link link-primary" to="/">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
