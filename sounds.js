// Persona 5 Sound Synthesizer using Web Audio API
// Self-contained, zero-dependency audio generator.
// Safe-wrapped in try/catch blocks to avoid tab-crashing on privacy-focused browsers (like Brave).

class P5SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // Start muted to satisfy browser autoplay policies
  }

  init() {
    try {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked by browser shields:", e);
      this.ctx = null;
    }
  }

  resume() {
    try {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("AudioContext resume failed:", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.resume();
    return this.isMuted;
  }

  playTick() {
    if (this.isMuted) return;
    try {
      this.resume();
      const ctx = this.ctx;
      if (!ctx) return;

      // Short, high-pitched retro tick
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, now);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn("playTick failed:", e);
    }
  }

  playSelect() {
    if (this.isMuted) return;
    try {
      this.resume();
      const ctx = this.ctx;
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Sword slash (White Noise + Bandpass Sweep)
      const bufferSize = ctx.sampleRate * 0.25; // 0.25 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(3.0, now);
      noiseFilter.frequency.setValueAtTime(2500, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(400, now + 0.22);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // 2. Chunky slash bass impact
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const synthGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(180, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(280, now);
      osc2.frequency.exponentialRampToValueAtTime(60, now + 0.18);

      synthGain.gain.setValueAtTime(0.12, now);
      synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(500, now);

      osc1.connect(lowpass);
      osc2.connect(lowpass);
      lowpass.connect(synthGain);
      synthGain.connect(ctx.destination);

      // Start everything
      noise.start(now);
      osc1.start(now);
      osc2.start(now);

      noise.stop(now + 0.25);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn("playSelect failed:", e);
    }
  }

  playCancel() {
    if (this.isMuted) return;
    try {
      this.resume();
      const ctx = this.ctx;
      if (!ctx) return;

      const now = ctx.currentTime;

      // Swoosh out: noise swept downwards rapidly
      const bufferSize = ctx.sampleRate * 0.18;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.16);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.14, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.18);
    } catch (e) {
      console.warn("playCancel failed:", e);
    }
  }
}

const p5Sounds = new P5SoundEngine();
window.p5Sounds = p5Sounds;
