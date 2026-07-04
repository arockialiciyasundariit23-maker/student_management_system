import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

function ledgerId(id) {
  return `T-${String(id).padStart(3, "0")}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({ title: "", description: "" });
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.listTasks();
      setTasks(data);
    } catch (err) {
      if (err.status === 401 || err.status === 422) {
        logout();
        return;
      }
      setLoadError("Could not load tasks. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  function onFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({ title: task.title, description: task.description });
    setFormErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ title: "", description: "" });
    setFormErrors({});
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errors = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    else if (form.title.trim().length > 200)
      errors.title = "Keep it under 200 characters.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await api.updateTask(editingId, {
          title: form.title.trim(),
          description: form.description.trim(),
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        cancelEdit();
      } else {
        const created = await api.createTask({
          title: form.title.trim(),
          description: form.description.trim(),
        });
        setTasks((prev) => [created, ...prev]);
        setForm({ title: "", description: "" });
      }
    } catch (err) {
      setFormErrors(err.errors || { form: "Could not save the task." });
    } finally {
      setSubmitting(false);
    }
  }

  async function cycleStatus(task) {
    const order = ["pending", "in_progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    const updated = await api.updateTask(task.id, { status: next });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function removeTask(task) {
    if (!window.confirm(`Delete ${ledgerId(task.id)} — "${task.title}"?`)) return;
    await api.deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (editingId === task.id) cancelEdit();
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="dash-screen">
      <header className="dash-header">
        <div className="brand">
          <span className="brand-mark">T-000</span>
          <h1>Task Ledger</h1>
        </div>
        <div className="dash-user">
          <span>
            Welcome, <strong>{user?.username || "there"}</strong>
          </span>
          <button className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dash-main">
        <section className="dash-summary">
          <div className="summary-stat">
            <span className="summary-num">{tasks.length}</span>
            <span className="summary-label">Logged</span>
          </div>
          <div className="summary-stat">
            <span className="summary-num">{doneCount}</span>
            <span className="summary-label">Done</span>
          </div>
          <div className="summary-stat">
            <span className="summary-num">{tasks.length - doneCount}</span>
            <span className="summary-label">Open</span>
          </div>
        </section>

        <section className="dash-form-card">
          <h2>{editingId ? `Edit ${ledgerId(editingId)}` : "Log a new task"}</h2>
          <form onSubmit={onSubmit} noValidate>
            <label className="field">
              <span>Title</span>
              <input
                name="title"
                value={form.title}
                onChange={onFormChange}
                placeholder="e.g. Prepare demo data"
              />
              {formErrors.title && <em className="error">{formErrors.title}</em>}
            </label>
            <label className="field">
              <span>Description (optional)</span>
              <textarea
                name="description"
                value={form.description}
                onChange={onFormChange}
                placeholder="Any extra detail"
                rows={3}
              />
            </label>
            {formErrors.form && <div className="form-error">{formErrors.form}</div>}
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save changes" : "Add task"}
              </button>
              {editingId && (
                <button type="button" className="btn-ghost" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="dash-list">
          {loading && <p className="dim">Loading tasks…</p>}
          {loadError && <p className="error">{loadError}</p>}
          {!loading && !loadError && tasks.length === 0 && (
            <p className="dim">Nothing logged yet. Add your first task above.</p>
          )}

          {tasks.map((task) => (
            <article className={`task-row status-${task.status}`} key={task.id}>
              <button
                className="task-id"
                onClick={() => cycleStatus(task)}
                title="Click to cycle status"
              >
                {ledgerId(task.id)}
              </button>
              <div className="task-body">
                <h3>{task.title}</h3>
                {task.description && <p>{task.description}</p>}
              </div>
              <span className={`status-pill status-${task.status}`}>
                {STATUS_LABEL[task.status]}
              </span>
              <div className="task-actions">
                <button className="btn-ghost" onClick={() => startEdit(task)}>
                  Edit
                </button>
                <button className="btn-danger" onClick={() => removeTask(task)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
