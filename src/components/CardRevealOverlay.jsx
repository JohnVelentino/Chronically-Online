import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RC } from "../data/cards.js";
import TemplateCardFace from "./TemplateCardFace.jsx";

const REVEAL_W = 220;
const REVEAL_H = 312;

/**
 * Inner card body — TemplateCardFace if available, falls back to legacy emoji card.
 * Used by both DrawCardReveal and DiscardCardReveal so the "big card" looks
 * exactly like a real hand card.
 */
function RevealedCardBody({ card }) {
  const rc = RC[card.rarity || "common"] || RC.common;
  return (
    <div
      style={{
        width: REVEAL_W,
        height: REVEAL_H,
        background: "rgba(0,0,0,0.35)",
        border: "2px solid rgba(255,255,255,0.10)",
        borderRadius: 26,
        boxShadow: `0 26px 60px rgba(0,0,0,0.72), 0 0 50px ${rc.glow}, 0 0 0 2px ${rc.border}55, inset 0 0 28px ${rc.glow}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <TemplateCardFace card={card} width={REVEAL_W} height={REVEAL_H} onFrameError={() => {}} />
    </div>
  );
}

/**
 * Player draws a card — appears front-and-center over the friendly board area,
 * holds ~3.5s so you can read it, then arcs into the hand and fades.
 *
 * Click anywhere on the card to skip the hold and fly to hand fast.
 *
 * Coordinate system: the parent (board-arena) is 1600×900 fixed canvas, so we
 * use absolute pixel anchors. Anchor sits over the player board (right of
 * center, above the hand). framer-motion x/y arrays drive the arc into the hand.
 */
export function DrawCardReveal({ card, onSkip }) {
  const rc = RC[card.rarity || "common"] || RC.common;
  const [skipping, setSkipping] = useState(false);

  // Held animation: pop in, hold ~3.5s, then arc to hand.
  // Skipped animation: short fade-out flight to hand from current pose.
  const heldAnimate = {
    opacity: [0, 1, 1, 1, 0.9, 0],
    scale:   [0.18, 1.08, 1.0, 1.0, 0.5, 0.42],
    x:       [90, 0, 0, 0, -620, -660],
    y:       [30, 0, 0, 0, -8, -2],
    rotate:  [-14, 3, 0, 0, -6, -3],
  };
  const heldTransition = {
    duration: 4.0,
    times: [0, 0.10, 0.18, 0.86, 0.97, 1],
    ease: [0.22, 1, 0.36, 1],
  };

  const skipAnimate = {
    opacity: [1, 0.9, 0],
    scale:   [1.0, 0.55, 0.42],
    x:       [0, -560, -660],
    y:       [0, -6, -2],
    rotate:  [0, -6, -3],
  };
  const skipTransition = {
    duration: 0.42,
    times: [0, 0.7, 1],
    ease: [0.4, 0.0, 0.6, 1],
  };

  function handleClick() {
    if (skipping) return;
    setSkipping(true);
    if (onSkip) {
      // Let the quick flight play before parent unmounts the overlay.
      setTimeout(() => onSkip(), 420);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.18, x: 90, y: 30, rotate: -14 }}
      animate={skipping ? skipAnimate : heldAnimate}
      transition={skipping ? skipTransition : heldTransition}
      onClick={handleClick}
      style={{
        position: "absolute",
        bottom: 230,
        right: 80,
        width: REVEAL_W,
        height: REVEAL_H,
        zIndex: 320,
        pointerEvents: "auto",
        cursor: "pointer",
        willChange: "transform, opacity",
      }}
    >
      {/* Outer glow halo — bursts and breathes during the long hold */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 0.85, 0.6, 0.55, 0.4, 0], scale: [0.7, 1.2, 1.0, 1.05, 1.0, 0.9] }}
        transition={{ duration: 3.6, times: [0, 0.12, 0.25, 0.55, 0.85, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: -42,
          borderRadius: 56,
          background: `radial-gradient(circle at 50% 50%, ${rc.glow} 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      {/* Spark ring during initial burst */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1.6, 1.9] }}
        transition={{ duration: 0.55, times: [0, 0.4, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: -16,
          borderRadius: 32,
          border: `2px solid ${rc.border}`,
          boxShadow: `0 0 24px ${rc.border}, inset 0 0 24px ${rc.glow}`,
          pointerEvents: "none",
        }}
      />
      <RevealedCardBody card={card} />
      {/* Diagonal shimmer during hold */}
      <motion.span
        aria-hidden
        initial={{ x: "-130%" }}
        animate={{ x: "230%" }}
        transition={{ duration: 1.0, delay: 0.3, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "60%",
          height: "100%",
          background:
            "linear-gradient(108deg, transparent 18%, rgba(255,255,255,0.55) 50%, transparent 82%)",
          mixBlendMode: "screen",
          borderRadius: 26,
          pointerEvents: "none",
        }}
      />
      {/* "DRAWN" stamp top-left — held visible through most of reveal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.4, rotate: -16 }}
        animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.4, 1.05, 1.0, 1.0, 1.0], rotate: [-16, -10, -10, -10, -10] }}
        transition={{ duration: 3.6, times: [0, 0.08, 0.2, 0.85, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          top: -18,
          left: -22,
          padding: "5px 14px",
          background: `linear-gradient(135deg, ${rc.border}, ${rc.glow})`,
          color: "#fff",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          borderRadius: 4,
          border: "2px solid rgba(255,255,255,0.6)",
          boxShadow: `0 0 20px ${rc.border}, 0 4px 14px rgba(0,0,0,0.55)`,
          textShadow: "0 1px 3px rgba(0,0,0,0.7)",
          pointerEvents: "none",
        }}
      >
        Drawn
      </motion.div>
    </motion.div>
  );
}

/**
 * One revealed discard. Card flies OUT of the discarder's hand toward center,
 * holds visible (~1.5s) with red "DISCARDED" stamp + crack glow, then drifts
 * away and fades.
 *
 * `entry.side` determines spawn direction:
 *   "ai"     → enemy hand (top), card drops down out of hand
 *   "player" → own hand (bottom), card rises up out of hand
 */
export function DiscardCardReveal({ entry, stackIndex = 0 }) {
  const isEnemy = entry.side === "ai";
  // Spread overlapping events horizontally so two discards in a row don't stack.
  const xJitter = useMemo(() => (stackIndex % 2 === 0 ? -1 : 1) * (32 + (stackIndex * 26) % 80), [stackIndex]);

  const startY = isEnemy ? -340 : 340;
  const holdY = 0;
  const exitY = isEnemy ? 140 : -120;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.55, x: xJitter, y: startY, rotate: isEnemy ? -22 : 18 }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        scale: [0.55, 1.06, 1.0, 1.0, 0.78],
        x: [xJitter, xJitter, xJitter, xJitter, xJitter + (isEnemy ? -90 : 90)],
        y: [startY, holdY - 18, holdY, holdY, exitY],
        rotate: [isEnemy ? -22 : 18, -3, 0, 0, isEnemy ? 14 : -14],
      }}
      transition={{
        duration: 3.1,
        times: [0, 0.18, 0.30, 0.78, 1],
        ease: [0.2, 0.85, 0.3, 1],
      }}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -REVEAL_W / 2,
        marginTop: -REVEAL_H / 2,
        width: REVEAL_W,
        height: REVEAL_H,
        zIndex: 340,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
    >
      {/* Red ominous halo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.9, 0.7, 0], scale: [0.6, 1.2, 1.0, 0.9] }}
        transition={{ duration: 2.5, times: [0, 0.18, 0.7, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: -50,
          borderRadius: 60,
          background:
            "radial-gradient(circle at 50% 50%, rgba(220,40,40,0.55) 0%, rgba(140,20,20,0.2) 45%, transparent 75%)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      {/* Smoke wisps */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 0.55, 0.35, 0], scale: [0.7, 1.4, 1.6, 1.8] }}
        transition={{ duration: 2.6, times: [0, 0.25, 0.6, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: -34,
          borderRadius: 44,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 60%, rgba(40,8,8,0.65) 0%, rgba(10,0,0,0.0) 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      <RevealedCardBody card={entry.card} />

      {/* Crack overlay — diagonal red slash */}
      <motion.svg
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0, 0.95, 0.95, 0.7] }}
        transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
        viewBox="0 0 220 312"
        width={REVEAL_W}
        height={REVEAL_H}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      >
        <defs>
          <filter id="crackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <path
          d="M 12 38 L 78 130 L 56 156 L 152 210 L 128 240 L 210 300"
          stroke="#ff3a3a"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          filter="url(#crackGlow)"
          opacity="0.9"
        />
        <path
          d="M 12 38 L 78 130 L 56 156 L 152 210 L 128 240 L 210 300"
          stroke="#ffd0d0"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />
      </motion.svg>

      {/* "DISCARDED" stamp — diagonal across face */}
      <motion.div
        initial={{ opacity: 0, scale: 1.6, rotate: -22 }}
        animate={{ opacity: [0, 1, 1, 1, 0.85], scale: [1.6, 0.95, 1.0, 1.0, 0.9], rotate: [-22, -14, -14, -14, -14] }}
        transition={{ duration: 2.6, times: [0, 0.16, 0.30, 0.78, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-14deg)",
          padding: "8px 22px",
          background: "rgba(140,12,12,0.92)",
          color: "#ffe6e6",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 4,
          textTransform: "uppercase",
          border: "3px solid #ff5a5a",
          borderRadius: 6,
          boxShadow: "0 0 24px rgba(255,40,40,0.85), inset 0 0 12px rgba(255,200,200,0.35)",
          textShadow: "0 2px 6px rgba(0,0,0,0.85)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        Discarded
      </motion.div>

      {/* Origin tag — top of card, says who lost it and why */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: [0, 1, 1, 0], y: [-12, 0, 0, 0] }}
        transition={{ duration: 2.6, times: [0, 0.18, 0.78, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          top: -34,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "5px 14px",
          background: "rgba(20,4,4,0.92)",
          color: "#ffb0b0",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
          border: "1px solid #c83434",
          borderRadius: 4,
          boxShadow: "0 4px 14px rgba(0,0,0,0.55), 0 0 14px rgba(200,40,40,0.55)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {isEnemy ? "Enemy" : "Your"} hand
        {entry.reason ? <span style={{ color: "#ff8888", marginLeft: 8 }}>· {entry.reason}</span> : null}
      </motion.div>

      {/* Card name + reason below the card so you can read it even if cracks obscure */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, 0] }}
        transition={{ duration: 2.6, times: [0, 0.2, 0.78, 1], ease: "easeOut" }}
        style={{
          position: "absolute",
          bottom: -38,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "5px 14px",
          background: "rgba(8,8,12,0.88)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: 1,
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
        }}
      >
        {entry.card?.name || "Unknown"}
      </motion.div>
    </motion.div>
  );
}
