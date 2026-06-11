// ============================================================
//  character.js — Player controller, click-to-move
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MOVE_SPEED  = 8.25;
const ARRIVE_DIST = 0.18;
const TURN_SPEED  = 20;   // radians/sec — snappy turn

export class Character {
  constructor(scene, walkMesh, spawn = null) {
    this.scene    = scene;
    this.walkMesh = walkMesh;
    this.mixer    = null;
    this.actions  = {};

    this._pos       = new THREE.Vector3(spawn?.x ?? 0, 0, spawn?.z ?? 0);
    this._target    = new THREE.Vector3(spawn?.x ?? 0, 0, spawn?.z ?? 0);
    this._moving    = false;
    this._path      = [];
    this._pathIdx   = 0;
    this._facingY      = 0;
    this._rootBone     = null;
    this._hipsBone     = null;
    this._currentAnim  = null;

    // Reusable vectors — never allocate in update()
    this._dir       = new THREE.Vector3();
    this._targetQ   = new THREE.Quaternion();
    this._axis      = new THREE.Vector3(0, 1, 0);

    this._limbs     = {};
    this._walkPhase = 0;

    this._mesh = this._buildPlaceholder();
    scene.add(this._mesh);
  }

  // ── Placeholder ───────────────────────────────────────────
  _buildPlaceholder() {
    const group   = new THREE.Group();
    group.name    = 'character';
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xc8402a });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xf5d4a0 });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x2a1808 });
    const legMat  = new THREE.MeshLambertMaterial({ color: 0x2a3050 });

    [-0.18, 0.18].forEach(ox => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), legMat);
      m.position.set(ox, 0.28, 0); m.castShadow = true;
      m.name = ox < 0 ? 'legL' : 'legR'; group.add(m);
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), bodyMat);
    body.position.y = 0.83; body.castShadow = true; group.add(body);
    [-0.34, 0.34].forEach(ox => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), skinMat);
      m.position.set(ox, 0.78, 0); m.castShadow = true;
      m.name = ox < 0 ? 'armL' : 'armR'; group.add(m);
    });
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.18), skinMat);
    neck.position.y = 1.2; group.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.42), skinMat);
    head.position.y = 1.52; head.castShadow = true; group.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.44), hairMat);
    hair.position.set(0, 1.72, -0.01); group.add(hair);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1208 });
    [-0.1, 0.1].forEach(ox => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat);
      eye.position.set(ox, 1.52, 0.21); group.add(eye);
    });

    this._shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })
    );
    this._shadow.rotation.x = -Math.PI / 2;
    this._shadow.position.set(0, 0.01, 0);
    this.scene.add(this._shadow);

    this._limbs = {
      armL: group.getObjectByName('armL'),
      armR: group.getObjectByName('armR'),
      legL: group.getObjectByName('legL'),
      legR: group.getObjectByName('legR'),
    };

    group.position.copy(this._pos);
    group.visible = false; // hidden until real GLB loads
    return group;
  }

  // ── Load real GLB ─────────────────────────────────────────
  loadModel(path) {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
      this.scene.remove(this._mesh);

      // Remove placeholder shadow
      if (this._shadow) {
        this.scene.remove(this._shadow);
        this._shadow = null;
      }

      const model = gltf.scene;

      // Scale to ~1.8 units tall
      const box  = new THREE.Box3().setFromObject(model);
      const size = box.max.y - box.min.y;
      if (size > 0) model.scale.setScalar(1.8 / size);

      // Ground feet at y=0 inside wrapper
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.set(0, -box2.min.y, 0);
      model.rotation.set(0, 0, 0);

      // Find root bone — used to suppress root motion
      model.traverse(c => {
        if (c.isBone && !this._rootBone) this._rootBone = c;
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
      });

      // Wrapper: only controls world XZ position + Y rotation
      const wrapper = new THREE.Group();
      wrapper.name  = 'character';
      wrapper.add(model);
      wrapper.position.set(this._pos.x, 0, this._pos.z);
      wrapper.rotation.y = this._facingY;
      this.scene.add(wrapper);
      this._mesh  = wrapper;
      this._model = model;
      wrapper.visible = true; // show now that real model is ready

      if (gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(model);

        // Strip root and hips position + quaternion tracks entirely.
        // These drive circular world-space drift and fight our wrapper rotation.
        // All other bones keep their full animation.
        gltf.animations.forEach(clip => {
          const tracks = clip.tracks.filter(t =>
            t.name !== 'root.position'  &&
            t.name !== 'root.quaternion'&&
            t.name !== 'hips.position'  &&
            t.name !== 'hips.quaternion'
          );
          const stripped = new THREE.AnimationClip(clip.name, clip.duration, tracks);
          this.actions[clip.name] = this.mixer.clipAction(stripped);
        });

        // Store bone refs so we can hard-pin them after mixer runs
        model.traverse(c => {
          if (c.isBone && c.name === 'root') this._rootBone = c;
          if (c.isBone && c.name === 'hips') this._hipsBone = c;
        });

        if (this.actions['idle']) this.actions['idle'].play();
        else Object.values(this.actions)[0]?.play();
      }
    }, undefined, err => console.error('Character load error:', err));
  }

  // ── Collision ─────────────────────────────────────────────
  // Called once after world loads with array of {x, z, r} circles
  setColliders(colliders) {
    this._colliders = colliders;
  }

  addColliders(newColliders) {
    if (!this._colliders) this._colliders = [];
    for (const c of newColliders) this._colliders.push(c);
  }

  getColliderCount() {
    return this._colliders ? this._colliders.length : 0;
  }

  _isBlocked(x, z) {
    if (!this._colliders) return false;
    const r = 0.5; // character radius
    for (const c of this._colliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      if (Math.sqrt(dx*dx + dz*dz) < c.r + r) return true;
    }
    return false;
  }

  // ── Move ──────────────────────────────────────────────────
  moveTo(worldPoint, onStart) {
    if (this._isBlocked(worldPoint.x, worldPoint.z)) return;
    this._target.set(worldPoint.x, 0, worldPoint.z);
    this._path    = [this._target.clone()];
    this._pathIdx = 0;
    if (onStart) onStart();
    // Only trigger walk anim if not already moving — prevents
    // repeated fadeOut/fadeIn every 80ms causing T-pose on hold
    if (!this._moving) {
      this._moving = true;
      this._playAnim('walk');
    } else {
      this._moving = true;
    }
  }

  // ── Update ────────────────────────────────────────────────
  update(dt) {
    if (this.mixer) {
      this.mixer.update(dt);
      // Hard-pin root and hips after mixer — belt and suspenders
      if (this._model)    { this._model.position.set(0, this._model.position.y, 0); this._model.rotation.set(0,0,0); }
      if (this._rootBone) { this._rootBone.position.set(0, this._rootBone.position.y, 0); this._rootBone.rotation.set(0,0,0); }
      if (this._hipsBone) { this._hipsBone.position.set(0, this._hipsBone.position.y, 0); this._hipsBone.rotation.y = 0; }
    }

    this._animateLimbs(dt);

    if (!this._moving) return;

    const dest = this._path[this._pathIdx];
    if (!dest) { this._moving = false; return; }

    // Reuse _dir — no allocation
    this._dir.set(dest.x - this._pos.x, 0, dest.z - this._pos.z);
    const dist = this._dir.length();

    if (dist < ARRIVE_DIST) {
      this._pathIdx++;
      if (this._pathIdx >= this._path.length) {
        this._moving = false;
        this._pos.copy(dest);
        this._mesh.position.set(this._pos.x, 0, this._pos.z);
        this._playAnim('idle');
      }
      return;
    }

    this._dir.normalize();

    // Snap instantly to face target
    this._facingY = Math.atan2(this._dir.x, this._dir.z);
    this._mesh.rotation.y = this._facingY;

    // Try full move first, fall back to sliding on X or Z separately
    const nx = this._pos.x + this._dir.x * MOVE_SPEED * dt;
    const nz = this._pos.z + this._dir.z * MOVE_SPEED * dt;

    if (!this._isBlocked(nx, nz)) {
      this._pos.x = nx;
      this._pos.z = nz;
    } else if (!this._isBlocked(nx, this._pos.z)) {
      this._pos.x = nx;
    } else if (!this._isBlocked(this._pos.x, nz)) {
      this._pos.z = nz;
    } else {
      // Fully blocked — stop moving
      this._moving = false;
      this._playAnim('idle');
    }

    this._mesh.position.set(this._pos.x, 0, this._pos.z);
  }

  // ── Limb animation (placeholder only) ────────────────────
  _animateLimbs(dt) {
    if (this.mixer) return;
    this._walkPhase += dt * (this._moving ? 6 : 1.5);
    const swing = this._moving ? 0.28 : 0.04;
    const bob   = this._moving ? 0.04 : 0.01;
    const { armL, armR, legL, legR } = this._limbs;
    if (armL) armL.rotation.x =  Math.sin(this._walkPhase) * swing;
    if (armR) armR.rotation.x = -Math.sin(this._walkPhase) * swing;
    if (legL) legL.rotation.x = -Math.sin(this._walkPhase) * swing * 0.7;
    if (legR) legR.rotation.x =  Math.sin(this._walkPhase) * swing * 0.7;
    this._mesh.position.y = Math.abs(Math.sin(this._walkPhase)) * bob;
  }

  _playAnim(name) {
    if (!this.mixer) return;
    const action = this.actions[name];
    if (!action) return;
    // Don't restart if already playing this animation
    if (this._currentAnim === name) return;
    this._currentAnim = name;
    Object.values(this.actions).forEach(a => { if (a !== action) a.fadeOut(0.15); });
    action.reset().fadeIn(0.15).play();
  }

  getPosition()        { return this._pos.clone(); }
  getPositionInto(vec) { vec.copy(this._pos); }
  isMoving()           { return this._moving; }
}
