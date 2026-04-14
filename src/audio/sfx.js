import { Howl } from "howler";

const sampleRate = 44100;

function buildWav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return "data:audio/wav;base64," + btoa(binary);
}

function makeTone(freq, duration=0.2) {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.6;
  }
  return buildWav(samples);
}

function makeNoise(duration=0.15) {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = (Math.random() * 2 - 1) * 0.5;
  }
  return buildWav(samples);
}

function playSound(src, volume=0.25) {
  const howl = new Howl({ src: [src], volume });
  howl.play();
}

function noiseSound(volume=0.2) {
  const src = makeNoise(0.18);
  playSound(src, volume);
}

function toneSound(freq, duration=0.2, volume=0.3) {
  const src = makeTone(freq, duration);
  playSound(src, volume);
}

function createSoundEngine() {
  return {
    cardSelect() {
      toneSound(440, 0.08, 0.15);
      toneSound(660, 0.08, 0.12);
    },
    cardPlay() {
      toneSound(300, 0.05, 0.2);
      toneSound(500, 0.12, 0.18);
      toneSound(750, 0.1, 0.16);
      noiseSound(0.07);
    },
    minionAttack() {
      noiseSound(0.2);
      toneSound(180, 0.08, 0.2);
      toneSound(120, 0.1, 0.14);
    },
    minionDeath() {
      toneSound(400, 0.05, 0.18);
      toneSound(200, 0.15, 0.14);
      noiseSound(0.08);
    },
    spellCast() {
      toneSound(800, 0.06, 0.14);
      toneSound(1200, 0.08, 0.11);
      toneSound(600, 0.12, 0.1);
      toneSound(900, 0.1, 0.1);
    },
    heroHit() {
      noiseSound(0.25);
      toneSound(100, 0.2, 0.22);
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((freq, i) => toneSound(freq, 0.25, 0.18));
    },
    defeat() {
      toneSound(440, 0.15, 0.2);
      toneSound(300, 0.2, 0.18);
      toneSound(100, 0.4, 0.15);
    },
    endTurn() {
      toneSound(330, 0.08, 0.12);
      toneSound(440, 0.08, 0.12);
    },
    targetSelect() {
      toneSound(880, 0.05, 0.08);
      toneSound(1100, 0.05, 0.07);
    },
    error() {
      toneSound(200, 0.1, 0.1);
      toneSound(180, 0.1, 0.1);
    },
    drawCard() {
      toneSound(500, 0.06, 0.1);
      toneSound(700, 0.06, 0.08);
    },
  };
}

let SFX = null;
export function getSFX() {
  if (!SFX) SFX = createSoundEngine();
  return SFX;
}
