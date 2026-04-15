import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HandCard from "./HandCard.jsx";

export default function MulliganScreen({ hand, onConfirm }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (uid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const confirm = () => onConfirm(Array.from(selected));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "radial-gradient(ellipse at center, rgba(20,30,55,0.72) 0%, rgba(4,8,18,0.92) 80%)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
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
          background: "linear-gradient(180deg, #ffe08a 0%, #f0b847 50%, #b2741f 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", color: "transparent",
          textShadow: "0 4px 24px rgba(240,184,71,0.35)",
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
        }}>
          Change ur GAY cards if needed.
        </div>
        <div style={{ fontSize: 13, color: "#b7c3d8", marginTop: 10, letterSpacing: 0.6, fontWeight: 600 }}>
          Click any card to mark it for replacement. Hit Lock In when you're ready.
        </div>
      </motion.div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", perspective: 1200 }}>
        <AnimatePresence>
          {hand.map((card, idx) => {
            const isSelected = selected.has(card.uid);
            return (
              <motion.div
                key={card.uid}
                initial={{ y: 80, opacity: 0, rotate: -10 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.45, delay: 0.2 + idx * 0.08, ease: [0.2, 0.9, 0.35, 1] }}
                whileHover={{ y: -10, scale: 1.03 }}
                onClick={() => toggle(card.uid)}
                style={{
                  position: "relative", cursor: "pointer",
                  filter: isSelected ? "grayscale(0.4) brightness(0.7)" : "none",
                  transition: "filter 0.2s ease",
                }}
              >
                <HandCard card={card} selected={false} disabled={false} onClick={() => toggle(card.uid)} dragEnabled={false} width={140} height={204} />
                {isSelected && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(226,75,74,0.2)", border: "3px solid #E24B4A", borderRadius: 14,
                    pointerEvents: "none",
                  }}>
                    <div style={{ fontSize: 72, color: "#E24B4A", fontWeight: 900, textShadow: "0 4px 18px rgba(0,0,0,0.8)" }}>✕</div>
                  </div>
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
    </motion.div>
  );
}
