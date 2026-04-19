import React, { useState } from "react";
import { motion } from "framer-motion";

const RULES = [
  "Summon and attack with minions to destroy enemy hero and his stuff.",
  "Cards cost AURA. You gain +1 Max Aura per turn, up to 10.",
  "Use Spells Wisely.",
  "Each Hero has 2 Charges of a CRAZYY OP Ultimate, available at 5 Aura and 10 Aura.",
];

export default function RulesScreen({ onContinue }) {
  const [dontShow, setDontShow] = useState(false);

  const go = () => {
    if (dontShow) {
      try { localStorage.setItem("co_rules_seen_v1", "1"); } catch (_) { /* ignore */ }
    }
    onContinue();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9100,
        background: "radial-gradient(ellipse at center, rgba(15,10,28,0.75) 0%, rgba(4,4,10,0.95) 80%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 28, padding: 32,
      }}
    >
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, margin: 0, letterSpacing: 1.5,
          lineHeight: 1.3,
          padding: "0.18em 0.1em",
          background: "linear-gradient(180deg, #ffeda0 0%, #f3b73a 45%, #a56617 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", color: "transparent",
          textShadow: "0 6px 32px rgba(243,183,58,0.5)",
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
          textAlign: "center",
          overflow: "visible",
        }}
      >
        How to Destroy This Fucker
      </motion.h1>

      <motion.ol
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        style={{
          listStyle: "none", padding: 0, margin: 0,
          display: "flex", flexDirection: "column", gap: 14,
          maxWidth: 640, width: "100%",
        }}
      >
        {RULES.map((rule, idx) => (
          <motion.li
            key={idx}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + idx * 0.1 }}
            style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "14px 18px",
              background: "linear-gradient(135deg, rgba(28,22,10,0.65), rgba(12,8,4,0.7))",
              border: "1px solid rgba(243,183,58,0.35)",
              borderRadius: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,220,130,0.08)",
            }}
          >
            <span style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #f3b73a, #a56617)",
              color: "#1a0f02", fontWeight: 900, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 10px rgba(243,183,58,0.6)",
              fontFamily: "'Cinzel', 'Trajan Pro', serif",
            }}>{idx + 1}</span>
            <span style={{
              fontSize: 15, lineHeight: 1.5, color: "#f4ecd8",
              fontWeight: 500, letterSpacing: 0.2,
            }}>{rule}</span>
          </motion.li>
        ))}
      </motion.ol>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.85 }}
        style={{ fontSize: 17, color: "#ffd87a", fontWeight: 800, textShadow: "0 0 12px rgba(243,183,58,0.5)", textAlign: "center", letterSpacing: 0.6 }}
      >
        NOW GO GO GAME END THIS FUCKER GO GO COME ON!!!
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.95 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 36px rgba(243,183,58,0.75)" }}
          whileTap={{ scale: 0.96 }}
          onClick={go}
          style={{
            padding: "16px 48px", fontSize: 19, fontWeight: 900, letterSpacing: 1.4,
            border: "2px solid #f3b73a", borderRadius: 12,
            background: "linear-gradient(135deg, #2a1a05, #5c3d10)",
            color: "#ffeda0", cursor: "pointer",
            boxShadow: "0 0 24px rgba(243,183,58,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
            textTransform: "uppercase",
            fontFamily: "'Cinzel', 'Trajan Pro', serif",
          }}
        >
          LET'S GO
        </motion.button>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a59873", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            style={{ accentColor: "#f3b73a", width: 14, height: 14 }}
          />
          Don't show this again
        </label>
      </motion.div>
    </motion.div>
  );
}
