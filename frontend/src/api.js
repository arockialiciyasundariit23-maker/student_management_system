const BASE = "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = new Error("Request failed");
    err.status = res.status;
    err.errors = (data && data.errors) || { form: "Something went wrong." };
    throw err;
  }
  return data;
}

export const api = {
  register: (payload) =>
    request("/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) =>
    request("/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/me"),
  listTasks: () => request("/tasks"),
  createTask: (payload) =>
    request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  updateTask: (id, payload) =>
    request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
