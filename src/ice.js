// ICE servers tell WebRTC how to connect peers through NATs/firewalls.
//  - STUN (free, public) handles most same-network and many home connections.
//  - TURN (a relay) is needed for stricter NATs. /api/ice mints short-lived
//    Cloudflare TURN creds if CF_TURN_* env vars are set; otherwise we fall back
//    to public STUN + the openrelay TURN so voice still works out of the box.
// (Same pattern as Neil's Talk / Watch Together apps.)

const STATIC_ICE = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

export async function fetchIceServers() {
  try {
    const res = await fetch("/api/ice");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return [...data.iceServers, ...STATIC_ICE];
      }
    }
  } catch {
    /* fall back to static */
  }
  return STATIC_ICE;
}
