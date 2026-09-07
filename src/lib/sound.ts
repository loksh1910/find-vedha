/**
 * Tiny synthesised UI/game sound — no audio files. One shared AudioContext,
 * oscillator + gain envelopes. Gated by the caller (Settings → Sound).
 */

type Kind = "move" | "reveal" | "catch" | "win" | "ui";

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  c: AudioContext,
  {
    freq,
    type = "sine",
    dur = 0.12,
    gain = 0.2,
    slideTo,
    delay = 0,
  }: {
    freq: number;
    type?: OscillatorType;
    dur?: number;
    gain?: number;
    slideTo?: number;
    delay?: number;
  },
) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** volume: 0..1 */
export function playSfx(kind: Kind, volume = 0.7) {
  const c = ac();
  if (!c || volume <= 0) return;
  const v = Math.min(1, Math.max(0, volume));
  switch (kind) {
    case "move":
      blip(c, { freq: 200, type: "square", dur: 0.06, gain: 0.09 * v });
      break;
    case "ui":
      blip(c, { freq: 320, type: "triangle", dur: 0.05, gain: 0.06 * v });
      break;
    case "reveal":
      blip(c, { freq: 440, type: "sine", dur: 0.16, gain: 0.14 * v, slideTo: 720 });
      blip(c, { freq: 660, type: "sine", dur: 0.22, gain: 0.1 * v, slideTo: 990, delay: 0.09 });
      break;
    case "catch":
      blip(c, { freq: 150, type: "sawtooth", dur: 0.28, gain: 0.16 * v, slideTo: 60 });
      blip(c, { freq: 90, type: "square", dur: 0.3, gain: 0.1 * v, delay: 0.02 });
      break;
    case "win":
      blip(c, { freq: 523, type: "sine", dur: 0.14, gain: 0.13 * v });
      blip(c, { freq: 659, type: "sine", dur: 0.14, gain: 0.13 * v, delay: 0.12 });
      blip(c, { freq: 784, type: "sine", dur: 0.24, gain: 0.13 * v, delay: 0.24 });
      break;
  }
}

export type SfxKind = Kind;
