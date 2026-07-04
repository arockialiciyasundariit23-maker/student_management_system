import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(fields) {
  const errors = {};
  if (fields.username.trim().length < 3) {
    errors.username = "Use at least 3 characters.";
  }
  if (!EMAIL_RE.test(fields.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (fields.password.length < 6) {
    errors.password = "Use at least 6 characters.";
  }
  if (fields.confirm !== fields.password) {
    errors.confirm = "Passwords don't match.";
  }
  return errors;
}

export default function Register() {
  const navigate = useNavigate();
  const [fields, setFields] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function onChange(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const clientErrors = validate(fields);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await api.register({
        username: fields.username.trim(),
        email: fields.email.trim(),
        password: fields.password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setErrors(err.errors || { form: "Registration failed." });
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
        <p className="auth-sub">Open an account to start logging tasks.</p>

        <form onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Username</span>
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
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={fields.email}
              onChange={onChange}
              autoComplete="email"
              placeholder="you@example.com"
            />
            {errors.email && <em className="error">{errors.email}</em>}
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={fields.password}
              onChange={onChange}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
            {errors.password && <em className="error">{errors.password}</em>}
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirm"
              type="password"
              value={fields.confirm}
              onChange={onChange}
              autoComplete="new-password"
              placeholder="Repeat password"
            />
            {errors.confirm && <em className="error">{errors.confirm}</em>}
          </label>

          {errors.form && <div className="form-error">{errors.form}</div>}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
