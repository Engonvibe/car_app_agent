import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { CarArt } from "../components/CarArt";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-inner">
        <div className="auth-hero">
          <CarArt className="auth-car" />
          <div className="auth-hero-brand">Your AI Assistant for Car Care</div>
          <div className="auth-hero-tag">Car Service &amp; MOT Manager</div>
        </div>

        <div className="auth-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Log in to manage your vehicles and MOT records.</p>

          <form onSubmit={onSubmit}>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="field-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={busy}>
              {busy ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>

          <div className="auth-demo">
            <strong>Demo logins</strong> (password: <code>password123</code>)
            <div>Owner: demo@motcare.local</div>
            <div>Editor: editor@motcare.local</div>
            <div>Viewer: viewer@motcare.local</div>
          </div>
        </div>
      </div>
    </div>
  );
}
