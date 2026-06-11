# Portfolio World — Setup Guide

A Three.js isometric portfolio with click-to-move character, interactable objects, and a music player.

---

## Project Structure

```
portfolio/
├── index.html              ← entry point
├── css/
│   └── ui.css              ← all UI styles (loader, modal, music player)
├── js/
│   ├── main.js             ← Three.js scene, camera, lighting, game loop
│   ├── character.js        ← player controller + animations
│   ├── interactions.js     ← proximity detection, glow, modal system
│   ├── audio.js            ← music player
│   └── content.js          ← ✏️  YOUR FILE — edit name, bio, projects, career
└── assets/
    ├── world.glb           ← drop your Blender export here
    ├── character.glb       ← optional: your character model
    └── audio/
        └── music.mp3       ← your music track
```

---

## 1. Running Locally

You need a local server because browsers block file:// imports.

### Option A — VS Code Live Server (easiest)
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Open the `portfolio/` folder in VS Code
3. Click **Go Live** in the bottom status bar
4. Opens at `http://127.0.0.1:5500`

### Option B — Node.js
```bash
npx serve .
```

### Option C — Python
```bash
python3 -m http.server 8080
```

---

## 2. Editing Your Content

Open `js/content.js` — this is the **only file you need to edit** for content.

```js
export const SITE = {
  name:  'Your Name',       // ← change this
  role:  'Creative Designer', // ← and this
  music: 'assets/audio/music.mp3', // ← path to your track
};
```

Each object in `OBJECTS` array has:
- `label` — name shown in the interaction prompt
- `modal.title` — modal heading
- `modal.body` — HTML content (supports `<p>`, `<strong>`, `<a>` etc.)
- `modal.tags` — small tags shown at the bottom
- `position` — where on the ground it sits `{ x, z }`
- `radius` — how close the player needs to be to trigger it

---

## 3. Adding Your Blender World

### Export settings in Blender:
1. File → Export → glTF 2.0 (.glb/.gltf)
2. Format: **GLB**
3. Include: ✅ Meshes, ✅ Materials, ✅ Textures, ✅ Apply Modifiers
4. Geometry: ✅ Draco mesh compression (cuts file size ~5x)
5. Export as `world.glb` into the `assets/` folder

### Connect it to the engine:
In `js/content.js`, change:
```js
export const WORLD = {
  usePlaceholder: false,  // ← change true → false
  modelPath: 'assets/world.glb',
  groundSize: 40,  // adjust to match your scene scale
  ...
};
```

### Naming objects in Blender:
In Blender's outliner panel, name your meshes to match `meshName` in content.js:
- `StudioBuilding` → About Me trigger
- `NoticeBoard`    → Career trigger
- `GalleryWall`    → Projects trigger
- `Bench`          → Skills trigger
- `Mailbox`        → Contact trigger

The engine will find them by name and attach glow + interaction automatically.

### Interaction zones:
Update `position: { x, z }` in each object in `content.js` to match where your Blender objects actually sit in the scene.

---

## 4. Adding Your Character Model

In `js/main.js`, after `const character = new Character(...)`, add:
```js
character.loadModel('assets/character.glb');
```

Your GLB should have animations named `idle` and `walk` — the engine plays them automatically.

---

## 5. Adding Your Music

Drop your `.mp3` into `assets/audio/music.mp3`  
(or change the path in `content.js` → `SITE.music`).

Music starts on first user interaction (browser requirement). The floating speaker icon bottom-right controls volume and mute.

---

## 6. GitHub Setup

```bash
# One-time setup
git init
git add .
git commit -m "initial portfolio world"

# Create repo on github.com, then:
git remote add origin https://github.com/YOURUSERNAME/portfolio.git
git branch -M main
git push -u origin main
```

**Push updates:**
```bash
git add .
git commit -m "update bio"
git push
```

---

## 7. Deploy to Netlify (free)

1. Go to [netlify.com](https://netlify.com) → Sign up with GitHub
2. Click **Add new site** → **Import an existing project**
3. Choose your GitHub repo
4. Build settings: leave blank (static site, no build step)
5. Click **Deploy site**

Done. Auto-deploys every time you push to GitHub.

**Custom domain:**
- Buy domain at [namecheap.com](https://namecheap.com) or [cloudflare.com/registrar](https://cloudflare.com/registrar)
- In Netlify → Domain settings → Add custom domain
- Follow DNS instructions (takes ~10 minutes)

---

## 8. Performance Tips

- Keep your `world.glb` under **20MB** (use Draco compression)
- Bake lighting into textures in Blender for best performance
- Use a single material atlas if possible (fewer draw calls)
- Test on mobile — the isometric camera and touch-to-move work out of the box

---

## Interaction Controls

| Input | Action |
|-------|--------|
| Click ground | Walk there |
| Click object | Walk to it |
| E key | Open nearby object |
| Escape | Close modal |
| Touch | Tap to move (mobile) |
| 🔊 icon | Expand music player |

---

## Customisation Cheatsheet

| What | Where |
|------|-------|
| Your name & role | `js/content.js` → SITE |
| Bio, career, projects text | `js/content.js` → OBJECTS[].modal.body |
| Object positions | `js/content.js` → OBJECTS[].position |
| Fog color / density | `js/content.js` → WORLD.fog |
| Lighting intensity | `js/content.js` → WORLD.ambientIntensity |
| World size | `js/content.js` → WORLD.groundSize |
| Fonts & colors | `css/ui.css` → :root variables |
| Camera zoom | `js/main.js` → const FRUSTUM |
| Walk speed | `js/character.js` → const MOVE_SPEED |
