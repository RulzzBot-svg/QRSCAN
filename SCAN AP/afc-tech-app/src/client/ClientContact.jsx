import { useState } from "react";
import { sendClientContact } from "./api";
import { AFC_PHONE, AFC_PHONE_TEL } from "../utils/qrLabels";

export default function ClientContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await sendClientContact({ name, email, phone, message, website });
      setDone(true);
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not send that message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-xl font-bold">Contact AFC</h2>
        <p className="text-sm text-base-content/60">
          Call us, or send a short message. This does not change any unit or filter data.
        </p>
      </div>

      <a className="btn btn-primary w-full sm:w-auto" href={`tel:${AFC_PHONE_TEL}`}>
        Call {AFC_PHONE}
      </a>

      {done ? (
        <div className="alert alert-success text-sm">
          Message sent. We’ll get back to you — nothing on the survey was changed.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-3">
        <label className="form-control">
          <span className="label-text text-sm">Your name</span>
          <input
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="form-control">
          <span className="label-text text-sm">Email</span>
          <input
            type="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="form-control">
          <span className="label-text text-sm">Phone</span>
          <input
            className="input input-bordered w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <div className="hidden" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>
        <label className="form-control">
          <span className="label-text text-sm">Message</span>
          <textarea
            className="textarea textarea-bordered w-full min-h-28"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            required
            minLength={10}
            placeholder="What should we call you back about?"
          />
        </label>
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={sending}>
          {sending ? <span className="loading loading-spinner loading-sm" /> : "Send message"}
        </button>
      </form>
    </div>
  );
}
