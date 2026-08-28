// Voice chat: a full WebRTC mesh between everyone in the room. Signaling rides on
// the Supabase channel (net.sendSignal / net 'signal' events). To avoid both
// sides making an offer at once ("glare"), the peer with the smaller id is the
// caller. Mic starts MUTED (kid-safe) until the player taps the mic button.
//
// onSpeaking(id|"me", isSpeaking) lets the HUD show who is talking.

import { fetchIceServers } from "./ice.js";

export function createVoice(net, { onSpeaking } = {}) {
  const peers = new Map(); // id -> { pc, audioEl, analyser, data }
  let localStream = null;
  let iceServers = [];
  let muted = true;
  let started = false;
  let myId = null;
  let analyseRaf = null;

  async function start() {
    if (started) return true;
    myId = net.myId;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    } catch (e) {
      return false; // mic denied - voice stays off, game continues
    }
    // start muted
    localStream.getAudioTracks().forEach((t) => (t.enabled = false));
    iceServers = await fetchIceServers();
    started = true;
    startAnalyser("me", localStream, () => !muted);
    return true;
  }

  function ensurePeer(id) {
    let p = peers.get(id);
    if (p) return p;
    const pc = new RTCPeerConnection({ iceServers });
    if (localStream) localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate) net.sendSignal(id, { kind: "ice", candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      let audioEl = document.getElementById(`audio-${id}`);
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.id = `audio-${id}`;
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        document.body.appendChild(audioEl);
      }
      audioEl.srcObject = stream;
      audioEl.play().catch(() => {});
      startAnalyser(id, stream, () => true);
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        // leave cleanup handles removal; nothing else needed here
      }
    };

    p = { pc };
    peers.set(id, p);
    return p;
  }

  async function call(id) {
    const { pc } = ensurePeer(id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    net.sendSignal(id, { kind: "offer", sdp: pc.localDescription });
  }

  async function onSignal({ from, data }) {
    if (!started) return;
    const { pc } = ensurePeer(from);
    try {
      if (data.kind === "offer") {
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        net.sendSignal(from, { kind: "answer", sdp: pc.localDescription });
      } else if (data.kind === "answer") {
        await pc.setRemoteDescription(data.sdp);
      } else if (data.kind === "ice") {
        await pc.addIceCandidate(data.candidate);
      }
    } catch {
      /* ignore malformed/duplicate signaling */
    }
  }

  function handleJoin(id) {
    if (!started || id === myId) return;
    ensurePeer(id);
    if (myId < id) call(id); // smaller id is the caller
  }

  function handleLeave(id) {
    const p = peers.get(id);
    if (!p) return;
    try {
      p.pc.close();
    } catch {
      /* ignore */
    }
    const el = document.getElementById(`audio-${id}`);
    if (el) el.remove();
    peers.delete(id);
    if (onSpeaking) onSpeaking(id, false);
  }

  function toggleMute() {
    muted = !muted;
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    return muted;
  }

  // ---- speaking detection (simple RMS over an analyser) ----
  const speakers = new Map(); // id -> { analyser, data, active, gate }
  function startAnalyser(id, stream, gate) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ac = (startAnalyser.ac = startAnalyser.ac || new Ctx());
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      speakers.set(id, { analyser, data: new Uint8Array(analyser.frequencyBinCount), active: false, gate });
      if (!analyseRaf) loop();
    } catch {
      /* analyser optional */
    }
  }
  function loop() {
    for (const [id, s] of speakers) {
      s.analyser.getByteFrequencyData(s.data);
      let sum = 0;
      for (let i = 0; i < s.data.length; i++) sum += s.data[i];
      const avg = sum / s.data.length;
      const active = s.gate() && avg > 14;
      if (active !== s.active) {
        s.active = active;
        if (onSpeaking) onSpeaking(id, active);
      }
    }
    analyseRaf = requestAnimationFrame(loop);
  }

  function wire() {
    net.on("signal", onSignal);
    net.on("join", handleJoin);
    net.on("leave", handleLeave);
  }

  function stop() {
    for (const id of [...peers.keys()]) handleLeave(id);
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    if (analyseRaf) cancelAnimationFrame(analyseRaf);
    analyseRaf = null;
    started = false;
  }

  return { start, wire, connect: handleJoin, toggleMute, stop, isMuted: () => muted, isStarted: () => started };
}
