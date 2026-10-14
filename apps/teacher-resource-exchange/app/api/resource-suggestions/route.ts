import { env } from "cloudflare:workers";

const MAX = {
  title: 180,
  url: 1000,
  provider: 180,
  resourceKind: 80,
  whyUseful: 2000,
  submitterRole: 120,
  submitterEmail: 254,
};

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeUrl(raw: string) {
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Use a web address that starts with https:// or http://.");
  }
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Quietly accept bot-filled submissions without storing them.
    if (clean(body.website, 200)) {
      return Response.json({ accepted: true }, { status: 202 });
    }

    const title = clean(body.title, MAX.title);
    const url = clean(body.url, MAX.url);
    const provider = clean(body.provider, MAX.provider);
    const resourceKind = clean(body.resourceKind, MAX.resourceKind) || "Not sure";
    const whyUseful = clean(body.whyUseful, MAX.whyUseful);
    const submitterRole = clean(body.submitterRole, MAX.submitterRole);
    const submitterEmail = clean(body.submitterEmail, MAX.submitterEmail);

    if (!title || !url || !whyUseful) {
      return Response.json({ error: "Please add a title, link, and a short note about why it is useful." }, { status: 400 });
    }

    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      return Response.json({ error: "Please check the email address or leave it blank." }, { status: 400 });
    }

    let normalizedUrl = "";
    try {
      normalizedUrl = normalizeUrl(url);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Please check the resource link." }, { status: 400 });
    }

    if (!env.DB) {
      throw new Error("Resource suggestion storage is unavailable.");
    }

    await env.DB.prepare(
      `INSERT INTO resource_suggestions
        (id, title, url, normalized_url, provider, resource_kind, why_useful, submitter_role, submitter_email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(crypto.randomUUID(), title, url, normalizedUrl, provider, resourceKind, whyUseful, submitterRole, submitterEmail)
      .run();

    return Response.json({ accepted: true }, { status: 201 });
  } catch (error) {
    console.error("resource suggestion failed", error);
    return Response.json({ error: "We could not save that suggestion. Please try again." }, { status: 500 });
  }
}
