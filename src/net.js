// Multiplayer transport over Supabase Realtime. One channel per room code.
//   - Presence tracks who is in the room ({ id, name, color }).
//   - Broadcast "state" packets carry each player's position at ~12 Hz.
//   - Broadcast "signal" packets relay WebRTC offers/answers/ICE for voice.
// If Supabase env vars are missing, `available` is false and the game runs solo.
//
// Events (subscribe with net.on(name, cb)):
//   roster(players[])           presence changed - full list of others + me
//   state({ id, ...packet })    a peer moved
//   signal({ from, to, data })  a WebRTC signaling message addressed to us
//   join(id) / leave(id)        a peer entered / left (for voice peer setup)

import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const MULTIPLAYER_AVAILABLE = Boolean(URL && KEY);

export function createNet() {
  const listeners = { roster: [], state: [], signal: [], join: [], leave: [], msg: [] };
  const emit = (ev, payload) => listeners[ev].forEach((cb) => cb(payload));

  let client = null;
  let channel = null;
  let me = null;
  let knownIds = new Set();

  if (MULTIPLAYER_AVAILABLE) client = createClient(URL, KEY, { realtime: { params: { eventsPerSecond: 20 } } });

  async function join(code, profile) {
    if (!MULTIPLAYER_AVAILABLE) return false;
    me = profile; // { id, name, color }
    channel = client.channel(`room:${code}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const players = [];
      const ids = new Set();
      for (const key of Object.keys(state)) {
        const meta = state[key][0] || {};
        players.push({ id: key, name: meta.name, color: meta.color });
        ids.add(key);
      }
      // diff for voice peer setup
      for (const id of ids) if (id !== me.id && !knownIds.has(id)) emit("join", id);
      for (const id of knownIds) if (!ids.has(id)) emit("leave", id);
      knownIds = ids;
      emit("roster", players);
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      if (payload && payload.id !== me.id) emit("state", payload);
    });

    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      if (payload && payload.to === me.id) emit("signal", payload);
    });

    // generic room messages (lobby state, classroom questions/answers, etc.)
    channel.on("broadcast", { event: "msg" }, ({ payload }) => {
      if (payload) emit("msg", payload);
    });

    await new Promise((resolve) => {
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: me.name, color: me.color, t: Date.now() });
          resolve();
        }
      });
    });
    return true;
  }

  let lastSent = 0;
  function sendState(packet) {
    if (!channel) return;
    const now = Date.now();
    if (now - lastSent < 80) return; // ~12 Hz
    lastSent = now;
    channel.send({ type: "broadcast", event: "state", payload: { id: me.id, ...packet } });
  }

  function sendSignal(toId, data) {
    if (!channel) return;
    channel.send({ type: "broadcast", event: "signal", payload: { from: me.id, to: toId, data } });
  }

  // broadcast a typed room message to everyone (lobby/classroom/quiz sync)
  function sendMsg(type, data = {}) {
    if (!channel) return;
    channel.send({ type: "broadcast", event: "msg", payload: { type, from: me.id, ...data } });
  }

  async function leave() {
    if (channel) {
      try {
        await channel.untrack();
      } catch {
        /* ignore */
      }
      await client.removeChannel(channel);
      channel = null;
    }
    knownIds = new Set();
  }

  function on(ev, cb) {
    if (!listeners[ev]) return () => {};
    listeners[ev].push(cb);
    return () => {
      const i = listeners[ev].indexOf(cb);
      if (i >= 0) listeners[ev].splice(i, 1);
    };
  }

  return { join, leave, sendState, sendSignal, sendMsg, on, get myId() { return me?.id; } };
}
