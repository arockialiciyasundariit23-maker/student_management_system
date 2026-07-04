import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function Login() {
  const navigate = useNavigate();
  const [fields, setFields] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const clientErrors = {};
    if (!fields.username.trim()) clientErrors.username = "Username is required.";
    if (!fields.password) clientErrors.password = "Password is required.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await api.login({
        username: fields.username.trim(),
        password: fields.password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setErrors(err.errors || { form: "Login failed." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">T-000</span>
          <h1>Task Ledger</h1>
        </div>
        <p className="auth-sub">Log in to see your tasks.</p>

        <form onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Username or email</span>
            <input
              name="username"
              value={fields.username}
              onChange={onChange}
              autoComplete="username"
              placeholder="e.g. arjun_r"
            />
            {errors.username && <em className="error">{errors.username}</em>}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={fields.password}
              onChange={onChange}
              autoComplete="current-password"
              placeholder="Your password"
            />
            {errors.password && <em className="error">{errors.password}</em>}
          </label>

          {errors.form && <div className="form-error">{errors.form}</div>}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
