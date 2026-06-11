// ============================================================
//  game.js — Game state, resource collection, phase system,
//             backpack UI, phase panel, portfolio reveal
// ============================================================

import * as THREE from 'three';

// ── RESOURCE DEFINITIONS ──────────────────────────────────────
export const RESOURCE_TYPES = {
  people: { id: 'people', label: 'People', icon: '👤', color: 0x4499ff },
  budget: { id: 'budget', label: 'Budget', icon: '🪙', color: 0xffcc44 },
  time:   { id: 'time',   label: 'Time',   icon: '⏳', color: 0xcc99ff },
};

// ── PHASE DEFINITIONS ─────────────────────────────────────────
// Regular pentagon, radius 16, clockwise on screen from left.
// Camera looks along -Z axis, so screen-clockwise = world counter-clockwise in XZ.
// Angles from +X, counter-clockwise: 180°→252°→324°→36°→108°
// Result on screen: Left → Bottom-left → Bottom-right → Right → Top-right ... 
// giving a natural clockwise flow starting from the left station.
export const PHASES = [
  {
    id: 'initiation',
    label: 'Initiation',
    icon: '🔵',
    position: { x: -14.3, z: 1.9 },
    requires: ['people', 'people', 'time'],
    color: 0x4488ff,
    reveal: {
      title: 'Initiation Complete',
      body: 'This is where the idea becomes a real project. I get the right people in the room, define what we\'re actually building, and make sure everyone starts from the same page.',
    },
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: '🟡',
    position: { x: -6.8, z: -10.3 },
    requires: ['time', 'time', 'time'],
    color: 0xffcc00,
    reveal: {
      title: 'Planning Complete',
      body: 'Before anyone ships anything, I map out how we get there. Timelines, dependencies, risks all figured out before they become problems.',
    },
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: '🟠',
    position: { x: 9.7, z: -8.9 },
    requires: ['people', 'budget', 'time'],
    color: 0xff8800,
    reveal: {
      title: 'Execution Complete',
      body: 'This is where the work actually happens. I keep the team moving, remove what\'s in their way, and make sure nothing falls through the cracks.',
    },
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: '🟣',
    position: { x: 10.2, z: 9.4 },
    requires: ['people', 'budget', 'time'],
    color: 0xaa44ff,
    reveal: {
      title: 'Monitoring Complete',
      body: 'Things change. I keep an eye on what\'s happening, catch issues early, and adjust the plan when reality doesn\'t match expectations.',
    },
  },
  {
    id: 'closure',
    label: 'Closure',
    icon: '🟢',
    position: { x: -4.6, z: 9.4 },
    requires: ['people', 'people', 'people'],
    color: 0x44dd88,
    reveal: {
      title: 'Closure Complete',
      body: 'The work is done but the project isn\'t over. I make sure everything is handed off properly, lessons are captured, and nothing is left hanging.',
    },
  },
];

// ── RESOURCE SPAWN POSITIONS ──────────────────────────────────
// Total needed: 8 People · 2 Budget · 5 Time — extras for buffer
// Each cluster fans outward from the station along its pentagon radius.
export const RESOURCE_SPAWNS = [
  // Near Initiation (-14.3, 1.9) — needs 2 people + 1 time
  { type: 'people', pos: { x: -19,   z:  1.9  } },
  { type: 'people', pos: { x: -17.5, z: -1.5  } },
  { type: 'time',   pos: { x: -17.5, z:  5.0  } },

  // Near Planning (-6.8, -10.3) — needs 3 time
  { type: 'time',   pos: { x: -6.8,  z: -15.5 } },
  { type: 'time',   pos: { x: -10.5, z: -13.0 } },
  { type: 'time',   pos: { x: -3.5,  z: -13.0 } },

  // Near Execution (9.7, -8.9) — needs 1 people + 1 budget + 1 time
  { type: 'people', pos: { x: 13.5,  z: -11.5 } },
  { type: 'budget', pos: { x: 14.0,  z:  -7.0 } },
  { type: 'time',   pos: { x: 10.5,  z: -14.0 } },

  // Near Monitoring (10.2, 9.4) — needs 1 people + 1 budget + 1 time
  { type: 'people', pos: { x: 14.5,  z:  9.4  } },
  { type: 'budget', pos: { x: 13.0,  z: 13.0  } },
  { type: 'time',   pos: { x: 13.0,  z:  6.0  } },

  // Near Closure (-4.6, 9.4) — needs 3 people
  { type: 'people', pos: { x: -4.6,  z: 14.5  } },
  { type: 'people', pos: { x: -8.0,  z: 12.5  } },
  { type: 'people', pos: { x: -1.5,  z: 12.5  } },

  // Center buffer orbs — visible from spawn
  { type: 'people', pos: { x:  4,    z:  3    } },
  { type: 'time',   pos: { x: -4,    z:  3    } },
  { type: 'budget', pos: { x:  0,    z: -4    } },
  { type: 'people', pos: { x: -3,    z: -3    } },
  { type: 'time',   pos: { x:  3,    z: -3    } },
];

