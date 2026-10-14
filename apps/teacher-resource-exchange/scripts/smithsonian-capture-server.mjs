import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";

const port = Number(process.env.SMITHSONIAN_CAPTURE_PORT || 43123);
const output = new URL("../data/smithsonian_learning_lab_capture.json", import.meta.url);

const page = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Smithsonian catalog capture</title>
<form method="post" action="/capture">
  <label>Catalog JSON <textarea id="data" name="data"></textarea></label>
  <button id="save" type="submit">Save capture</button>
</form>
</html>`;

createServer(async (request, response) => {
  if (request.method === "GET") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
    return;
  }

  if (request.method === "POST" && request.url === "/capture") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const data = new URLSearchParams(body).get("data");
    if (!data) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Missing data");
      return;
    }
    const incoming = JSON.parse(data);
    let saved = incoming;
    if (incoming.append === true) {
      const current = JSON.parse(await readFile(output, "utf8"));
      const replacementPages = new Set(incoming.pages.map((page) => `${page.band}:${page.page}`));
      saved = {
        ...current,
        capturedAt: incoming.capturedAt,
        method: incoming.method || current.method,
        pages: [
          ...current.pages.filter((page) => !replacementPages.has(`${page.band}:${page.page}`)),
          ...incoming.pages,
        ],
        rows: [
          ...current.rows.filter((row) => !replacementPages.has(`${row.gradeBand}:${row.page}`)),
          ...incoming.rows,
        ],
      };
      saved.pages.sort((a, b) => a.band.localeCompare(b.band) || a.page - b.page);
    }
    await writeFile(output, `${JSON.stringify(saved)}\n`);
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(`Saved ${saved.rows.length} rows across ${saved.pages.length} pages`);
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found");
}).listen(port, "127.0.0.1", () => {
  console.log(`Smithsonian capture receiver listening on http://127.0.0.1:${port}`);
});
