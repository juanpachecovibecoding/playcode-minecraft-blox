# BrainBlox 🧩

A Roblox-style 3D learning obby for kids (about age 8). Run and jump across a
colorful floating obstacle course; clear each section by answering a friendly
quiz question (math, reading, science, geography). Play alone or in a **private
room with friends** and **talk over live voice**. Works on desktop and phone,
with on-screen touch controls and a fullscreen button.

Built with **Three.js + Vite** (vanilla JS), **Supabase Realtime** for rooms, and
**WebRTC** for voice.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173  (solo play works with zero config)
npm test         # unit tests for questions + physics
npm run build    # production build into dist/
```

## Controls

- **Desktop:** WASD / arrow keys to move, **Space** to jump.
- **Phone / tablet:** drag the thumb-stick (bottom-left), tap **JUMP** (bottom-right).
- **⛶** button (top-right) goes fullscreen.

## How playing works

1. Type a name, then **Play Alone**, **Create a Room**, or **Join with Code**.
2. Run the obby. Step into a glowing ring to get a question.
3. Answer right → the gate opens and you earn a ⭐. Answer wrong → friendly
   "try again," no penalty. Reach the flag to win.

## Multiplayer + voice (optional setup)

Solo play needs nothing. For private rooms + voice, set these env vars (in
`.env.local` for dev, and in the Vercel project for production):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Rooms use Supabase Realtime **presence + broadcast only** (no database tables, no
login). Voice is a WebRTC mesh; for the best connectivity across networks, also
set Cloudflare TURN creds in Vercel (falls back to public STUN/TURN otherwise):

```
CF_TURN_KEY_ID=...
CF_TURN_API_TOKEN=...
```

The mic starts **muted** and is opt-in — kid-safe by default.

## Adding your own questions

Open [`src/questions.js`](src/questions.js) and add to the `BANK` array. Math
questions generate automatically. Each bank item needs a `topic`, `prompt`,
`choices`, and `correctIndex`. That's the only file you need to touch.

## Project layout

```
src/
  main.js          bootstrap + game loop + wiring
  world.js         builds the obby (platforms, checkpoints, gates, goal)
  player.js        gravity + AABB collision (unit-tested)
  avatar.js        blocky Roblox-style humanoid (local + remote)
  controls.js      keyboard + touch joystick
  camera.js        third-person follow camera
  quiz.js          question modal
  questions.js     editable question bank + math generator (unit-tested)
  hud.js           stars, flash messages, win screen, player list
  audio.js         synthesized sound effects
  fullscreen.js    fullscreen + orientation
  lobby.js         start screen (name / create / join)
  net.js           Supabase Realtime rooms (presence + position + signaling)
  remotePlayers.js other players' avatars + interpolation
  voice.js         WebRTC mesh voice + mute + speaking detection
  ice.js           ICE/TURN config (with public fallback)
api/ice.js         Vercel edge function minting Cloudflare TURN creds
```