// ── GAME STATE ────────────────────────────────────────────────
export class GameState {
  constructor() {
    this.backpack    = [];
    this.committed   = {};
    this.phaseStatus = {};
    this.nearPhase   = null;
    this._listeners  = {};

    PHASES.forEach((p, i) => {
      this.phaseStatus[p.id] = i === 0 ? 'active' : 'locked';
      this.committed[p.id]   = [];
    });
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  collectResource(typeId) {
    if (this.backpack.length >= 10) return false;
    this.backpack.push(typeId);
    this.emit('backpack-changed', this.backpack);
    return true;
  }

  // Commit exactly one resource of typeId to phaseId
  commitResource(typeId, phaseId) {
    const phase = PHASES.find(p => p.id === phaseId);
    if (!phase) return false;
    if (this.phaseStatus[phaseId] !== 'active') return false;
    if (!phase.requires.includes(typeId)) return false;
    if (!this.backpack.includes(typeId)) return false;

    const needed    = phase.requires.filter(r => r === typeId).length;
    const committed = this.committed[phaseId].filter(r => r === typeId).length;
    if (committed >= needed) return false;

    const idx = this.backpack.indexOf(typeId);
    this.backpack.splice(idx, 1);
    this.committed[phaseId].push(typeId);
    this.emit('backpack-changed', this.backpack);
    this.emit('phase-updated', phaseId);

    // Auto-complete when all slots filled
    if (this._requirementsMet(phase, this.committed[phaseId])) {
      this._completePhase(phaseId);
    }

    return true;
  }

  // Deposit button — commit all available matching resources at once
  depositAll(phaseId) {
    const phase = PHASES.find(p => p.id === phaseId);
    if (!phase || this.phaseStatus[phaseId] !== 'active') return;

    // Figure out what's still needed (multiset subtraction)
    const stillNeeded = [...phase.requires];
    for (const c of this.committed[phaseId]) {
      const i = stillNeeded.indexOf(c);
      if (i !== -1) stillNeeded.splice(i, 1);
    }
    for (const typeId of stillNeeded) {
      this.commitResource(typeId, phaseId);
    }
  }

  // Multiset check: does committed satisfy all of phase.requires?
  _requirementsMet(phase, committed) {
    const remaining = [...committed];
    for (const req of phase.requires) {
      const i = remaining.indexOf(req);
      if (i === -1) return false;
      remaining.splice(i, 1);
    }
    return true;
  }

  _completePhase(phaseId) {
    this.phaseStatus[phaseId] = 'complete';
    this.emit('phase-complete', phaseId);

    const idx = PHASES.findIndex(p => p.id === phaseId);
    if (idx + 1 < PHASES.length) {
      const nextId = PHASES[idx + 1].id;
      this.phaseStatus[nextId] = 'active';
      this.emit('phase-unlocked', nextId);
    }

    if (PHASES.every(p => this.phaseStatus[p.id] === 'complete')) {
      setTimeout(() => this.emit('game-complete', null), 5000);
    }
  }

  committedCount(phaseId, typeId) {
    return (this.committed[phaseId] || []).filter(r => r === typeId).length;
  }

  requiredCount(phaseId, typeId) {
    const phase = PHASES.find(p => p.id === phaseId);
    return phase ? phase.requires.filter(r => r === typeId).length : 0;
  }

  isPhaseResourceMet(phaseId, typeId) {
    return this.committedCount(phaseId, typeId) >= this.requiredCount(phaseId, typeId);
  }

  hasResource(typeId) { return this.backpack.includes(typeId); }
  getPhase(id)        { return PHASES.find(p => p.id === id); }
  getPhaseStatus(id)  { return this.phaseStatus[id]; }
}

// ── RESOURCE OBJECTS IN WORLD ─────────────────────────────────
export class ResourceManager {
  constructor(scene, gameState) {
    this.scene   = scene;
    this.state   = gameState;
    this._items  = [];
    this._dying  = [];
    this._models = {};  // typeId → THREE.Object3D template
    RESOURCE_SPAWNS.forEach((spawn, idx) => this._spawnResource(spawn, idx));
  }

