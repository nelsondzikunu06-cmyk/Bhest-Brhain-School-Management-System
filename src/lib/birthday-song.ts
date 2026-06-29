// Synthesized "Happy Birthday" melody using Web Audio API — no external assets.
const NOTE: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25, D5: 587.33,
  E5: 659.25, F5: 698.46,
};
// (note, beats)
const SONG: [string, number][] = [
  ["C4", 0.75], ["C4", 0.25], ["D4", 1], ["C4", 1], ["F4", 1], ["E4", 2],
  ["C4", 0.75], ["C4", 0.25], ["D4", 1], ["C4", 1], ["G4", 1], ["F4", 2],
  ["C4", 0.75], ["C4", 0.25], ["C5", 1], ["A4", 1], ["F4", 1], ["E4", 1], ["D4", 2],
  ["Bb4", 0.75], ["Bb4", 0.25], ["A4", 1], ["F4", 1], ["G4", 1], ["F4", 2],
];

let ctx: AudioContext | null = null;
let stopFlag = false;

export function stopBirthdaySong() {
  stopFlag = true;
  if (ctx) {
    try { ctx.close(); } catch {} ctx = null;
  }
}

export async function playBirthdaySong(): Promise<void> {
  stopBirthdaySong();
  stopFlag = false;
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  ctx = new AC();
  const tempo = 130; // bpm
  const beat = 60 / tempo;
  let t = ctx.currentTime + 0.05;
  for (const [n, b] of SONG) {
    if (stopFlag) return;
    const freq = NOTE[n];
    const dur = b * beat;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  }
}
