// A multiplayer room "session": one Supabase connection + one voice mesh, shared
// by the room lobby and the classroom so presence and voice stay continuous as
// you move between them. The host is deterministically the lowest player id, so
// it auto-reassigns if the host leaves.

import { createNet } from "./net.js";
import { createVoice } from "./voice.js";

export async function createSession(profile, code) {
  const net = createNet();
  let roster = [];
  const rosterCbs = [];
  const speaking = new Set();
  const speakingCbs = [];

  net.on("roster", (players) => {
    roster = players;
    rosterCbs.forEach((cb) => cb(roster));
  });

  const ok = await net.join(code, profile);
  if (!ok) return null;

  // voice mesh (mic starts muted)
  const voice = createVoice(net, {
    onSpeaking: (id, on) => {
      if (on) speaking.add(id);
      else speaking.delete(id);
      speakingCbs.forEach((cb) => cb(speaking));
    },
  });
  voice.wire();
  const voiceStarted = await voice.start();
  if (voiceStarted) roster.filter((p) => p.id !== net.myId).forEach((p) => voice.connect && voice.connect(p.id));

  function host() {
    if (!roster.length) return net.myId;
    return roster.map((p) => p.id).sort()[0];
  }

  return {
    myId: net.myId,
    profile,
    code,
    voiceStarted,
    members: () => roster,
    host,
    isHost: () => host() === net.myId,
    speaking: () => speaking,
    onRoster: (cb) => { rosterCbs.push(cb); cb(roster); },
    onSpeaking: (cb) => speakingCbs.push(cb),
    onMsg: (cb) => net.on("msg", cb),
    send: (type, data) => net.sendMsg(type, data),
    toggleMute: () => voice.toggleMute(),
    isMuted: () => voice.isMuted(),
    async leave() {
      try { voice.stop(); } catch { /* ignore */ }
      await net.leave();
    },
  };
}
