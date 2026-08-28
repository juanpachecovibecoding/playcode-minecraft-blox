// Vercel Edge Function: mints short-lived Cloudflare TURN credentials so the
// browser never sees the long-lived secret. If the env vars are not set (local
// dev or before creds are configured), it returns an empty list and the client
// falls back to public STUN + openrelay TURN.
//
// Set these in the Vercel project (reuse the SAME values as Talk / Watch Together;
// a Cloudflare TURN key works from any origin):
//   CF_TURN_KEY_ID, CF_TURN_API_TOKEN

export const config = { runtime: "edge" };

export default async function handler() {
  const keyId = process.env.CF_TURN_KEY_ID;
  const apiToken = process.env.CF_TURN_API_TOKEN;

  const json = (body) =>
    new Response(JSON.stringify(body), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });

  if (!keyId || !apiToken) return json({ iceServers: [] });

  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 86400 }),
    });
    if (!res.ok) return json({ iceServers: [] });
    const data = await res.json();
    return json({ iceServers: data.iceServers ? [data.iceServers] : [] });
  } catch {
    return json({ iceServers: [] });
  }
}
