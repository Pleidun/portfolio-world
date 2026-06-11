// ============================================================
//  main.js — Three.js scene, camera, lighting, game loop
// ============================================================

import * as THREE from 'three';
import { GLTFLoader }        from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }       from 'three/addons/loaders/DRACOLoader.js';
import { Character }         from './character.js';
import { AudioSystem }       from './audio.js';
import { WORLD, SITE }       from './content.js';
import {
  GameState, ResourceManager, PhaseStationManager, CenterMonument,
  BackpackUI, PhasePanelUI, ProgressUI, PortfolioReveal,
  PHASES
} from './game.js';

// ── MOBILE DETECTION ──────────────────────────────────────────
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || ('ontouchstart' in window && window.innerWidth < 1024);

// ── RENDERER ──────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile });
renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled   = !isMobile;  // shadows off on mobile
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.outputColorSpace    = THREE.SRGBColorSpace;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.debug.checkShaderErrors = false;

// ── SCENE ─────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2d1f0e);
scene.fog = new THREE.Fog(0x2d1f0e, isMobile ? 28 : 38, isMobile ? 55 : 72);

// ── CAMERA (Isometric) ────────────────────────────────────────
const FRUSTUM = isMobile ? 14 : 18; // tighter frustum on mobile = fewer objects rendered
let   aspect  = window.innerWidth / window.innerHeight;
const camera  = new THREE.OrthographicCamera(
  -FRUSTUM * aspect, FRUSTUM * aspect,
   FRUSTUM,         -FRUSTUM,
   0.1, isMobile ? 300 : 600
);
camera.position.set(0, 30, 30);
camera.lookAt(0, 0, 0);
camera.zoom = 1.2;
camera.updateProjectionMatrix();

// ── LIGHTING ──────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffd580, isMobile ? 1.4 : 0.9)); // brighter ambient on mobile to compensate for no shadows

const sun = new THREE.DirectionalLight(0xffe4a0, isMobile ? 1.0 : 1.6);
sun.position.set(30, 50, 30);
sun.castShadow = !isMobile;
if (!isMobile) {
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { near:0.5, far:200, left:-60, right:60, top:60, bottom:-60 });
}
sun.shadow.bias = -0.001;
scene.add(sun);

// Warm fill — orange/pink glow from opposite side
const fill = new THREE.DirectionalLight(0xff9060, 0.5);
fill.position.set(-20, 15, -20);
scene.add(fill);

// Hemisphere — warm sky, warm ground
scene.add(new THREE.HemisphereLight(0xffecd0, 0x4a2e10, 0.5));

// ── GROUND ────────────────────────────────────────────────────
const _placeholderObjects = [];  // tracked for removal when real world loads

function buildGround() {
  const size = WORLD.groundSize;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshLambertMaterial({ color: 0x3d2810 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  _placeholderObjects.push(ground);

  const grid = new THREE.GridHelper(size, 20, 0x5a3d1a, 0x4a2e10);
  grid.position.y = 0.01;
  scene.add(grid);
  _placeholderObjects.push(grid);

  // Walkable collision plane — always kept regardless of world mode
  const walkable = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  walkable.rotation.x = -Math.PI / 2;
  walkable.name = 'walkable';
  scene.add(walkable);
  return walkable;
}

// ── PLACEHOLDERS ──────────────────────────────────────────────
function buildPlaceholders() {
  // Phase station labels (floating text via DOM handled by game.js)
  // Just trees + walls for environment
}

// ── ENVIRONMENT ───────────────────────────────────────────────
function buildEnvironment() {
  // Tighter cluster of trees around the smaller world
  const treePos = [
    [-22,-22],[22,-22],[-24,4],[24,4],[-12,22],[12,22],
    [0,-26],[-26,0],[26,0],[-18,-10],[18,-10],[-8,24],[8,24],
    [-26,-10],[26,10],[-20,16],[20,16],
  ];
  treePos.forEach(([x,z]) => addTree(x,z));

  // Warm stone path
  for (let i = -5; i <= 5; i++) {
    addStone(i * 2.2, 0);
    addStone(0, i * 2.2);
  }

  // Warm lanterns along paths
  const lanternPos = [[-6,0],[6,0],[0,-6],[0,6],[-10,-10],[10,-10],[-10,10],[10,10]];
  lanternPos.forEach(([x,z]) => addLantern(x, z));

  // Flower patches — cozy detail
  const flowerPos = [[-8,-8],[8,-8],[-8,8],[8,8],[-4,-12],[4,-12],[-12,4],[12,4]];
  flowerPos.forEach(([x,z]) => addFlowers(x, z));

  buildWall();
}

function addLantern(x, z) {
  const g = new THREE.Group();
  // Post
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6),
    new THREE.MeshLambertMaterial({ color: 0x3a2410 })
  );
  post.position.y = 0.9; post.castShadow = true;
  g.add(post);
  // Lantern box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.35, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xffe880, emissive: 0xffaa00, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
  );
  box.position.y = 1.95; box.castShadow = true;
  g.add(box);
  // Warm point light
  const light = new THREE.PointLight(0xffaa33, 0.8, 6);
  light.position.y = 2.0;
  g.add(light);
  g.position.set(x, 0, z);
  scene.add(g);
}

