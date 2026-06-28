const BPM = 138;
const STEPS_PER_BAR = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

const KICK_STEPS = new Set([0, 4, 8, 10]);
const COWBELL_STEPS = new Set([2, 6, 11, 14]);
const HAT_STEPS = new Set([0, 2, 4, 6, 8, 9, 10, 12, 14, 15]);
const OPEN_HAT_STEPS = new Set([3, 7, 15]);
const BASS_NOTES: { step: number; freq: number; duration: number; slideTo?: number }[] = [
  { step: 0, freq: 55, duration: 0.9 },
  { step: 8, freq: 49, duration: 0.55 },
  { step: 12, freq: 41.2, duration: 0.4, slideTo: 36.7 }
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private musicStarted = false;
  private distortionCurve: Float32Array | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  resume() {
    const ctx = this.getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (!this.musicStarted) this.startMusic();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  isMuted() {
    return this.muted;
  }

  private getDistortionCurve(): Float32Array {
    if (this.distortionCurve) return this.distortionCurve;
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 3);
    }
    this.distortionCurve = curve;
    return curve;
  }

  private envGain(ctx: AudioContext, bus: GainNode, peak: number, attack: number, decay: number, startTime: number) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
    gain.connect(bus);
    return gain;
  }

  private kick(time: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    const gain = this.envGain(ctx, this.musicGain, 1, 0.005, 0.16, time);
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private cowbell(time: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800;
    bandpass.Q.value = 2.5;
    bandpass.connect(this.musicGain);
    const gain = this.envGain(ctx, bandpass, 0.5, 0.002, 0.09, time);
    [587, 845].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.1);
    });
  }

  private hihat(time: number, open: boolean) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 7000;
    const gain = this.envGain(ctx, this.musicGain, open ? 0.22 : 0.14, 0.001, open ? 0.13 : 0.035, time);
    noise.connect(highpass);
    highpass.connect(gain);
    noise.start(time);
    noise.stop(time + (open ? 0.16 : 0.05));
  }

  private bassNote(time: number, freq: number, duration: number, slideTo?: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, time + duration * 0.8);
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 280;
    const gain = this.envGain(ctx, lowpass, 0.8, 0.01, duration, time);
    osc.connect(shaper);
    shaper.connect(gain);
    gain.disconnect();
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private scheduleStep(step: number, time: number) {
    if (KICK_STEPS.has(step)) this.kick(time);
    if (COWBELL_STEPS.has(step)) this.cowbell(time);
    if (HAT_STEPS.has(step)) this.hihat(time, OPEN_HAT_STEPS.has(step));
    for (const note of BASS_NOTES) {
      if (note.step === step) this.bassNote(time, note.freq, note.duration, note.slideTo);
    }
  }

  private scheduler = () => {
    const ctx = this.getCtx();
    if (!ctx) return;
    const secondsPerStep = 60 / BPM / 4;
    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % STEPS_PER_BAR;
    }
  };

  startMusic() {
    const ctx = this.getCtx();
    if (!ctx || this.musicStarted) return;
    this.musicStarted = true;
    this.currentStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.musicTimer = setInterval(this.scheduler, LOOKAHEAD_MS);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicStarted = false;
  }

  private blip(freq: number, duration: number, type: OscillatorType, peak: number, slideTo?: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, time + duration);
    const gain = this.envGain(ctx, this.sfxGain, peak, 0.004, duration, time);
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  playShoot() {
    this.blip(900, 0.08, 'square', 0.25, 220);
  }

  playHit() {
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const time = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1800;
    const gain = this.envGain(ctx, this.sfxGain, 0.4, 0.001, 0.05, time);
    noise.connect(lowpass);
    lowpass.connect(gain);
    noise.start(time);
  }

  playEnemyDeath() {
    this.blip(320, 0.22, 'sawtooth', 0.3, 60);
  }

  playPlayerHurt() {
    this.blip(180, 0.18, 'square', 0.35, 70);
  }

  playCrystalPickup() {
    const ctx = this.getCtx();
    if (!ctx) return;
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, 0.16, 'sine', 0.3), i * 70);
    });
  }

  playSecretFound() {
    const ctx = this.getCtx();
    if (!ctx || !this.sfxGain) return;
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, time);
    osc.frequency.exponentialRampToValueAtTime(1320, time + 0.25);
    const gain = this.envGain(ctx, this.sfxGain, 0.25, 0.01, 0.28, time);
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  playLevelComplete() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => this.blip(freq, 0.22, 'triangle', 0.32), i * 110);
    });
  }

  playMenuClick() {
    this.blip(700, 0.05, 'square', 0.15);
  }
}
