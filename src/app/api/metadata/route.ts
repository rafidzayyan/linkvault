import { NextResponse } from "next/server";

// GET /api/metadata?url=  → { title, favicon } (PRD 2.1 auto-fetch, Nice to Have)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkVaultBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const html = await res.text();

    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = decodeEntities((ogTitle?.[1] ?? titleTag?.[1] ?? "").trim());

    const favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;

    return NextResponse.json({ title, favicon });
  } catch {
    return NextResponse.json(
      { title: "", favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64` },
      { status: 200 },
    );
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}