function addFlowers(x, z) {
  const colors = [0xff8888, 0xffcc88, 0xffaacc, 0xaaddff];
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const ox = (Math.random() - 0.5) * 1.6;
    const oz = (Math.random() - 0.5) * 1.6;
    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4),
      new THREE.MeshLambertMaterial({ color: 0x4a8a30 })
    );
    stem.position.set(x + ox, 0.175, z + oz);
    scene.add(stem);
    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshLambertMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.15 })
    );
    head.position.set(x + ox, 0.42, z + oz);
    scene.add(head);
  }
}

function addTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 2, 6),
    new THREE.MeshLambertMaterial({ color: 0x5a3418 })
  );
  trunk.position.y = 1; trunk.castShadow = true;
  g.add(trunk);
  // Warm autumn/lush greens
  const leafColors = [0x3d7a2a, 0x4d9a35, 0x2d6020];
  [[2.4,1.8],[3.1,1.3],[3.7,0.8]].forEach(([y,r], i) => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, 1.4, 7),
      new THREE.MeshLambertMaterial({ color: leafColors[i] })
    );
    m.position.y = y; m.castShadow = true;
    g.add(m);
  });
  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  const s = 0.85 + Math.random() * 0.35;
  g.scale.set(s, s, s);
  scene.add(g);
}

function addStone(x, z) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.1, 6),
    new THREE.MeshLambertMaterial({ color: 0x8b6a40 })
  );
  m.position.set(x, 0.05, z);
  m.rotation.y = Math.random() * Math.PI;
  m.receiveShadow = true;
  scene.add(m);
}

function buildWall() {
  const half = WORLD.groundSize / 2 - 1;
  const mat  = new THREE.MeshLambertMaterial({ color: 0x6b4828 });
  [
    [[0, 0.4, -half], [WORLD.groundSize, 0.8, 0.6]],
    [[0, 0.4,  half], [WORLD.groundSize, 0.8, 0.6]],
    [[-half, 0.4, 0], [0.6, 0.8, WORLD.groundSize]],
    [[ half, 0.4, 0], [0.6, 0.8, WORLD.groundSize]],
  ].forEach(([pos, scale]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...scale), mat);
    m.position.set(...pos);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  });
}

// ── LOADER UI ─────────────────────────────────────────────────
function setLoadProgress(p) {
  const b = document.getElementById('loaderBar');
  if (b) b.style.width = p + '%';
}
function hideLoader() {
  const l = document.getElementById('loader');
  if (!l) return;
  l.style.opacity = '0'; l.style.transition = 'opacity 0.8s ease';
  setTimeout(() => l.remove(), 900);
}

// ── RESIZE ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  aspect = w / h;
  camera.left = -FRUSTUM * aspect; camera.right = FRUSTUM * aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ── CAMERA FOLLOW ─────────────────────────────────────────────
const camTarget = new THREE.Vector3();
const CAM_OFFSET = new THREE.Vector3(0, 30, 30);
function updateCamera(pos) {
  camTarget.lerp(pos, 0.06);
  camera.position.copy(camTarget).add(CAM_OFFSET);
  camera.lookAt(camTarget);
}

// ── RAYCASTER ─────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse2d   = new THREE.Vector2();

