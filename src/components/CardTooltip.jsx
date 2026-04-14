import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import TemplateCardFace from "./TemplateCardFace.jsx";

export default function CardTooltip({ card, mouseX, mouseY }) {
  const [frameFailed, setFrameFailed] = useState(false);
  if (!card || mouseX == null) return null;
  const W = 332;
  const H = 470;
  const flipLeft = mouseX + W + 48 > window.innerWidth;
  const x = flipLeft ? mouseX - W - 28 : mouseX + 30;
  const y = Math.max(12, Math.min(mouseY - H * 0.32, window.innerHeight - H - 12));

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.92, x: flipLeft ? 12 : -12, y: 6 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: flipLeft ? 8 : -8, y: 4 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: W,
        height: H,
        zIndex: 9999,
        pointerEvents: "none",
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(6,10,18,0.45)",
        border: "1px solid rgba(130,170,220,0.22)",
        boxShadow: "0 20px 54px rgba(0,0,0,0.78), 0 0 24px rgba(72,125,190,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
        willChange: "transform, opacity",
        transform: "translateZ(0)",
      }}
    >
      {!frameFailed ? (
        <TemplateCardFace card={card} width={W} height={H} onFrameError={() => setFrameFailed(true)} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 13 }}>
          Preview unavailable
        </div>
      )}
    </motion.div>,
    document.body
  );
}
