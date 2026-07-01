import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputNonce = useMemo(() => Math.random().toString(36).slice(2, 10), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputsUnlocked, setInputsUnlocked] = useState(false);

  // Force-clear any autofill-like persisted UI state on first render.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      formRef.current?.reset();
      setEmail("");
      setPassword("");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      navigate("/properties");
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-semibold">Login</h1>
      <p className="mb-5 text-sm text-slate-600">
        Access your properties and zone maps.
      </p>

      <form ref={formRef} className="space-y-4" onSubmit={onSubmit} autoComplete="off">
        <input
          type="email"
          name="username"
          autoComplete="username"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          type="password"
          name="current-password"
          autoComplete="current-password"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="text"
            inputMode="email"
            name={`vzm-email-${inputNonce}`}
            autoComplete="off"
            data-lpignore="true"
            readOnly={!inputsUnlocked}
            onFocus={() => setInputsUnlocked(true)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-slate-500"
            spellCheck={false}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            name={`vzm-password-${inputNonce}`}
            autoComplete="new-password"
            data-lpignore="true"
            readOnly={!inputsUnlocked}
            onFocus={() => setInputsUnlocked(true)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-slate-500"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Need an account?{" "}
        <Link className="font-medium text-slate-800 underline" to="/signup">
          Sign up
        </Link>
      </p>
    </section>
  );
}