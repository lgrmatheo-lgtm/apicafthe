const assert = require("node:assert/strict");

const port = String(3900 + Math.floor(Math.random() * 200));
process.env.PORT = port;
process.env.HOST = "127.0.0.1";

const db = require("../db");
const { server } = require("../server");

const baseUrl = `http://${process.env.HOST}:${process.env.PORT}`;

const waitForListening = () =>
  new Promise((resolve, reject) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once("listening", resolve);
    server.once("error", reject);
  });

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  let json = null;
  try {
    json = await response.json();
  } catch (error) {
    json = null;
  }
  return { response, json };
};

const run = async () => {
  const results = [];

  await waitForListening();

  {
    const { response, json } = await requestJson(`${baseUrl}/health`);
    assert.equal(response.status, 200, "GET /health should return 200");
    assert.equal(json && json.status, "OK", "GET /health should return status OK");
    results.push("PASS - GET /health");
  }

  {
    const { response } = await requestJson(`${baseUrl}/api/clients/me`);
    assert.equal(response.status, 403, "GET /api/clients/me without token should return 403");
    results.push("PASS - auth guard client /me");
  }

  {
    const { response } = await requestJson(`${baseUrl}/api/clients/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "no.user@example.com",
        mot_de_passe: "invalid-password",
      }),
    });
    assert.equal(response.status, 401, "Invalid client login should return 401");
    results.push("PASS - invalid client login");
  }

  {
    const { response } = await requestJson(`${baseUrl}/api/employes/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "no.employee@example.com",
        mot_de_passe: "invalid-password",
      }),
    });
    assert.equal(response.status, 401, "Invalid employe login should return 401");
    results.push("PASS - invalid employe login");
  }

  {
    const { response } = await requestJson(`${baseUrl}/api/stats/kpi`);
    assert.equal(response.status, 403, "GET /api/stats/kpi without token should return 403");
    results.push("PASS - auth guard stats /kpi");
  }

  return results;
};

(async () => {
  let exitCode = 0;
  try {
    const results = await run();
    results.forEach((line) => console.log(line));
    console.log(`PASS - ${results.length} checks`);
  } catch (error) {
    exitCode = 1;
    console.error("FAIL - test run failed");
    console.error(error && error.stack ? error.stack : error);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.end();
    process.exitCode = exitCode;
  }
})();
