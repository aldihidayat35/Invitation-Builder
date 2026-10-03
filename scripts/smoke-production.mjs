#!/usr/bin/env node
/**
 * Production smoke tests (Fase 12). Zero dependencies; run against any deployed
 * environment:
 *
 *   SMOKE_BASE_URL=https://staging.example.com \
 *   SMOKE_PUBLIC_SLUG=<published-invitation-slug>          # optional but recommended
 *   SMOKE_GUEST_TOKEN=<guest token of that invitation>     # optional
 *   SMOKE_ASSET_ID=<asset id used by that invitation>      # optional
 *   node scripts/smoke-production.mjs
 *
 * Exit code 0 = all executed checks passed; 1 = at least one failed.
 * Never prints secrets (password/token values are not echoed).
 */
const base = (process.env.SMOKE_BASE_URL ?? "").replace(/\/$/, "");
if (!base) {
  console.error("SMOKE_BASE_URL is required");
  process.exit(2);
}

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
function expect(cond, message) {
  if (!cond) throw new Error(message);
}
const get = (path, init) => fetch(`${base}${path}`, { redirect: "manual", ...init });

await check("health endpoint", async () => {
  const res = await get("/api/health");
  expect(res.status === 200, `status ${res.status}`);
  expect((await res.json()).status === "ok", "body.status != ok");
});

await check("login page renders", async () => {
  const res = await get("/login");
  expect(res.status === 200, `status ${res.status}`);
});

await check("dashboard is protected (redirects to login)", async () => {
  const res = await get("/dashboard");
  expect([302, 303, 307, 308].includes(res.status), `status ${res.status}`);
  expect((res.headers.get("location") ?? "").includes("/login"), "no redirect to /login");
});

await check("security headers present", async () => {
  const res = await get("/login");
  expect(res.headers.get("x-content-type-options") === "nosniff", "missing nosniff");
  expect(!res.headers.get("x-powered-by"), "x-powered-by exposed");
});

await check("public renderer smoke route (template/runtime load)", async () => {
  const res = await get("/smoke/renderer");
  expect(res.status === 200, `status ${res.status}`);
  const html = await res.text();
  expect(html.includes('data-renderer="html"'), "renderer root missing");
  expect(!html.includes("<canvas"), "canvas found on public route");
});

await check("unknown public slug is 404", async () => {
  const res = await get("/i/smoke-does-not-exist");
  expect(res.status === 404, `status ${res.status}`);
});

await check("RSVP API rejects bad input generically with request id", async () => {
  const res = await get("/api/public/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: "smoke-does-not-exist", name: "Smoke", response: "attending" }),
  });
  expect(res.status === 404, `status ${res.status}`);
  expect(Boolean(res.headers.get("x-request-id")), "no x-request-id");
});

const slug = process.env.SMOKE_PUBLIC_SLUG;
if (slug) {
  await check("published invitation is public, DOM, noindex", async () => {
    const res = await get(`/i/${encodeURIComponent(slug)}`);
    expect(res.status === 200, `status ${res.status}`);
    const html = await res.text();
    expect(/noindex/i.test(html), "robots noindex missing");
    expect(!html.includes("<canvas"), "canvas found");
    expect(html.includes('data-testid="public-invitation"'), "invitation root missing");
  });

  await check("countdown + map widgets render when present", async () => {
    const html = await (await get(`/i/${encodeURIComponent(slug)}`)).text();
    // Informational: only fails if a widget root is present but broken/hidden.
    const hasMap = html.includes('data-widget="map"');
    const hasCountdown = html.includes('data-widget="countdown"');
    if (hasMap)
      expect(
        /https:\/\/(www\.)?google\.[a-z.]+\/maps|maps\.google/i.test(html),
        "map link not rendered",
      );
    return `map=${hasMap} countdown=${hasCountdown}`;
  });

  if (process.env.SMOKE_GUEST_TOKEN) {
    await check("guest context link renders", async () => {
      const res = await get(
        `/i/${encodeURIComponent(slug)}?to=${encodeURIComponent(process.env.SMOKE_GUEST_TOKEN)}`,
      );
      expect(res.status === 200, `status ${res.status}`);
    });
  }
}

if (process.env.SMOKE_ASSET_ID) {
  await check("asset loads", async () => {
    const res = await get(`/api/assets/${encodeURIComponent(process.env.SMOKE_ASSET_ID)}/file`);
    expect(res.status === 200, `status ${res.status}`);
    expect((res.headers.get("content-type") ?? "").startsWith("image/"), "not an image");
  });
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