  // Call after construction to swap orbs for custom GLBs
  // paths: { people: 'assets/people.glb', budget: '...', time: '...' }
  loadModels(paths, loader) {
    Object.entries(paths).forEach(([typeId, path]) => {
      loader.load(path, (gltf) => {
        // Measure and normalise to ~1 unit tall
        const box  = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.max.y - box.min.y;
        if (size > 0) gltf.scene.scale.setScalar(1.0 / size);
        this._models[typeId] = gltf.scene;

        // Swap all existing spawned orbs of this type for the custom model
        this._items.forEach(item => {
          if (item.typeId !== typeId || item.collected) return;
          while (item.group.children.length) item.group.remove(item.group.children[0]);
          const clone = this._models[typeId].clone();
          clone.traverse(c => { if (c.isMesh) c.castShadow = true; });
          item.group.add(clone);
          const def   = RESOURCE_TYPES[typeId];
          const light = new THREE.PointLight(def.color, 0.6, 5);
          item.group.add(light);
          item.mat     = null;
          item.ringMat = null;
          item.custom  = true;
          item.group.visible = true; // show now that real model is ready
        });
        console.log(`Resource model loaded: ${typeId}`);
      }, undefined, err => console.error(`Resource model failed: ${path}`, err));
    });
  }

  _spawnResource({ type, pos }, idx) {
    const def   = RESOURCE_TYPES[type];
    const group = new THREE.Group();

    const mat = new THREE.MeshLambertMaterial({
      color: def.color, emissive: def.color,
      emissiveIntensity: 0.65, transparent: true, opacity: 0.95,
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 14), mat);
    orb.castShadow = true;
    group.add(orb);

    const ringMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.55 });
    const ring    = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const light = new THREE.PointLight(def.color, 0.6, 5);
    group.add(light);

    group.position.set(pos.x, 1.3, pos.z);
    group.name = `resource_${type}_${idx}`;
    group.visible = false; // hidden until custom GLB loads
    this.scene.add(group);

    this._items.push({ typeId: type, group, mat, ringMat, collected: false, bobPhase: Math.random() * Math.PI * 2 });
  }

  update(dt, charPos) {
    const t = performance.now() * 0.001;
    const PICK_DIST_SQ = 2.5 * 2.5;

    for (const item of this._items) {
      if (item.collected) continue;
      const { group, bobPhase } = item;
      group.position.y  = 1.3 + Math.sin(t * 1.5 + bobPhase) * 0.25;
      group.rotation.y += dt * 1.0;
      const dx = charPos.x - group.position.x;
      const dz = charPos.z - group.position.z;
      if (dx*dx + dz*dz < PICK_DIST_SQ) {
        if (this.state.backpack.length >= 10) {
          this._onFull && this._onFull();
        } else {
          item.collected    = true;
          group.position.y  = -100;
          this.state.collectResource(item.typeId);
        }
      }
    }
  }
}

