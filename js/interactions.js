// ============================================================
//  interactions.js — Proximity detection, highlight, modals
// ============================================================

import * as THREE from 'three';
import { OBJECTS } from './content.js';

export class InteractionSystem {
  constructor(scene, camera, character, objects) {
    this.scene     = scene;
    this.camera    = camera;
    this.character = character;
    this.objects   = objects;

    this._near      = null;   // currently nearby zone id
    this._modalOpen = false;

    // Glow material for highlighted objects — white for B&W theme
    this._glowMat = new THREE.MeshLambertMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25,
    });
    this._originalMats = new Map(); // meshName → original material

    // Build interaction markers (floating rings above objects)
    this._markers = new Map();
    objects.forEach(obj => this._buildMarker(obj));

    // Wire up modal close button
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-backdrop').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-backdrop')) this.closeModal();
    });

    // Show one-time intro hint
    this._showIntroPrompt();
  }

  // ── Floating ring marker above each object ────────────────
  _buildMarker(obj) {
    const geo   = new THREE.TorusGeometry(0.55, 0.06, 8, 32);
    const mat   = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    });
    const ring  = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(obj.position.x, 0.1, obj.position.z);
    ring.name = `marker_${obj.id}`;
    this.scene.add(ring);
    this._markers.set(obj.id, { ring, mat, phase: Math.random() * Math.PI * 2 });
  }

  // ── Per-frame update ──────────────────────────────────────
  update(charPos) {
    const t   = performance.now() * 0.001;
    let nearId = null;

    this.objects.forEach(obj => {
      const dx   = charPos.x - obj.position.x;
      const dz   = charPos.z - obj.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const near = dist < obj.radius;
      const m    = this._markers.get(obj.id);

      if (near && !nearId) nearId = obj.id;

      // Animate ring
      if (m) {
        const targetOpacity = near ? 0.85 : (dist < obj.radius * 1.6 ? 0.3 : 0);
        m.mat.opacity += (targetOpacity - m.mat.opacity) * 0.08;
        m.ring.position.y = 0.12 + Math.sin(t * 1.8 + m.phase) * 0.06;
        m.ring.rotation.z += 0.012;
      }

      // Glow the mesh
      this._setGlow(obj, near);
    });

    // Proximity changed
    if (nearId !== this._near) {
      this._near = nearId;
      this._updatePrompt(nearId);
    }

    // Auto-open modal when very close and stopped
    if (nearId && !this._modalOpen && !this.character.isMoving()) {
      const obj  = this.objects.find(o => o.id === nearId);
      const dx   = charPos.x - obj.position.x;
      const dz   = charPos.z - obj.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < obj.radius * 0.55) this.openModal(nearId);
    }
  }

  // ── Glow toggle ───────────────────────────────────────────
  _setGlow(obj, on) {
    const mesh = this.scene.getObjectByName(obj.meshName);
    if (!mesh) return;

    if (on && !this._originalMats.has(obj.meshName)) {
      this._originalMats.set(obj.meshName, mesh.material);
      mesh.material = this._glowMat;
    } else if (!on && this._originalMats.has(obj.meshName)) {
      mesh.material = this._originalMats.get(obj.meshName);
      this._originalMats.delete(obj.meshName);
    }
  }

  // ── Interaction prompt (one-time intro, center screen) ───
  _promptDismissed = false;

  _showIntroPrompt() {
    const prompt = document.getElementById('interact-prompt');
    const label  = document.getElementById('interact-label');
    label.textContent = 'Click to move · Approach objects to interact';
    prompt.classList.remove('hidden');
    setTimeout(() => prompt.classList.add('visible'), 700);
  }

  // Called by character the moment it starts moving
  dismissIntroPrompt() {
    if (this._promptDismissed) return;
    this._promptDismissed = true;
    const prompt = document.getElementById('interact-prompt');
    prompt.classList.remove('visible');
    setTimeout(() => prompt.classList.add('hidden'), 400);
  }

  // ── Proximity prompt (near objects) — separate element ───
  _updatePrompt(zoneId) {
    // Proximity prompt is now handled by the floating ring + glow only.
    // No DOM prompt needed — keeps it clean.
  }

  // ── Handle direct click on object ────────────────────────
  handleClick(mouse2d, raycaster) {
    const meshes = this.objects
      .map(obj => this.scene.getObjectByName(obj.meshName))
      .filter(Boolean);

    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return false;

    const hitMesh = hits[0].object;
    const obj = this.objects.find(o => {
      const m = this.scene.getObjectByName(o.meshName);
      return m && (m === hitMesh || m.getObjectByName(hitMesh.name));
    });

    if (obj) {
      this.character.moveTo(
        new THREE.Vector3(obj.position.x, 0, obj.position.z),
        () => this.dismissIntroPrompt()
      );
      return true;
    }
    return false;
  }

  // ── Keyboard E trigger ────────────────────────────────────
  tryInteract() {
    if (this._near && !this._modalOpen) this.openModal(this._near);
  }

  // ── Modal ─────────────────────────────────────────────────
  openModal(zoneId) {
    const obj = this.objects.find(o => o.id === zoneId);
    if (!obj) return;
    const { modal } = obj;

    document.getElementById('modal-icon').textContent  = obj.icon;
    document.getElementById('modal-title').textContent = modal.title;
    document.getElementById('modal-body').innerHTML    = modal.body;
    document.getElementById('modal-tags').innerHTML    = (modal.tags || [])
      .map(t => `<span class="tag">${t}</span>`).join('');

    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-backdrop').classList.add('visible');
    this._modalOpen = true;
  }

  closeModal() {
    const bd = document.getElementById('modal-backdrop');
    bd.classList.remove('visible');
    setTimeout(() => bd.classList.add('hidden'), 320);
    this._modalOpen = false;
  }

  isModalOpen() { return this._modalOpen; }
}
