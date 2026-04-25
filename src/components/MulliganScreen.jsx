import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HandCard from "./HandCard.jsx";
import TemplateCardFace from "./TemplateCardFace.jsx";
import { getSFX } from "../audio/sfx.js";

export default function MulliganScreen({ hand, onConfirm }) {
  const [selected, setSelected] = useState(new Set());
  const [hovered, setHovered] = useState(null); // { card, x, y }

  const toggle = (uid) => {
    try { getSFX().cardSelect(); } catch (_) {}
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const confirm = () => {
    try { getSFX().buttonClick(); } catch (_) {}
    onConfirm(Array.from(selected));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "radial-gradient(ellipse at center, rgba(20,30,55,0.98) 0%, rgba(4,8,18,1) 80%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 36, padding: 32,
      }}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        style={{ textAlign: "center" }}
      >
        <div style={{
          fontSize: 40, fontWeight: 900, letterSpacing: 1,
          lineHeight: 1.3,
          padding: "0.18em 0.1em",
          background: "linear-gradient(180deg, #ffe08a 0%, #f0b847 50%, #b2741f 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", color: "transparent",
          textShadow: "0 4px 24px rgba(240,184,71,0.35)",
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
          overflow: "visible",
        }}>
          Change ur GAY cards if needed.
        </div>
        <div style={{ fontSize: 13, color: "#b7c3d8", marginTop: 10, letterSpacing: 0.6, fontWeight: 600 }}>
          Replace High Cost Cards and unnecesary Spells.
        </div>
      </motion.div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", perspective: 1200 }}>
        <AnimatePresence>
          {hand.map((card, idx) => {
            const isSelected = selected.has(card.uid);
            return (
              <motion.div
                key={card.uid}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.08 + idx * 0.04, ease: [0.2, 0.9, 0.35, 1] }}
                whileHover={{ y: -10, scale: 1.03 }}
                onClick={() => toggle(card.uid)}
                onMouseEnter={(e) => setHovered({ card, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setHovered(prev => prev?.card?.uid === card.uid ? { ...prev, x: e.clientX, y: e.clientY } : prev)}
                onMouseLeave={() => setHovered(prev => prev?.card?.uid === card.uid ? null : prev)}
                style={{
                  position: "relative", cursor: "pointer",
                  filter: isSelected ? "grayscale(0.5) brightness(0.55)" : "none",
                  transition: "filter 0.2s ease",
                }}
              >
                <div style={{ pointerEvents: "none" }}>
                  <HandCard card={card} selected={false} disabled={false} onClick={() => {}} dragEnabled={false} width={140} height={204} />
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(226,75,74,0.28)",
                      border: "4px solid #ff5a58",
                      borderRadius: 14,
                      boxShadow: "0 0 28px rgba(255,90,88,0.85), inset 0 0 24px rgba(255,90,88,0.55)",
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{
                      fontSize: 140, lineHeight: 1, color: "#fff",
                      fontWeight: 900,
                      textShadow: "0 0 18px #ff2a28, 0 0 36px #ff5a58, 0 6px 22px rgba(0,0,0,0.9)",
                      fontFamily: "'Cinzel', 'Trajan Pro', serif",
                    }}>✕</div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        whileHover={{ scale: 1.05, boxShadow: "0 0 32px rgba(240,184,71,0.7)" }}
        whileTap={{ scale: 0.97 }}
        onClick={confirm}
        style={{
          padding: "14px 38px", fontSize: 17, fontWeight: 900, letterSpacing: 1.2,
          border: "2px solid #f0b847", borderRadius: 12,
          background: "linear-gradient(135deg, #2a1a05, #5c3d10)",
          color: "#ffe08a", cursor: "pointer",
          boxShadow: "0 0 20px rgba(240,184,71,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
          textTransform: "uppercase",
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
        }}
      >
        {selected.size === 0 ? "Keep All" : `Mulligan ${selected.size} → Lock In`}
      </motion.button>

      <AnimatePresence>
        {hovered && (() => {
          const PREVIEW_W = 280;
          const PREVIEW_H = 400;
          const GAP = 22;
          const cx = hovered.x ?? 200;
          const cy = hovered.y ?? 200;
          const wantLeft = cx + GAP + PREVIEW_W + 8 > window.innerWidth;
          const rawLeft = wantLeft ? cx - GAP - PREVIEW_W : cx + GAP;
          const left = Math.max(8, Math.min(rawLeft, window.innerWidth - PREVIEW_W - 8));
          const rawTop = cy - PREVIEW_H / 2;
          const top = Math.max(8, Math.min(rawTop, window.innerHeight - PREVIEW_H - 8));
          return (
            <motion.div
              key={"mull-preview-" + hovered.card.uid}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.14 }}
              style={{ position: "fixed", left, top, width: PREVIEW_W, height: PREVIEW_H, borderRadius: 20, zIndex: 9500, pointerEvents: "none", boxShadow: "0 24px 54px rgba(0,0,0,0.85), 0 0 36px rgba(240,184,71,0.45)" }}
            >
              <TemplateCardFace card={hovered.card} width={PREVIEW_W} height={PREVIEW_H} />
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
