// Converts solid-green chroma-key regions in card frame PNGs to true alpha=0.
// Run once: node scripts/key-frames.mjs
import { Jimp } from "jimp";

const frames = [
  "src/assets/cards/frames/common/default.png",
  "src/assets/cards/frames/common/spell.png",
  "src/assets/cards/frames/rare/default.png",
  "src/assets/cards/frames/rare/spell.png",
  "src/assets/cards/frames/epic/default.png",
  "src/assets/cards/frames/epic/spell.png",
  "src/assets/cards/frames/legendary/default.png",
  "src/assets/cards/frames/legendary/default_spell.png",
  "src/assets/cards/frames/legendary/luxury.png",
  "src/assets/cards/frames/legendary/luxury_spell.png",
];

for (const f of frames) {
  const img = await Jimp.read(f);
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    // Key out: green > 200, red < 100, blue < 100
    if (g > 200 && r < 100 && b < 100) {
      this.bitmap.data[idx + 3] = 0;
    }
  });
  await img.write(f);
  console.log("keyed:", f);
}
console.log("done.");