// ── PHASE STATION OBJECTS IN WORLD ────────────────────────────
export class PhaseStationManager {
  constructor(scene, gameState) {
    this.scene     = scene;
    this.state     = gameState;
    this._stations = new Map();

    PHASES.forEach(phase => this._buildStation(phase));
    gameState.on('phase-complete', id => this._activateGlow(id));
    gameState.on('phase-unlocked', id => this._setUnlocked(id));
  }

  _buildStation(phase) {
    const group = new THREE.Group();
    group.position.set(phase.position.x, 0, phase.position.z);
    group.name = `station_${phase.id}`;

    // Pre-create completion light at zero intensity — shader compiled at startup
    const light = new THREE.PointLight(phase.color, 0, 12);
    light.position.y = 6;
    group.add(light);

    this.scene.add(group);
    this._stations.set(phase.id, { group, light, complete: false });
    if (phase.id === 'initiation') this._setUnlocked(phase.id);
  }

  _setUnlocked(phaseId) {
    // Visual handled by world GLB buildings
  }

  _activateGlow(phaseId) {
    const s = this._stations.get(phaseId);
    if (!s) return;
    s.complete = true;
    // Just turn on the pre-existing light — no new objects added to scene
    s.light.intensity = 2.0;
  }

  update(dt, nearPhaseId) {
    // No per-frame updates needed
  }

  // Called after building GLB loads to sync position with actual mesh center
  updatePosition(phaseId, x, z) {
    const s = this._stations.get(phaseId);
    if (s) s.group.position.set(x, 0, z);
    const phase = PHASES.find(p => p.id === phaseId);
    if (phase) { phase.position.x = x; phase.position.z = z; }
  }

  checkProximity(charPos) {
    const radius = typeof isMobile !== 'undefined' && isMobile ? 8.0 : 6.0;
    let nearest = null;
    let nearestDist = Infinity;
    for (const phase of PHASES) {
      const dx   = charPos.x - phase.position.x;
      const dz   = charPos.z - phase.position.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < radius && dist < nearestDist) {
        nearestDist = dist;
        nearest = phase.id;
      }
    }
    return nearest;
  }
}

// ── CENTER MONUMENT ───────────────────────────────────────────
export class CenterMonument {
  constructor(scene, gameState) {
    this.scene   = scene;
    this._active = false;
    this._gem    = null;
    this._gemMat = null;
    this._spireMat = null;
    this._group  = null;

    this._buildDormant();
    gameState.on('game-complete', () => this._activate());
  }

  _buildDormant() {
    const group = new THREE.Group();
    group.name  = 'center-monument';
    group.position.set(0, 0, 0);

    // Pre-create all completion lights at zero intensity
    // so their shaders compile at startup, not on game-complete
    this._topLight = new THREE.PointLight(0xffcc44, 0, 40);
    this._topLight.position.set(0, 10, 0);
    group.add(this._topLight);

    this._phaseLights = PHASES.map((phase, i) => {
      const angle = (i / PHASES.length) * Math.PI * 2;
      const l = new THREE.PointLight(phase.color, 0, 20);
      l.position.set(Math.cos(angle) * 3, 6, Math.sin(angle) * 3);
      group.add(l);
      return l;
    });

    this.scene.add(group);
    this._group = group;
  }

  _activate() {
    this._active = true;
    // Just turn on pre-existing lights — no new scene objects
    this._topLight.intensity = 4.0;
    this._phaseLights.forEach(l => { l.intensity = 1.5; });
    this._spawnParticles();
  }

  _spawnParticles() {
    const colors = [0xffdd88, 0xff8844, 0x44ccff, 0x88ff88, 0xcc88ff];
    for (let i = 0; i < 80; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true });
      const m   = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.1;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = 0.06 + Math.random() * 0.12;
      m.position.set((Math.random()-0.5)*3, 7 + Math.random()*4, (Math.random()-0.5)*3);
      this.scene.add(m);
      let life = 0;
      const anim = () => {
        life += 0.018;
        m.position.x += vx; m.position.y += vy - life * 0.035; m.position.z += vz;
        mat.opacity = Math.max(0, 1 - life * 0.65);
        if (life < 1.6) requestAnimationFrame(anim);
        else this.scene.remove(m);
      };
      setTimeout(() => requestAnimationFrame(anim), i * 25);
    }
  }

  update(dt) {
    // Nothing to animate on the monument itself — world GLB handles the visuals
    // Lights added on completion animate naturally via Three.js
  }
}

