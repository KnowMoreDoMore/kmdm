import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished crane finder", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AC Crane Finder \| Preliminary Fleet Screening<\/title>/i);
  assert.match(html, /Live reach preview/i);
  assert.match(html, /ac-crane-lift-scene-v2\.png/i);
  assert.match(html, /Horizontal ·/i);
  assert.match(html, /Vertical ·/i);
  assert.match(html, /Required boom/i);
  assert.match(html, /AC Crane &amp; Sign Service/i);
  assert.match(html, /Total suspended load/i);
  assert.match(html, /Vertical distance/i);
  assert.match(html, /Horizontal distance/i);
  assert.match(html, /Pricing settings/i);
  assert.match(html, /Editable rental estimate/i);
  assert.match(html, /Planned hours ·/i);
  assert.match(html, /4<!-- --> hr minimum/i);
  assert.match(html, /All other qualifying models/i);
  assert.match(html, /Screening estimate only/i);
  assert.match(html, /models from Sheet2/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("emits the branded social metadata", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /property="og:title" content="AC Crane Finder"/i);
  assert.match(html, /property="og:image" content="http:\/\/localhost:3000\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
});