function screenToRay(clientX, clientY) {
  mouse2d.x =  (clientX / window.innerWidth)  * 2 - 1;
  mouse2d.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse2d, camera);
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  setLoadProgress(10);
  const walkable = buildGround();
  setLoadProgress(25);

  // Load world GLB if provided
  if (!WORLD.usePlaceholder && WORLD.modelPath) {
    console.log('Loading world GLB:', WORLD.modelPath);
    const worldLoader = new GLTFLoader();
    worldLoader.load(WORLD.modelPath, (gltf) => {
      console.log('World GLB loaded');
      _placeholderObjects.forEach(o => { o.visible = false; });
      const worldModel = gltf.scene;
      const colliders  = [];
      const _box       = new THREE.Box3();

      worldModel.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(m => {
            if (m.transparent || m.alphaTest > 0) {
              m.alphaTest   = 0.2;
              m.transparent = false;
              m.depthWrite  = true;
            }
          });

          // Build bounding circle collider for solid objects
          // Skip ground-like meshes (very flat, large) and small decorative ones
          _box.setFromObject(c);
          const size   = new THREE.Vector3();
          _box.getSize(size);
          const center = new THREE.Vector3();
          _box.getCenter(center);
          const radius = Math.max(size.x, size.z) * 0.5;

          // Only collidable if: taller than 0.5m, radius between 0.3 and 8
          // Excludes ground planes (too flat) and huge terrain meshes (too large)
          if (size.y > 1.0 && radius > 0.3 && radius < 8) {
            colliders.push({ x: center.x, z: center.z, r: radius * 0.75 });
          }
        }
      });

      scene.add(worldModel);

      // Filter out any collider overlapping the spawn point
      const spawnX = 0, spawnZ = 6;
      const filtered = colliders.filter(c => {
        const dx = spawnX - c.x;
        const dz = spawnZ - c.z;
        return Math.sqrt(dx*dx + dz*dz) > c.r + 1.0;
      });

      character.addColliders(filtered);
      console.log(`World colliders added: ${filtered.length}, total: ${character.getColliderCount()}`);
    }, undefined, err => console.error('World GLB load error:', err));
  }

  if (WORLD.usePlaceholder) buildEnvironment();
  setLoadProgress(45);

  // Game systems
  const gameState    = new GameState();
  const resMgr       = new ResourceManager(scene, gameState);
  if (WORLD.resourceModels) resMgr.loadModels(WORLD.resourceModels, new GLTFLoader());
  const stationMgr   = new PhaseStationManager(scene, gameState);
  const monument     = new CenterMonument(scene, gameState);
  setLoadProgress(65);

  const character    = new Character(scene, walkable, { x: 0, z: 6 });
  if (WORLD.characterPath) character.loadModel(WORLD.characterPath);
  setLoadProgress(75);

  // Load individual buildings — auto-detect position from bounding box
  const BUILDINGS = [
    { file: 'assets/building_initiation.glb', phaseId: 'initiation' },
    { file: 'assets/building_planning.glb',   phaseId: 'planning'   },
    { file: 'assets/building_execution.glb',  phaseId: 'execution'  },
    { file: 'assets/building_monitoring.glb', phaseId: 'monitoring' },
    { file: 'assets/building_closure.glb',    phaseId: 'closure'    },
    { file: 'assets/building_house.glb',      phaseId: null         },
  ];

  let _houseModel    = null;
  let _houseTargetY  = -100;
  let _houseCurrentY = -100;
  let _houseRising   = false;

  BUILDINGS.forEach(({ file, phaseId }) => {
    const loader = new GLTFLoader();
    loader.load(file, (gltf) => {
      const model = gltf.scene;
      model.traverse(c => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        if (c.isSkinnedMesh || c.type === 'Bone') c.visible = false;
      });

      const box    = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      const size   = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const radius = Math.max(size.x, size.z) * 0.5;

      if (!phaseId) {
        // House — start underground, rise on game-complete
        model.position.y = -100;
        _houseModel      = model;
        console.log(`house → x:${center.x.toFixed(1)}, z:${center.z.toFixed(1)}`);
      } else {
        stationMgr.updatePosition(phaseId, center.x, center.z);
        console.log(`${phaseId} → x:${center.x.toFixed(1)}, z:${center.z.toFixed(1)}, r:${radius.toFixed(1)}`);
      }

      scene.add(model);

      if (!phaseId) {
        // Don't add house collider yet — house is underground
        // Collider gets added when house rises on game-complete
        gameState.on('game-complete', () => {
          setTimeout(() => {
            character.addColliders([{ x: center.x, z: center.z, r: radius * 0.75 }]);
          }, 4000); // add after house has fully risen
        });
      } else {
        character.addColliders([{ x: center.x, z: center.z, r: radius * 0.75 }]);
      }
    }, undefined, err => console.error(`Failed to load ${file}:`, err));
  });

  // UI systems
  const backpackUI   = new BackpackUI(gameState);
  const phasePanelUI = new PhasePanelUI(gameState);
  const progressUI   = new ProgressUI(gameState);
  const reveal       = new PortfolioReveal(gameState);
  const audio        = new AudioSystem(SITE.music);
  setLoadProgress(90);

  // Phase toast + sound on completion
  gameState.on('phase-complete', phaseId => {
    const phase = PHASES.find(p => p.id === phaseId);
    if (phase) showPhaseReveal(phase);
    audio.playSFX('phase_complete', 0.8);
  });

  // House rises + game complete sound
  gameState.on('game-complete', () => {
    _houseTargetY = 0;
    _houseRising  = true;
    audio.playSFX('game_complete', 1.0);
  });

  // Resource collection sound — hook into GameState collectResource
  const _origCollect = gameState.collectResource.bind(gameState);
  gameState.collectResource = (typeId) => {
    const result = _origCollect(typeId);
    if (result) audio.playSFX('collect', 0.6);
    return result;
  };

  // Update backpack count display
  gameState.on('backpack-changed', items => {
    const el = document.getElementById('bp-count');
    if (el) el.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  });

  // Notify player when backpack is full and they walk over a resource
  let _fullToastCooldown = false;
  resMgr._onFull = () => {
    if (_fullToastCooldown) return;
    _fullToastCooldown = true;
    showInfoToast('Backpack is too heavy... I need to allocate my resources.');
    setTimeout(() => { _fullToastCooldown = false; }, 2500);
  };
  window.__commitResource = (typeId, phaseId) => {
    gameState.commitResource(typeId, phaseId);
  };
  window.__depositAll = (phaseId) => {
    gameState.depositAll(phaseId);
  };
  // Console helper — run window.__charPos() to get current position
  window.__charPos = () => {
    const p = character.getPosition();
    console.log(`x: ${p.x.toFixed(1)}, z: ${p.z.toFixed(1)}`);
    return { x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
  };

  // Input
  // Auto-open portfolio if URL hash is #portfolio
  if (window.location.hash === '#portfolio') {
    setTimeout(() => reveal.show(), 500);
  }
  let tutorialDismissed = false;
  const tutorialEl = document.getElementById('tutorial-overlay');

  function dismissTutorial() {
    if (tutorialDismissed) return;
    tutorialDismissed = true;
    tutorialEl.classList.add('dismissing');
    setTimeout(() => tutorialEl.classList.add('hidden'), 420);
    // Show skip button after tutorial gone
    setTimeout(() => document.getElementById('skip-btn').classList.add('show'), 500);
  }

  // ── Hold-to-move input system ─────────────────────────────
  let _holding     = false;
  let _holdX       = 0;
  let _holdZ       = 0;
  let _holdTimer   = null;

  function raycastMove(clientX, clientY) {
    screenToRay(clientX, clientY);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      if (hit.object.name === 'walkable') {
        character.moveTo(hit.point);
        return true;
      }
    }
    return false;
  }

  const HOLD_INTERVAL = isMobile ? 120 : 80;

  function startHold(clientX, clientY) {
    dismissTutorial();
    _holding = true;
    raycastMove(clientX, clientY);
    _holdTimer = setInterval(() => {
      if (_holding) raycastMove(clientX, clientY);
    }, HOLD_INTERVAL);
  }

  function updateHold(clientX, clientY) {
    if (!_holding) return;
    clearInterval(_holdTimer);
    raycastMove(clientX, clientY);
    _holdTimer = setInterval(() => {
      if (_holding) raycastMove(clientX, clientY);
    }, HOLD_INTERVAL);
  }

  function endHold() {
    _holding = false;
    clearInterval(_holdTimer);
  }

  // Dismiss tutorial on overlay click or any canvas interaction
  tutorialEl.addEventListener('click', dismissTutorial);
  tutorialEl.addEventListener('touchstart', dismissTutorial);

  // Mouse
  canvas.addEventListener('mousedown', e => startHold(e.clientX, e.clientY));
  canvas.addEventListener('mousemove', e => { if (_holding) updateHold(e.clientX, e.clientY); });
  canvas.addEventListener('mouseup',   () => endHold());
  canvas.addEventListener('mouseleave',() => endHold());

  // Touch
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.touches[0];
    startHold(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    updateHold(t.clientX, t.clientY);
  }, { passive: false });

  canvas.addEventListener('touchend', () => endHold(), { passive: false });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') phasePanelUI.hide();
  });

  // Pre-compile all shaders before gameplay
  renderer.compile(scene, camera);

  // Show intro prompt after loader fades
  setLoadProgress(100);
  setTimeout(() => {
    hideLoader();
  }, 400);

  // ── Phase reveal toast ──────────────────────────────────────
  function showPhaseReveal(phase) {
    const toast = document.createElement('div');
    toast.className = 'phase-toast';
    toast.innerHTML = `
      <div class="pt-toast-icon">${phase.icon}</div>
      <div class="pt-toast-title">${phase.reveal.title}</div>
      <div class="pt-toast-body">${phase.reveal.body}</div>
      <div class="pt-toast-hint">Tap anywhere to continue</div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 50);

    const dismiss = () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
      document.removeEventListener('click',      dismiss);
      document.removeEventListener('touchstart', dismiss);
    };

    // Small delay before listening so the click that triggered
    // the phase completion doesn't immediately dismiss it
    setTimeout(() => {
      document.addEventListener('click',      dismiss);
      document.addEventListener('touchstart', dismiss);
    }, 800);
  }

  // ── Info toast (backpack full, etc) ───────────────────────
  function showInfoToast(message) {
    const toast = document.createElement('div');
    toast.className = 'info-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 50);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  // ── PROXIMITY MARKERS (Option A) ──────────────────────────
  const _markerContainer = document.getElementById('proximity-markers');
  const _markers = {};
  const _markerVec = new THREE.Vector3();

  PHASES.forEach(phase => {
    const el = document.createElement('div');
    el.className = 'prox-marker';
    el.innerHTML = `<span class="prox-marker-icon">⬇</span>
                    <span class="prox-marker-label">${phase.label}</span>`;
    el.id = `marker-${phase.id}`;
    _markerContainer.appendChild(el);
    _markers[phase.id] = el;
  });

  function updateMarkerPositions() {
    PHASES.forEach(phase => {
      const el = _markers[phase.id];
      if (!el.classList.contains('visible')) return;
      _markerVec.set(phase.position.x, 4, phase.position.z);
      _markerVec.project(camera);
      el.style.left = (( _markerVec.x * 0.5 + 0.5) * window.innerWidth)  + 'px';
      el.style.top  = ((-_markerVec.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    });
  }

  function updateMarkers(nearPhaseId) {
    PHASES.forEach(phase => {
      const el     = _markers[phase.id];
      const status = gameState.getPhaseStatus(phase.id);
      if (status === 'complete') { el.classList.remove('visible'); return; }
      _markerVec.set(phase.position.x, 4, phase.position.z);
      _markerVec.project(camera);
      el.style.left = (( _markerVec.x * 0.5 + 0.5) * window.innerWidth)  + 'px';
      el.style.top  = ((-_markerVec.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      if (phase.id === nearPhaseId) el.classList.remove('visible');
      else el.classList.add('visible');
    });
  }
  const clock  = new THREE.Clock();
  const _pos   = new THREE.Vector3(); // reused every frame — no allocation
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    character.getPositionInto(_pos);
    character.update(dt);
    resMgr.update(dt, _pos);
    monument.update(dt);
    updateCamera(_pos);

    // Animate house rising from ground at fixed speed
    if (_houseRising && _houseModel) {
      _houseCurrentY = Math.min(_houseCurrentY + dt * 40, _houseTargetY);
      _houseModel.position.y = _houseCurrentY;
      if (_houseCurrentY >= _houseTargetY) {
        _houseModel.position.y = _houseTargetY;
        _houseRising = false;
      }
    }

    // Phase proximity
    const nearPhase = stationMgr.checkProximity(_pos);
    stationMgr.update(dt, nearPhase);
    if (nearPhase !== gameState.nearPhase) {
      gameState.nearPhase = nearPhase;
      if (nearPhase) phasePanelUI.show(nearPhase);
      else           phasePanelUI.hide();
      updateMarkers(nearPhase);
    }
    updateMarkerPositions();

    renderer.render(scene, camera);
  }
  loop();
}

function updateBpCount(gameState) {
  const el = document.getElementById('bp-count');
  if (el) el.textContent = `${gameState.backpack.length} item${gameState.backpack.length !== 1 ? 's' : ''}`;
}

init();
