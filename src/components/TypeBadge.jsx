import React from "react";

const STYLES = {
  spell: {
    bg: "linear-gradient(135deg, #6b2fc8 0%, #9b6bff 100%)",
    border: "#c8a0ff",
    text: "#ffffff",
    icon: "✦",
    label: "SPELL",
  },
  minion: {
    bg: "linear-gradient(135deg, #8b5a1a 0%, #c8860a 100%)",
    border: "#ffd98a",
    text: "#fff4d0",
    icon: "⚔",
    label: "MINION",
  },
};

export default function TypeBadge({ type = "minion", scale = 1 }) {
  const s = STYLES[type] || STYLES.minion;
  const fontSize = Math.max(6.5, 7.5 * scale);
  return (
    <div
      style={{
        position: "absolute",
        top: 4,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 5px",
        borderRadius: 8,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize,
        fontWeight: 900,
        letterSpacing: 0.4,
        boxShadow: `0 1px 3px rgba(0,0,0,0.6), 0 0 6px ${s.border}66`,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: fontSize * 1.1, lineHeight: 1 }}>{s.icon}</span>
      <span style={{ lineHeight: 1 }}>{s.label}</span>
    </div>
  );
}
