import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SHARDS = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const radius = 380 + Math.random() * 280;
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius * 0.85,
    delay: Math.random() * 0.08,
    size: 6 + Math.random() * 10,
    hue: 18 + Math.random() * 22,
  };
});

function NukeBlastFXImpl({ active, onDone }) {
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    setPhase("flash");
    const t1 = setTimeout(() => setPhase("blast"), 180);
    const t2 = setTimeout(() => setPhase("settle"), 1100);
    const t3 = setTimeout(() => {
      setPhase("idle");
      onDone?.();
    }, 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [active, onDone]);

  return (
    <AnimatePresence>
      {phase !== "idle" && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* White flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "flash" ? [0, 1, 0.85] : 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 50% 55%, #fff 0%, #ffe8a3 25%, #ff7733 55%, transparent 80%)",
              mixBlendMode: "screen",
            }}
          />

          {/* Shockwave ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.05 }}
            animate={{ opacity: [0, 1, 0], scale: [0.05, 3.2, 4.2] }}
            transition={{ duration: 1.1, ease: [0.18, 0.7, 0.25, 1], delay: 0.12 }}
            style={{
              position: "absolute",
              top: "55%",
              left: "50%",
              width: 280,
              height: 280,
              marginLeft: -140,
              marginTop: -140,
              borderRadius: "50%",
              border: "6px solid rgba(255,200,100,0.85)",
              boxShadow:
                "0 0 60px rgba(255,150,40,0.9), inset 0 0 80px rgba(255,220,140,0.7)",
            }}
          />

          {/* Secondary shockwave */}
          <motion.div
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{ opacity: [0, 0.7, 0], scale: [0.1, 2.4, 3.2] }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.22 }}
            style={{
              position: "absolute",
              top: "55%",
              left: "50%",
              width: 220,
              height: 220,
              marginLeft: -110,
              marginTop: -110,
              borderRadius: "50%",
              border: "3px solid rgba(255,80,40,0.7)",
              boxShadow: "0 0 40px rgba(255,80,40,0.6)",
            }}
          />

          {/* Mushroom column rising */}
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 1, 0.8],
              y: [80, -40, -110, -150],
              scale: [0.4, 1.05, 1.25, 1.35],
            }}
            transition={{ duration: 1.6, times: [0, 0.25, 0.7, 1], ease: "easeOut", delay: 0.18 }}
            style={{
              position: "absolute",
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: 220,
              filter:
                "drop-shadow(0 0 30px #ff7733) drop-shadow(0 0 60px #ffaa44) drop-shadow(0 6px 18px rgba(0,0,0,0.7))",
            }}
          >
            ☢️
          </motion.div>

          {/* Mushroom puff */}
          <motion.div
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 0.85, 0.6, 0], scale: [0.2, 1.6, 2.1, 2.5] }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.35 }}
            style={{
              position: "absolute",
              top: "42%",
              left: "50%",
              width: 360,
              height: 360,
              marginLeft: -180,
              marginTop: -180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #fff5d0 0%, #ffae5a 30%, #b6532a 60%, transparent 80%)",
              filter: "blur(6px)",
              mixBlendMode: "screen",
            }}
          />

          {/* Debris shards */}
          {SHARDS.map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: [1, 1, 0],
                x: s.dx,
                y: s.dy,
                scale: [0.6, 1.15, 0.4],
              }}
              transition={{ duration: 1.0, ease: "easeOut", delay: 0.16 + s.delay }}
              style={{
                position: "absolute",
                top: "55%",
                left: "50%",
                width: s.size,
                height: s.size,
                borderRadius: "50%",
                background: `radial-gradient(circle, #fff 0%, hsl(${s.hue}, 95%, 55%) 50%, transparent 75%)`,
                boxShadow: `0 0 14px hsl(${s.hue}, 95%, 60%)`,
              }}
            />
          ))}

          {/* Vignette darken when settling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "settle" ? 0.55 : 0 }}
            transition={{ duration: 0.45 }}
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 60%, transparent 35%, rgba(0,0,0,0.85) 100%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(NukeBlastFXImpl);