// ── BACKPACK UI ───────────────────────────────────────────────
export class BackpackUI {
  constructor(gameState) {
    this.state    = gameState;
    this._grid    = document.getElementById('backpack-grid');
    this._slots   = [];
    this._count   = 10;
    this._dirty   = false;
    this._last    = 0;

    for (let i = 0; i < this._count; i++) {
      const slot = document.createElement('div');
      slot.className = 'bp-slot empty';
      slot.innerHTML = '<span class="bp-icon"></span>';
      this._grid.appendChild(slot);
      this._slots.push(slot);
    }

    gameState.on('backpack-changed', () => { this._dirty = true; });

    // Update on a throttled interval — max once per 100ms
    setInterval(() => {
      if (!this._dirty) return;
      this._dirty = false;
      this._update(gameState.backpack);
    }, 100);
  }

  _update(items) {
    for (let i = 0; i < this._count; i++) {
      const slot   = this._slots[i];
      const typeId = items[i];
      if (typeId) {
        const def = RESOURCE_TYPES[typeId];
        if (!slot.classList.contains('filled')) {
          slot.classList.remove('empty');
          slot.classList.add('filled');
        }
        slot.querySelector('.bp-icon').textContent = def.icon;
        slot.title = def.label;
      } else {
        if (!slot.classList.contains('empty')) {
          slot.classList.remove('filled');
          slot.classList.add('empty');
        }
        slot.querySelector('.bp-icon').textContent = '';
        slot.title = '';
      }
    }
  }
}

// ── PHASE PANEL UI ────────────────────────────────────────────
export class PhasePanelUI {
  constructor(gameState) {
    this.state    = gameState;
    this._el      = document.getElementById('phase-panel');
    this._visible = false;
    this._current = null;

    gameState.on('phase-updated',    id => { if (this._current === id) this.show(id); });
    gameState.on('backpack-changed', ()  => { if (this._visible && this._current) this.show(this._current); });
    gameState.on('phase-complete',   id => { if (this._current === id) this.show(id); });
    gameState.on('phase-unlocked',   id => { if (this._current === id) this.show(id); });
  }

