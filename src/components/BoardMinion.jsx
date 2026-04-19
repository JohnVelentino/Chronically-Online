import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RC } from "../data/cards.js";
import SummonRune from "./SummonRune.jsx";
import CardTooltip from "./CardTooltip.jsx";
import { CLASS_PALETTE } from "./TemplateCardFace.jsx";

const CLASS_PALETTE_DEFAULT = { bg: "rgba(30,40,60,0.35)", border: "#334455", text: "#667788" };

const KEYWORD_ICONS = {
  taunt:         null, // handled via ring
  divine_shield: null, // handled via ring
  windfury:      "⚡⚡",
  charge:        "⚡",
  rush:          "💨",
  lifesteal:     "💚",
  poisonous:     "☠️",
  elusive:       "👻",
  aura_other_friendly_attack_1: "✨",
};

export default function BoardMinion({
  minion,
  onClick,
  isSelected,
  isTarget,
  minionRef,
  isAttacking,
  isDefending,
  impactKey,
  showRune,
  attackUp = true,
  cardW = 100,
  cardH = 133,
  showBreathing = true,
}) {
  const [hov, setHov] = useState(false);
  const [flash, setFlash] = useState(true);
  const [mouse, setMouse] = useState(null);
  const [impact, setImpact] = useState(false);
  const containerRef = useRef(null);
  const breatheDelay = useRef(-Math.random() * 2500).current;

  const rc = RC[minion.rarity || "common"];
  const classKey = String(minion.classTag || minion.faction || minion.class || "").trim().toLowerCase();
  const classPalette = CLASS_PALETTE[classKey] || CLASS_PALETTE_DEFAULT;

  const hasTaunt        = minion.keywords?.includes("taunt");
  const hasDivineShield = minion.keywords?.includes("divine_shield");
  const hasCharge       = minion.keywords?.includes("charge");
  const canAct = !minion.summoningSick && minion.canAttack !== false && minion.atk > 0;
  const isDamaged = minion.hp < (minion.maxHp ?? minion.hp);

  // Extra keyword badges (skip taunt/divine_shield — shown via rings)
  const kwBadges = (minion.keywords || [])
    .filter(k => k !== "taunt" && k !== "divine_shield" && KEYWORD_ICONS[k])
    .map(k => KEYWORD_ICONS[k]);

  // Border / glow colour
  const bc = isSelected ? "#FAC775"
    : isTarget    ? "#5DCAA5"
    : hasTaunt    ? "#EF9F27"
    : canAct      ? rc.border
    : classPalette.border;

  const baseGlow = isSelected
    ? "0 0 34px rgba(250,199,117,0.9)"
    : isTarget
      ? "0 0 24px rgba(93,202,165,0.75)"
      : hasTaunt
        ? "0 0 22px rgba(239,159,39,0.62)"
        : canAct && hov
          ? `0 0 26px ${rc.glow}`
          : `0 0 10px ${classPalette.border}44`;
  const entryGlow = flash ? "0 0 40px rgba(239,159,39,0.88)" : baseGlow;

  useEffect(() => { const id = setTimeout(() => setFlash(false), 420); return () => clearTimeout(id); }, []);

  useEffect(() => {
    if (isDefending && impactKey) {
      setImpact(true);
      const id = setTimeout(() => setImpact(false), 80);
      return () => clearTimeout(id);
    }
  }, [impactKey, isDefending]);

  // Use circle diameter = cardW; outer wrapper is square cardW×cardW
  const D = cardW;
  const BADGE = Math.max(28, Math.round(D * 0.32)); // stat badge diameter
  const BADGE_FONT = Math.max(13, Math.round(BADGE * 0.46));
  const BADGE_OFFSET = Math.round(BADGE * 0.38); // how far badges poke outside circle

  const translateY = isSelected ? -14 : hov ? -6 : 0;
  const scaleTarget = isSelected ? 1.09 : hov ? 1.035 : 1;
  const entryArc = flash ? { y: [-80, 18, translateY], scale: [0.5, 1.15, scaleTarget], opacity: [0, 1, 1] } : null;
  const regularAnim = { y: translateY, scale: scaleTarget, opacity: 1 };
  const LUNGE = 38;
  const attackAnim = isAttacking ? { y: attackUp ? [0, -LUNGE, 0] : [0, LUNGE, 0] } : {};

  return (
    <>
      <style>{`
        @keyframes boardBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.025); } }
        @keyframes divineShimmer { 0%,100% { opacity:0.55; } 50% { opacity:1; } }
      `}</style>
      <motion.div
        ref={(el) => {
          containerRef.current = el;
          if (minionRef) { if (typeof minionRef === "function") minionRef(el); else minionRef.current = el; }
        }}
        layout
        layoutId={`card-${minion.uid}`}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setMouse(null); }}
        onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
        initial={{ scale: 0.5, opacity: 0, y: -80 }}
        animate={{ ...(entryArc ?? regularAnim), ...attackAnim }}
        exit={{ opacity: 0, scale: 0, rotate: 15, filter: "blur(8px)", transition: { duration: 0.4 } }}
        transition={{
          y: isAttacking
            ? { duration: 0.35, times: [0, 0.28, 1], ease: ["easeIn", "easeOut"] }
            : entryArc
              ? { type: "spring", stiffness: 280, damping: 22 }
              : { type: "spring", stiffness: 260, damping: 22 },
          scale: entryArc ? { type: "spring", stiffness: 320, damping: 26 } : { type: "spring", stiffness: 260, damping: 22 },
          opacity: entryArc ? { duration: 0.35 } : { duration: 0.2 },
        }}
        style={{
          width: D,
          minWidth: D,
          // Extra vertical space for name label above + badges below
          height: D + BADGE_OFFSET + 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          cursor: "pointer",
          userSelect: "none",
          opacity: minion.summoningSick && !hasCharge ? 0.52 : 1,
          position: "relative",
          boxSizing: "border-box",
          overflow: "visible",
          willChange: "transform",
        }}
      >
        {/* ── Keyword badges row (above circle) ─────────────── */}
        {kwBadges.length > 0 && (
          <div style={{ display: "flex", gap: 3, marginBottom: 4, flexWrap: "wrap", justifyContent: "center" }}>
            {kwBadges.map((icon, i) => (
              <span key={i} style={{ fontSize: 9, background: "rgba(0,0,0,0.7)", border: `1px solid ${rc.border}66`, borderRadius: 4, padding: "1px 4px", color: "#cde", lineHeight: 1.3, fontWeight: 900 }}>
                {icon}
              </span>
            ))}
          </div>
        )}

        {/* ── Circle avatar ────────────────────────────────── */}
        <div style={{ position: "relative", width: D, height: D, flexShrink: 0 }}>

          {/* Taunt: gold diamond backdrop sits behind circle — clip-path so tips stick out
              horizontally beyond the circle while vertical extent stays within row bounds. */}
          {hasTaunt && (() => {
            const DW = Math.round(D * 1.28); // width wider than circle → horizontal tips poke out
            const DH = Math.round(D * 0.62); // flat diamond — top/bottom tips stay well inside circle so diagonals don't bleed into stat-badge corners
            const diamondClip = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
            // Centered via computed top/left (not transform) so `boardBreathe`
            // scale animation on the gold body doesn't wipe out a translate.
            return (
              <>
                {/* Outer gold glow layer */}
                <div style={{
                  position: "absolute",
                  width: DW + 10, height: DH + 10,
                  top: (D - DH - 10) / 2, left: (D - DW - 10) / 2,
                  clipPath: diamondClip,
                  WebkitClipPath: diamondClip,
                  background: "radial-gradient(ellipse at center, rgba(255,210,100,0.6), rgba(239,159,39,0))",
                  filter: "blur(2px)",
                  pointerEvents: "none", zIndex: 0,
                }} />
                {/* Gold diamond body */}
                <div style={{
                  position: "absolute",
                  width: DW, height: DH,
                  top: (D - DH) / 2, left: (D - DW) / 2,
                  clipPath: diamondClip,
                  WebkitClipPath: diamondClip,
                  background: "linear-gradient(135deg, #ffd45a 0%, #f0a800 35%, #a05800 100%)",
                  boxShadow: "0 0 22px rgba(239,159,39,0.85)",
                  pointerEvents: "none", zIndex: 0,
                  transformOrigin: "center center",
                  animation: showBreathing ? "boardBreathe 2.6s ease-in-out infinite" : "none",
                  animationDelay: `${breatheDelay}ms`,
                }} />
                {/* Inner dark diamond — gives the gold a frame look around the circle */}
                <div style={{
                  position: "absolute",
                  width: DW - 10, height: DH - 10,
                  top: (D - (DH - 10)) / 2, left: (D - (DW - 10)) / 2,
                  clipPath: diamondClip,
                  WebkitClipPath: diamondClip,
                  background: "linear-gradient(135deg, rgba(30,16,0,0.85), rgba(8,4,0,0.95))",
                  pointerEvents: "none", zIndex: 0,
                }} />
              </>
            );
          })()}

          {/* Divine shield shimmer ring */}
          {hasDivineShield && (
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: "2px solid rgba(200,230,255,0.9)",
              boxShadow: "0 0 20px rgba(180,220,255,0.8), 0 0 40px rgba(120,180,255,0.4)",
              animation: "divineShimmer 1.6s ease-in-out infinite",
              pointerEvents: "none", zIndex: 0,
            }} />
          )}

          {/* Summon rune */}
          {showRune && <SummonRune color={rc.border} />}

          {/* Circle avatar (taunt and non-taunt alike) */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `3px solid ${bc}`,
            background: `radial-gradient(circle at 38% 32%, ${classPalette.bg}, #060c18)`,
            boxShadow: entryGlow,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            animation: showBreathing ? "boardBreathe 2.6s ease-in-out infinite" : "none",
            animationDelay: `${breatheDelay}ms`,
            transition: "border-color 200ms, box-shadow 200ms",
            willChange: "transform",
            zIndex: 1,
          }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: `inset 0 0 16px ${rc.glow}`, pointerEvents: "none" }} />
            {impact && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,60,60,0.65)", pointerEvents: "none", mixBlendMode: "screen" }} />}
            <span style={{
              fontSize: Math.round(D * 0.44),
              lineHeight: 1,
              filter: `drop-shadow(0 2px 10px ${rc.glow})`,
              userSelect: "none",
              position: "relative", zIndex: 1,
            }}>
              {minion.emoji || "⚔️"}
            </span>
          </div>

          {/* TAUNT label — sits above the diamond tip */}
          {hasTaunt && (
            <div style={{
              position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
              fontSize: 7, color: "#f0a800", fontWeight: 900,
              background: "#0d0800", padding: "2px 6px", borderRadius: 3,
              whiteSpace: "nowrap", border: "1px solid #EF9F2788", zIndex: 4,
              letterSpacing: 1.2, textTransform: "uppercase",
            }}>
              ◆ TAUNT
            </div>
          )}

          {/* Sleepy indicator */}
          {minion.summoningSick && !hasCharge && (
            <div style={{
              position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
              fontSize: 6, color: "#445", background: "#060c16",
              padding: "1px 4px", borderRadius: 2, whiteSpace: "nowrap", zIndex: 3,
            }}>
              💤
            </div>
          )}

          {/* ── ATK badge — bottom left ── */}
          <div style={{
            position: "absolute",
            bottom: -BADGE_OFFSET,
            left: -Math.round(BADGE * 0.22),
            width: BADGE, height: BADGE, borderRadius: "50%",
            background: "linear-gradient(145deg, #6b3b00, #c87d08)",
            border: "2.5px solid rgba(255,210,80,0.55)",
            boxShadow: "0 3px 12px rgba(0,0,0,0.85), 0 0 10px rgba(200,134,10,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5, flexShrink: 0,
          }}>
            <span style={{ fontSize: BADGE_FONT, fontWeight: 900, color: "#fff", textShadow: "0 1px 4px #000", lineHeight: 1 }}>
              {minion.atk}
            </span>
          </div>

          {/* ── HP badge — bottom right ── */}
          <div style={{
            position: "absolute",
            bottom: -BADGE_OFFSET,
            right: -Math.round(BADGE * 0.22),
            width: BADGE, height: BADGE, borderRadius: "50%",
            background: isDamaged
              ? "linear-gradient(145deg, #5a0010, #a01020)"
              : "linear-gradient(145deg, #7a0010, #c0192c)",
            border: `2.5px solid rgba(255,${isDamaged ? 80 : 120},120,0.55)`,
            boxShadow: `0 3px 12px rgba(0,0,0,0.85), 0 0 10px rgba(192,25,44,${isDamaged ? "0.8" : "0.5"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5, flexShrink: 0, position: "absolute",
          }}>
            {isDamaged && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,32,64,0.4)", animation: "damagedHpPulse 1.4s ease-in-out infinite", pointerEvents: "none" }} />
            )}
            <span style={{ fontSize: BADGE_FONT, fontWeight: 900, color: "#fff", textShadow: "0 1px 4px #000", lineHeight: 1, position: "relative", zIndex: 1 }}>
              {minion.hp}
            </span>
          </div>

        </div>{/* end circle */}

        {/* Hover tooltip */}
        {hov && mouse && <CardTooltip card={minion} mouseX={mouse.x} mouseY={mouse.y} />}
      </motion.div>
    </>
  );
}
