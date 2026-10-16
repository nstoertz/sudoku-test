/**
 * Lightweight Web Audio SFX — no asset files.
 * Callers should invoke from a user gesture path when possible
 * so the AudioContext can unlock in browsers.
 */

export type SoundKind = "placeOk" | "placeBad" | "win" | "clear";

const MUTE_KEY = "sudoku-mute";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

type ToneOpts = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  detune?: number;
};

function playTone(opts: ToneOpts): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = opts.gain ?? 0.08;
  const attack = opts.attack ?? 0.01;

  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.frequency, now);
  if (opts.detune != null) osc.detune.setValueAtTime(opts.detune, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + opts.duration + 0.02);
}

function playPlaceOk(): void {
  playTone({ frequency: 660, duration: 0.09, type: "triangle", gain: 0.07 });
  window.setTimeout(() => {
    if (isMuted()) return;
    playTone({ frequency: 880, duration: 0.1, type: "triangle", gain: 0.05 });
  }, 40);
}

function playPlaceBad(): void {
  playTone({
    frequency: 180,
    duration: 0.16,
    type: "sawtooth",
    gain: 0.05,
    attack: 0.005,
  });
  playTone({
    frequency: 140,
    duration: 0.18,
    type: "square",
    gain: 0.03,
    attack: 0.005,
    detune: 35,
  });
}

function playWin(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((frequency, i) => {
    window.setTimeout(() => {
      if (isMuted()) return;
      playTone({
        frequency,
        duration: 0.28,
        type: "sine",
        gain: 0.09,
        attack: 0.02,
      });
    }, i * 110);
  });
}

function playClear(): void {
  playTone({ frequency: 320, duration: 0.06, type: "sine", gain: 0.035 });
}

export function playSound(kind: SoundKind): void {
  if (isMuted()) return;
  try {
    switch (kind) {
      case "placeOk":
        playPlaceOk();
        break;
      case "placeBad":
        playPlaceBad();
        break;
      case "win":
        playWin();
        break;
      case "clear":
        playClear();
        break;
    }
  } catch {
    // Audio can fail if the context is unavailable; ignore quietly.
  }
}
