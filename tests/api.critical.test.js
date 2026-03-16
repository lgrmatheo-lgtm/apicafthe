const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PROJECT_DIR = path.resolve(__dirname, "..");
const PORT = 3900 + Math.floor(Math.random() * 200);
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async () => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Ignore until server is ready.
    }
    await delay(250);
  }
  throw new Error("Server did not become healthy in time");
};

test.before(async () => {
  serverProcess = spawn("node", ["server.js"], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
    },
    stdio: "pipe",
  });

  await waitForHealth();
});

test.after(async () => {
  if (!serverProcess) {
    return;
  }

  serverProcess.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => serverProcess.once("exit", resolve)),
    delay(3000),
  ]);
});

test("GET /health returns API status", async () => {
  const response = await fetch(`${BASE_URL}/health`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, "OK");
});

test("GET /api/clients/me without auth is rejected", async () => {
  const response = await fetch(`${BASE_URL}/api/clients/me`);
  assert.equal(response.status, 403);
});

test("POST /api/clients/login with invalid credentials returns 401", async () => {
  const response = await fetch(`${BASE_URL}/api/clients/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "no.user@example.com",
      mot_de_passe: "invalid-password",
    }),
  });
  assert.equal(response.status, 401);
});

test("POST /api/employes/login with invalid credentials returns 401", async () => {
  const response = await fetch(`${BASE_URL}/api/employes/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "no.employee@example.com",
      mot_de_passe: "invalid-password",
    }),
  });
  assert.equal(response.status, 401);
});

test("GET /api/stats/kpi without auth is rejected", async () => {
  const response = await fetch(`${BASE_URL}/api/stats/kpi`);
  assert.equal(response.status, 403);
});
