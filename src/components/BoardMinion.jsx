import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RC } from "../data/cards.js";
import SummonRune from "./SummonRune.jsx";
import CardTooltip from "./CardTooltip.jsx";
import TemplateCardFace, { CLASS_PALETTE } from "./TemplateCardFace.jsx";

const CLASS_PALETTE_DEFAULT = { bg: "rgba(30,40,60,0.35)", border: "#334455", text: "#667788" };

const BOARD_CARD_W = 132;
const BOARD_CARD_H = 176;

/** Assign a random animationDelay to every looping CSS animation in the subtree. */
function desyncAnimations(root) {
  if (!root) return;
  root.querySelectorAll("*").forEach((el) => {
    const name = getComputedStyle(el).animationName;
    if (name && name !== "none") {
      el.style.animationDelay = `-${Math.random() * 800}ms`;
    }
  });
}

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
  cardW = BOARD_CARD_W,
  cardH = BOARD_CARD_H,
  showBreathing = true,
}) {
  const [hov, setHov] = useState(false);
  const [flash, setFlash] = useState(true);
  const [mouse, setMouse] = useState(null);
  const [impact, setImpact] = useState(false);
  const [templateFailed, setTemplateFailed] = useState(false);
  const cardRef = useRef(null);
  const breatheDelay = useRef(-Math.random() * 2500).current;

  const rc = RC[minion.rarity || "common"];
  const classKey = String(minion.classTag || minion.faction || minion.class || "").trim().toLowerCase();
  const classPalette = CLASS_PALETTE[classKey] || CLASS_PALETTE_DEFAULT;
  const hasTaunt = minion.keywords?.includes("taunt");
  const hasCharge = minion.keywords?.includes("charge");
  const canAct = !minion.summoningSick && minion.canAttack !== false && minion.atk > 0;
  const bc = isSelected ? "#FAC775" : isTarget ? "#5DCAA5" : hasTaunt ? "#EF9F27" : canAct ? rc.border : classPalette.border;
  const baseGlow = isSelected
    ? "0 0 34px rgba(250,199,117,0.9)"
    : isTarget
      ? "0 0 24px rgba(93,202,165,0.75)"
      : hasTaunt
        ? "0 0 22px rgba(239,159,39,0.62)"
        : canAct && hov
          ? `0 0 24px ${classPalette.border}cc, 0 0 10px ${rc.glow}`
          : `0 0 12px ${classPalette.border}55, 0 4px 12px rgba(0,0,0,0.45)`;
  const entryGlow = flash ? "0 0 40px rgba(239,159,39,0.88)" : baseGlow;

  useEffect(() => {
    const id = setTimeout(() => setFlash(false), 420);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    desyncAnimations(cardRef.current);
  }, []);

  useEffect(() => {
    if (isDefending && impactKey) {
      setImpact(true);
      const id = setTimeout(() => setImpact(false), 80);
      return () => clearTimeout(id);
    }
  }, [impactKey, isDefending]);

  const translateY = isSelected ? -14 : hov ? -6 : 0;
  const scaleTarget = isSelected ? 1.09 : hov ? 1.035 : 1;
  const entryArc = flash ? { y: [-80, 18, translateY], scale: [0.5, 1.15, scaleTarget], opacity: [0, 1, 1] } : null;
  const regularAnim = { y: translateY, scale: scaleTarget, opacity: 1 };
  const LUNGE = 38;
  const attackAnim = isAttacking ? { y: attackUp ? [0, -LUNGE, 0] : [0, LUNGE, 0] } : {};

  return (
    <>
    <style>{`@keyframes boardBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }`}</style>
    <motion.div
      ref={(el) => { cardRef.current = el; if (minionRef) { if (typeof minionRef === "function") minionRef(el); else minionRef.current = el; } }}
      layout
      layoutId={`card-${minion.uid}`}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => {
        setHov(false);
        setMouse(null);
      }}
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
        width: cardW,
        minWidth: cardW,
        height: cardH,
        background: rc.bg,
        border: "2px solid " + bc,
        borderRadius: 10,
        cursor: "pointer",
        userSelect: "none",
        opacity: minion.summoningSick && !hasCharge ? 0.5 : 1,
        boxShadow: entryGlow,
        position: "relative",
        boxSizing: "border-box",
        overflow: "visible",
        willChange: "transform",
      }}
    >
      {/* breathing idle wrapper */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 10,
        animation: showBreathing ? "boardBreathe 2.5s ease-in-out infinite" : "none",
        animationDelay: showBreathing ? `${breatheDelay}ms` : undefined,
        transformOrigin: "center center",
        willChange: "transform",
      }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 9, boxShadow: "inset 0 0 12px " + rc.glow, pointerEvents: "none" }} />
        {impact && <div style={{ position: "absolute", inset: 0, borderRadius: 9, background: "rgba(255,80,80,0.6)", pointerEvents: "none", mixBlendMode: "screen" }} />}
        {showRune && <SummonRune color={rc.border} />}

        {hasTaunt && (
          <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", fontSize: 6.5, color: "#EF9F27", fontWeight: 900, background: "#1a0e00", padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap", border: "1px solid #EF9F27", zIndex: 3 }}>
            TAUNT
          </div>
        )}
        {minion.summoningSick && !hasCharge && (
          <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", fontSize: 6, color: "#445", background: "#060c16", padding: "1px 3px", borderRadius: 2, whiteSpace: "nowrap", zIndex: 3 }}>
            sleepy
          </div>
        )}

        {!templateFailed ? (
          <TemplateCardFace card={{ ...minion, renderMode: "board" }} width={cardW} height={cardH} onFrameError={() => setTemplateFailed(true)} />
        ) : (
          <>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, filter: "drop-shadow(0 2px 8px " + rc.glow + ")" }}>
              {minion.emoji || "M"}
            </div>
            <div style={{ fontSize: 7.5, color: "#dde", textAlign: "center", fontWeight: 800, lineHeight: 1.1, marginBottom: 3 }}>
              {minion.name}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c8860a", border: "2px solid rgba(255,255,255,0.35)", boxShadow: "0 3px 10px rgba(0,0,0,0.85), 0 0 8px rgba(200,134,10,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.95)" }}>{minion.atk}</span>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c0192c", border: "2px solid rgba(255,255,255,0.35)", boxShadow: "0 3px 10px rgba(0,0,0,0.85), 0 0 8px rgba(192,25,44,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                {minion.hp < (minion.maxHp ?? minion.hp) && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,32,64,0.55)", animation: "damagedHpPulse 1.4s ease-in-out infinite", pointerEvents: "none", willChange: "opacity" }} />
                )}
                <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.95)", position: "relative", zIndex: 1 }}>{minion.hp}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {hov && mouse && <CardTooltip card={minion} mouseX={mouse.x} mouseY={mouse.y} />}
    </motion.div>
    </>
  );
}
