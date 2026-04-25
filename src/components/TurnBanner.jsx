import { motion } from "framer-motion";

export default function TurnBanner({ bannerKey, maxManaGain = 0 }) {
  if (!bannerKey) return null;
  return (
    <motion.div
      key={bannerKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1400,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes turnBannerSweep {
          0% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
          45% { opacity: 1; }
          100% { transform: translateX(180%) skewX(-18deg); opacity: 0; }
        }
        @keyframes turnBannerGlow {
          0%,100% { filter: drop-shadow(0 0 24px rgba(250,199,117,0.7)) drop-shadow(0 0 60px rgba(93,202,165,0.45)); }
          50% { filter: drop-shadow(0 0 44px rgba(250,199,117,1)) drop-shadow(0 0 100px rgba(93,202,165,0.75)); }
        }
        @keyframes turnBannerRayPulse {
          0%,100% { opacity: 0.35; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 0.85; transform: translate(-50%,-50%) scale(1.15); }
        }
        @keyframes auraBadgeFloat {
          0% { transform: translateY(14px); opacity: 0; }
          25% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0; }
        }
      `}</style>

      {/* Radial god-ray backdrop */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        width: "140vw", height: "140vw",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle, rgba(93,202,165,0.18) 0%, rgba(55,138,221,0.10) 28%, rgba(0,0,0,0) 55%)",
        animation: "turnBannerRayPulse 1.6s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ scale: 0.6, rotate: -4, y: 20 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 1.3, rotate: 2, y: -30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        style={{
          position: "relative",
          padding: "36px 110px",
          borderRadius: 28,
          background: "linear-gradient(160deg, rgba(12,30,24,0.92) 0%, rgba(6,16,28,0.95) 55%, rgba(14,38,30,0.92) 100%)",
          border: "2px solid rgba(250,199,117,0.75)",
          boxShadow: "0 0 60px rgba(93,202,165,0.55), 0 0 160px rgba(55,138,221,0.35), inset 0 2px 0 rgba(255,255,255,0.08), inset 0 -10px 30px rgba(0,0,0,0.6)",
          overflow: "hidden",
          animation: "turnBannerGlow 1.6s ease-in-out infinite",
        }}
      >
        {/* sheen sweep */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)",
          animation: "turnBannerSweep 1.6s ease-out infinite",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }} />

        {/* corner accents */}
        {[
          { top: 8, left: 8, bt: 1, bl: 1 },
          { top: 8, right: 8, bt: 1, br: 1 },
          { bottom: 8, left: 8, bb: 1, bl: 1 },
          { bottom: 8, right: 8, bb: 1, br: 1 },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute", ...s, width: 22, height: 22,
            borderTop: s.bt ? "2px solid #FAC775" : "none",
            borderLeft: s.bl ? "2px solid #FAC775" : "none",
            borderRight: s.br ? "2px solid #FAC775" : "none",
            borderBottom: s.bb ? "2px solid #FAC775" : "none",
            pointerEvents: "none",
          }} />
        ))}

        <div style={{
          position: "relative",
          fontFamily: "'Cinzel', 'Trajan Pro', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: "clamp(56px, 9vw, 120px)",
          letterSpacing: 6,
          lineHeight: 1,
          textAlign: "center",
          background: "linear-gradient(180deg, #ffffff 0%, #ffeda0 35%, #f3b73a 70%, #a56617 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", color: "transparent",
          textShadow: "0 0 40px rgba(250,199,117,0.55)",
          WebkitTextStroke: "1px rgba(255,255,255,0.25)",
        }}>
          YOUR TURN
        </div>

        <div style={{
          position: "relative",
          marginTop: 10,
          textAlign: "center",
          fontSize: 12,
          letterSpacing: 5,
          color: "#9bd5c0",
          textTransform: "uppercase",
          fontWeight: 800,
          textShadow: "0 0 12px rgba(93,202,165,0.6)",
        }}>
          — Make them regret it —
        </div>

        {maxManaGain > 0 && (
          <div style={{
            position: "absolute",
            bottom: -54, left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 22px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #0c2a54, #1e5aa0)",
            border: "2px solid #7ec6ff",
            boxShadow: "0 0 24px rgba(85,182,255,0.8), 0 0 48px rgba(55,138,221,0.55)",
            color: "#eaf5ff",
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: 2,
            whiteSpace: "nowrap",
            animation: "auraBadgeFloat 1.6s ease-out forwards",
          }}>
            <span style={{ fontSize: 20, filter: "drop-shadow(0 0 6px #7ec6ff)" }}>✦</span>
            <span>+{maxManaGain} MAX AURA</span>
            <span style={{ fontSize: 20, filter: "drop-shadow(0 0 6px #7ec6ff)" }}>✦</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
