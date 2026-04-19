import React from "react";
import { motion } from "framer-motion";

const RARITY_GLOW = "rgba(250,199,117,0.55)";

export default function UltimateTooltip({ meta, unlockedCharges, usedCharges, maxCharges, anchorRect, placement = "left" }) {
  if (!meta || !anchorRect) return null;

  const cardW = 200;
  const cardH = 280;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const rawLeft = placement === "right"
    ? anchorRect.right + 16
    : anchorRect.left - cardW - 16;
  const left = Math.min(vw - cardW - 12, Math.max(12, rawLeft));
  const rawTop = anchorRect.top + anchorRect.height / 2 - cardH / 2;
  const top = Math.min(vh - cardH - 12, Math.max(12, rawTop));

  const pips = Array.from({ length: maxCharges }).map((_, i) => {
    const isUsed = i < usedCharges;
    const isLocked = i >= unlockedCharges;
    return { isUsed, isLocked };
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed",
        left,
        top,
        width: cardW,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: cardW,
          height: cardH,
          borderRadius: 14,
          background: `linear-gradient(180deg, ${meta.themeColor}33, rgba(15,20,35,0.95))`,
          border: `2px solid ${meta.themeColor}`,
          boxShadow: `0 0 24px ${meta.themeColor}88, 0 10px 28px rgba(0,0,0,0.7), inset 0 0 16px ${RARITY_GLOW}`,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          color: "#f0eee6",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "#2b3c90", border: "2px solid #9bb6ff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 18, color: "#fff",
            boxShadow: "0 0 10px #3b57d0aa",
          }}>{meta.cost}</div>
          <div style={{ fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}>{meta.emoji}</div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 16, textAlign: "center", color: meta.themeColor, textShadow: `0 0 8px ${meta.themeColor}88` }}>
          {meta.name}
        </div>
        <div style={{
          flex: 1,
          fontSize: 12.5,
          lineHeight: 1.4,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: 10,
          color: "#dcdac8",
        }}>
          {meta.desc}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
          {pips.map((p, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: p.isUsed ? "#333" : p.isLocked ? "#1a2030" : meta.themeColor,
              border: `1.5px solid ${p.isLocked ? "#445" : meta.themeColor}`,
              boxShadow: !p.isUsed && !p.isLocked ? `0 0 8px ${meta.themeColor}` : "none",
              opacity: p.isLocked ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, color: "#000",
            }}>
              {p.isUsed ? "✓" : p.isLocked ? "🔒" : "⚡"}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#99a0b0", textAlign: "center" }}>
          Charges unlock at 5 and 10 mana.
        </div>
      </div>
    </motion.div>
  );
}
