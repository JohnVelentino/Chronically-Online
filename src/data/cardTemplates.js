import commonDefaultFrame from "../assets/cards/frames/common/default.png";
import rareDefaultFrame from "../assets/cards/frames/rare/default.png";
import epicDefaultFrame from "../assets/cards/frames/epic/Default.png";
import legendaryDefaultFrame from "../assets/cards/frames/legendary/default.png";
import legendaryLuxuryFrame from "../assets/cards/frames/legendary/luxury.png";

const DEFAULT_LAYOUT = {
  // Normalized rects (0..1) for 1024×1536 frame assets.
  // { x, y } = top-left corner, { w, h } = size.
  // Renderer centers text within each rect via translate(-50%,-50%).

  auraRect:     { x: 0.048, y: 0.042, w: 0.108, h: 0.108 },
  nameRect:     { x: 0.176, y: 0.029, w: 0.640, h: 0.090 },
  artRect:      { x: 0.120, y: 0.145, w: 0.760, h: 0.500 },
  textRect:     { x: 0.155, y: 0.715, w: 0.690, h: 0.135 },
  spellTextRect:{ x: 0.155, y: 0.705, w: 0.690, h: 0.125 },
  spellTagRect: { x: 0.370, y: 0.868, w: 0.260, h: 0.052 },
  classTagRect: { x: 0.380, y: 0.875, w: 0.240, h: 0.055 },
  attackRect:   { x: 0.045, y: 0.855, w: 0.150, h: 0.120 },
  healthRect:   { x: 0.810, y: 0.855, w: 0.150, h: 0.120 },
};

function withLayout(frameAsset, layout = DEFAULT_LAYOUT, extra = {}) {
  return {
    // Legacy field kept for compatibility.
    frameAsset,
    // Future-proof layered frame definition.
    staticOverlay: { src: frameAsset },
    spellOverlay: null,
    animatedOverlays: [], // e.g. [{ src, blendMode, opacity, speed, loop }]
    glowLayer: null, // e.g. { src, opacity, blendMode }
    particleAnchors: [], // normalized anchor points, e.g. [{ id, x, y }]
    coordinateSpace: "normalized_fixed_1024x1536", // layout coordinates are normalized against shared 1024x1536 design space
    layout,
    animated: false, // top-level hint for future premium runtime
    ...extra,
  };
}

export const CARD_FRAME_REGISTRY = {
  common: {
    default: withLayout(commonDefaultFrame, DEFAULT_LAYOUT, { spellOverlay: "/src/assets/cards/frames/common/spell.png" }),
  },
  rare: {
    default: withLayout(rareDefaultFrame, DEFAULT_LAYOUT, { spellOverlay: "/src/assets/cards/frames/rare/spell.png" }),
  },
  epic: {
    default: withLayout(epicDefaultFrame, DEFAULT_LAYOUT, { spellOverlay: "/src/assets/cards/frames/epic/spell.png" }),
  },
  legendary: {
    default: withLayout(legendaryDefaultFrame, DEFAULT_LAYOUT, { spellOverlay: "/src/assets/cards/frames/legendary/default_spell.png" }),
    luxury: withLayout(legendaryLuxuryFrame, DEFAULT_LAYOUT, { spellOverlay: "/src/assets/cards/frames/legendary/luxury_spell.png" }),
    inferno: withLayout("/src/assets/cards/frames/legendary/inferno.png", DEFAULT_LAYOUT, { spellOverlay: "/src/assets/cards/frames/legendary/inferno_spell.png" }),
  },
};

export function getCardFrameDefinition(rarity, frameVariant, cardType = "minion") {
  const byRarity = CARD_FRAME_REGISTRY[rarity] || CARD_FRAME_REGISTRY.common;
  const resolved = (frameVariant && byRarity[frameVariant]) ? byRarity[frameVariant] : (byRarity.default || Object.values(byRarity)[0]);
  const isSpell = cardType === "spell";
  const activeOverlay = isSpell && resolved.spellOverlay ? resolved.spellOverlay : (resolved.staticOverlay?.src || resolved.frameAsset);
  return {
    ...resolved,
    activeOverlay,
    fallbackOverlay: resolved.staticOverlay?.src || resolved.frameAsset,
  };
}
