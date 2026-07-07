// ============================================================
//  audio.js — Music, ambient, and game sound effects
// ============================================================

export class AudioSystem {
  constructor(trackPath) {
    this.trackPath = trackPath;
    this.audio     = null;
    this.ambient   = null;
    this.muted     = false;
    this.volume    = 0.5;
    this._started  = false;
    this._ctx      = null;
    this._buffers  = {};

    this._bindUI();
    this._initOnInteraction();
  }

  _initOnInteraction() {
    const start = () => {
      if (this._started) return;
      this._started = true;
      this._loadMusic();
      this._loadAmbient();
      this._initWebAudio();
      document.removeEventListener('click',      start);
      document.removeEventListener('touchstart', start);
      document.removeEventListener('keydown',    start);
    };
    document.addEventListener('click',      start);
    document.addEventListener('touchstart', start);
    document.addEventListener('keydown',    start);
  }

  _loadMusic() {
    this.audio        = new Audio(this.trackPath);
    this.audio.loop   = true;
    this.audio.volume = this.muted ? 0 : this.volume * 0.7;
    this.audio.play().catch(err => console.warn('Music autoplay blocked:', err));
  }

  _loadAmbient() {
    this.ambient        = new Audio('assets/audio/ambient.mp3');
    this.ambient.loop   = true;
    this.ambient.volume = this.muted ? 0 : this.volume * 0.4;
    this.ambient.play().catch(() => {});
  }

  _initWebAudio() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      ['collect', 'phase_complete', 'game_complete'].forEach(n => this._loadBuffer(n));
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  _loadBuffer(name) {
    fetch(`assets/audio/${name}.mp3`)
      .then(r => r.arrayBuffer())
      .then(buf => this._ctx.decodeAudioData(buf))
      .then(decoded => { this._buffers[name] = decoded; })
      .catch(err => console.warn(`SFX load failed: ${name}`, err));
  }

  playSFX(name, volume = 1.0) {
    if (this.muted || !this._ctx || !this._buffers[name]) return;
    const source = this._ctx.createBufferSource();
    const gain   = this._ctx.createGain();
    source.buffer   = this._buffers[name];
    gain.gain.value = volume * this.volume;
    source.connect(gain);
    gain.connect(this._ctx.destination);
    source.start(0);
  }

_applyMute() {
  if (this.audio) {
    this.audio.volume = this.muted ? 0 : this.volume * 0.7;
    if (this.muted) this.audio.pause();
    else this.audio.play().catch(() => {});
  }
  if (this.ambient) {
    this.ambient.volume = this.muted ? 0 : this.volume * 0.4;
    if (this.muted) this.ambient.pause();
    else this.ambient.play().catch(() => {});
  }
  const on  = document.getElementById('icon-sound-on');
  const off = document.getElementById('icon-sound-off');
  const btn = document.getElementById('sound-toggle');
  if (on)  on.style.display  = this.muted ? 'none' : '';
  if (off) off.style.display = this.muted ? ''     : 'none';
  if (btn) btn.classList.toggle('muted', this.muted);
}

  _bindUI() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.muted = !this.muted;
      this._applyMute();
    });
  }
}
