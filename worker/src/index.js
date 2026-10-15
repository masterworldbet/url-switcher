const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

    const match = url.pathname.match(/^\\/go\\/([a-z0-9-]{2,60})\\/?$/);
    if (!match) return new Response("Not found", { status: 404, headers: corsHeaders });
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response("Server configuration error", { status: 500, headers: corsHeaders });
    }

    const slug = match[1];
    const endpoint = `${env.SUPABASE_URL.replace(/\\/$/, "")}/rest/v1/switch_links?select=url_a,url_b,active_target&slug=eq.${encodeURIComponent(slug)}&limit=1`;
    const response = await fetch(endpoint, {
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!response.ok) return new Response("Upstream error", { status: 502, headers: corsHeaders });
    const rows = await response.json();
    if (!rows.length) return new Response("Link not found", { status: 404, headers: corsHeaders });

    const row = rows[0];
    const target = row.active_target === "B" ? row.url_b : row.url_a;
    let parsed;
    try { parsed = new URL(target); } catch { return new Response("Invalid destination", { status: 500, headers: corsHeaders }); }
    if (parsed.protocol !== "https:") return new Response("Invalid destination", { status: 500, headers: corsHeaders });

    return Response.redirect(parsed.toString(), 302);
  }
};
