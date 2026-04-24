import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import { bgMusic } from "../audio/bgMusic.js";

export default function AudioControls({ bottom = 16, right = 16, zIndex = 1400 }) {
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(() => bgMusic.getVolume?.() ?? 0.35);
  const [muted, setMuted] = useState(() => bgMusic.isMuted?.() ?? false);

  useEffect(() => {
    const unsub = bgMusic.subscribe?.(({ volume: v, muted: m }) => {
      setVolume(v); setMuted(m);
    });
    return () => { unsub && unsub(); };
  }, []);

  const icon = muted || volume === 0 ? "🔇" : volume < 0.34 ? "🔈" : volume < 0.67 ? "🔉" : "🔊";

  return (
    <div style={{ position: "fixed", bottom, right, zIndex, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, pointerEvents: "auto", fontFamily: "system-ui, sans-serif" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.2, 0.9, 0.35, 1] }}
            style={{
              background: "linear-gradient(160deg, rgba(10,18,32,0.98), rgba(4,8,18,0.98))",
              border: "1px solid rgba(55,138,221,0.45)",
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 22px rgba(55,138,221,0.25)",
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2, color: "#85B7EB", textTransform: "uppercase", marginBottom: 8 }}>Audio</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => bgMusic.toggleMute()}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: muted ? "rgba(200,70,70,0.25)" : "rgba(55,138,221,0.18)",
                  border: `1px solid ${muted ? "#e48a8a" : "#378ADD"}`,
                  color: "#fff", fontSize: 16, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (muted && v > 0) bgMusic.setMuted(false);
                  bgMusic.setVolume(v);
                }}
                style={{ flex: 1, accentColor: "#378ADD", cursor: "pointer" }}
              />
              <div style={{ fontSize: 10, color: "#85B7EB", fontWeight: 800, width: 30, textAlign: "right" }}>
                {Math.round((muted ? 0 : volume) * 100)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onMouseEnter={() => {}}
        onClick={() => setOpen(o => !o)}
        title="Audio"
        style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(140deg, rgba(10,18,32,0.95), rgba(4,8,18,0.95))",
          border: "1px solid rgba(55,138,221,0.55)",
          color: "#fff", fontSize: 20, cursor: "pointer",
          boxShadow: "0 6px 22px rgba(0,0,0,0.55), 0 0 18px rgba(55,138,221,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {icon}
      </button>
    </div>
  );
}
