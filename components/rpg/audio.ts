// Brazilian phonk: faster, denser "tamborzao"-style kick pattern, backbeat claps,
// a busy cowbell, and a descending tom roll at the end of every bar.
const BPM = 152;
const STEPS_PER_BAR = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

const KICK_STEPS = new Set([0, 3, 6, 7, 10, 13]);
const CLAP_STEPS = new Set([4, 12]);
const COWBELL_STEPS = new Set([2, 5, 9, 11, 14]);
const HAT_STEPS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const OPEN_HAT_STEPS = new Set([5, 11]);
const TOM_ROLL: { step: number; freq: number }[] = [
  { step: 13, freq: 280 },
  { step: 14, freq: 220 },
  { step: 15, freq: 170 }
];
const BASS_NOTES: { step: number; freq: number; duration: number; slideTo?: number }[] = [
  { step: 0, freq: 49, duration: 0.85 },
  { step: 6, freq: 43.7, duration: 0.4 },
  { step: 8, freq: 41.2, duration: 0.55 },
  { step: 12, freq: 36.7, duration: 0.45, slideTo: 30.9 }
];
// Sparse, syncopated "vocal chop" stabs -- an instrumental texture imitating the
// staccato, pitched sample-chop hits phonk producers layer over the beat. No words,
// just a short formant-ish honk synthesized from an oscillator swept through a
// bandpass filter.
const VOCAL_CHOP: { step: number; freq: number }[] = [
  { step: 1, freq: 520 },
  { step: 9, freq: 390 }
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
  private distortionCurves: Map<number, Float32Array> = new Map();

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
      this.musicGain.gain.value = 0.3;
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

  private getDistortionCurve(drive: number): Float32Array {
    const cached = this.distortionCurves.get(drive);
    if (cached) return cached;
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive);
    }
    this.distortionCurves.set(drive, curve);
    return curve;
  }

  private envGain(ctx: AudioContext, bus: AudioNode, peak: number, attack: number, decay: number, startTime: number) {
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
    osc.frequency.setValueAtTime(165, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve(2.2);
    const gain = this.envGain(ctx, shaper, 1, 0.004, 0.14, time);
    osc.connect(gain);
    shaper.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  private clap(time: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1500;
    bandpass.Q.value = 4;
    bandpass.connect(this.musicGain);
    [0, 0.012, 0.024].forEach((delay) => {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.envGain(ctx, bandpass, 0.4, 0.001, 0.07, time + delay);
      noise.connect(gain);
      noise.start(time + delay);
    });
  }

  private tom(time: number, freq: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, time + 0.16);
    const gain = this.envGain(ctx, this.musicGain, 0.55, 0.003, 0.16, time);
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private vocalChop(time: number, freq: number) {
    const ctx = this.getCtx();
    if (!ctx || !this.musicGain) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.15);
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(freq * 1.8, time);
    formant.frequency.exponentialRampToValueAtTime(freq * 0.9, time + 0.15);
    formant.Q.value = 6;
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve(1.6);
    const gain = this.envGain(ctx, shaper, 0.4, 0.003, 0.14, time);
    osc.connect(formant);
    formant.connect(gain);
    shaper.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.18);
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
    shaper.curve = this.getDistortionCurve(4.5);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 220;
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
    if (CLAP_STEPS.has(step)) this.clap(time);
    if (COWBELL_STEPS.has(step)) this.cowbell(time);
    if (HAT_STEPS.has(step)) this.hihat(time, OPEN_HAT_STEPS.has(step));
    for (const roll of TOM_ROLL) {
      if (roll.step === step) this.tom(time, roll.freq);
    }
    for (const chop of VOCAL_CHOP) {
      if (chop.step === step) this.vocalChop(time, chop.freq);
    }
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