  show(phaseId) {
    this._current = phaseId;
    const phase  = PHASES.find(p => p.id === phaseId);
    const status = this.state.getPhaseStatus(phaseId);
    if (!phase) { this.hide(); return; }

    // ── LOCKED: show which phase to complete first ─────────────
    if (status === 'locked') {
      const idx       = PHASES.findIndex(p => p.id === phaseId);
      const prevPhase = idx > 0 ? PHASES[idx - 1] : null;
      this._el.innerHTML = `
        <div class="pp-header pp-locked-header">
          <span class="pp-phase-icon">${phase.icon}</span>
          <span class="pp-phase-label">${phase.label}</span>
        </div>
        <div class="pp-divider"></div>
        <div class="pp-locked-msg">
          🔒 Locked
          ${prevPhase ? `<div class="pp-locked-hint">Complete <strong>${prevPhase.icon} ${prevPhase.label}</strong> first</div>` : ''}
        </div>
      `;
      this._show();
      return;
    }

    // ── COMPLETE ───────────────────────────────────────────────
    if (status === 'complete') {
      this._el.innerHTML = `
        <div class="pp-header">
          <span class="pp-phase-icon">${phase.icon}</span>
          <span class="pp-phase-label">${phase.label}</span>
        </div>
        <div class="pp-divider"></div>
        <div class="pp-complete-msg">✅ Phase complete!</div>
      `;
      this._show();
      return;
    }

    // ── ACTIVE: per-slot multiset display + Deposit button ─────
    const committedSoFar = [...(this.state.committed[phaseId] || [])];
    const backpackAvail  = [...this.state.backpack];
    let allCommitted = true;
    let canDeposit   = false;

    const reqHtml = phase.requires.map(typeId => {
      const def = RESOURCE_TYPES[typeId];

      // Already committed?
      const ci = committedSoFar.indexOf(typeId);
      if (ci !== -1) {
        committedSoFar.splice(ci, 1);
        return `<div class="req-item req-committed">
                  <span class="req-icon">${def.icon}</span>
                  <span class="req-label">${def.label}</span>
                  <span class="req-status">✓</span>
                </div>`;
      }

      allCommitted = false;

      // In backpack?
      const bi = backpackAvail.indexOf(typeId);
      if (bi !== -1) {
        backpackAvail.splice(bi, 1);
        canDeposit = true;
        return `<div class="req-item req-available" onclick="window.__commitResource('${typeId}','${phaseId}')">
                  <span class="req-icon">${def.icon}</span>
                  <span class="req-label">${def.label}</span>
                  <span class="req-status">Click to deposit</span>
                </div>`;
      }

      // Missing
      return `<div class="req-item req-missing">
                <span class="req-icon">${def.icon}</span>
                <span class="req-label">${def.label}</span>
                <span class="req-status">Not found yet</span>
              </div>`;
    }).join('');

    const footer = allCommitted
      ? ''
      : canDeposit
        ? `<button class="pp-lockin-btn" onclick="window.__depositAll('${phaseId}')">⬇ Deposit Resources</button>`
        : `<div class="pp-missing-hint">Collect missing resources to continue</div>`;

    this._el.innerHTML = `
      <div class="pp-header">
        <span class="pp-phase-icon">${phase.icon}</span>
        <span class="pp-phase-label">${phase.label}</span>
      </div>
      <div class="pp-divider"></div>
      <div class="pp-subtitle">Required to activate:</div>
      <div class="pp-requirements">${reqHtml}</div>
      ${footer}
    `;

    this._show();
  }

  _show() {
    this._el.classList.remove('hidden');
    this._el.classList.add('visible');
    this._visible = true;
  }

  hide() {
    if (!this._visible) return;
    this._el.classList.remove('visible');
    setTimeout(() => this._el.classList.add('hidden'), 300);
    this._visible = false;
    this._current = null;
  }
}

// ── PROGRESS TRACKER UI ───────────────────────────────────────
export class ProgressUI {
  constructor(gameState) {
    this.state = gameState;
    this._el   = document.getElementById('progress-tracker');
    gameState.on('phase-complete', () => this.render());
    gameState.on('phase-unlocked', () => this.render());
    this.render();
  }

  render() {
    let html = '<div class="pt-title">Project Lifecycle</div>';
    PHASES.forEach(phase => {
      const status = this.state.getPhaseStatus(phase.id);
      const cls = status === 'complete' ? 'pt-complete'
                : status === 'active'   ? 'pt-active'
                : 'pt-locked';
      html += `<div class="pt-item ${cls}">
                 <span class="pt-dot"></span>
                 <span class="pt-label">${phase.icon} ${phase.label}</span>
               </div>`;
    });
    this._el.innerHTML = html;
  }
}

// ── PORTFOLIO REVEAL ──────────────────────────────────────────
export class PortfolioReveal {
  constructor(gameState) {
    // House rises on game-complete (~2.5s) then wait 5 more seconds before showing resume
    gameState.on('game-complete', () => setTimeout(() => this.show(), 5000));
    document.getElementById('skip-btn').addEventListener('click', () => this.show());
  }

  show() {
    const el   = document.getElementById('portfolio-reveal');
    const skip = document.getElementById('skip-btn');
    if (skip) skip.classList.add('dismissed');
    el.classList.remove('hidden');
    el.classList.add('visible');
    document.getElementById('portfolio-close').addEventListener('click', () => {
      el.classList.remove('visible');
      setTimeout(() => el.classList.add('hidden'), 400);
    });
  }
}
