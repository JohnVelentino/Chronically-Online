import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import { HEROES } from "../data/cards.js";
import { getSFX } from "../audio/sfx.js";

const HERO_PORTRAIT_STORAGE_PREFIX = "heroPortrait:";
function portraitFor(hero) {
  if (!hero?.id) return hero?.portrait || null;
  try {
    const saved = localStorage.getItem(`${HERO_PORTRAIT_STORAGE_PREFIX}${hero.id}`);
    return saved || hero.portrait || null;
  } catch {
    return hero?.portrait || null;
  }
}

// 3-stage: spin roulette -> lock on AI -> VS splash -> onDone
export default function VsRouletteScreen({ playerHero, aiHero, onDone }) {
  const [stage, setStage] = useState("spin"); // spin | lock | vs
  const [idx, setIdx] = useState(0);
  const tickRef = useRef(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Build the spin order: shuffled heroes ending on aiHero
  const order = useMemo(() => {
    const rest = HEROES.filter(h => h.id !== aiHero?.id);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const loops = 2;
    const seq = [];
    for (let l = 0; l < loops; l++) seq.push(...rest);
    seq.push(...rest);
    if (aiHero) seq.push(aiHero);
    return seq;
  }, [aiHero]);

  // Ease-out roulette ticker
  useEffect(() => {
    if (stage !== "spin") return;
    let cancelled = false;
    let i = 0;
    const total = order.length;
    const startDelay = 60;
    const endDelay = 280;
    function tick() {
      if (cancelled) return;
      setIdx(i);
      try { getSFX().plick?.(); } catch { /* sfx optional */ }
      i++;
      if (i >= total) {
        setStage("lock");
        setTimeout(() => setStage("vs"), 700);
        setTimeout(() => { try { getSFX().blammm?.(); } catch { /* sfx optional */ } }, 720);
        setTimeout(() => { onDoneRef.current && onDoneRef.current(); }, 2600);
        return;
      }
      // ease-out: delay grows as i approaches end
      const t = i / total;
      const eased = startDelay + (endDelay - startDelay) * Math.pow(t, 2.4);
      tickRef.current = setTimeout(tick, eased);
    }
    tick();
    return () => { cancelled = true; clearTimeout(tickRef.current); };
  }, [stage, order]);

  const rouletteHero = order[Math.min(idx, order.length - 1)] || aiHero;
  const pPortrait = portraitFor(playerHero);
  const aPortrait = portraitFor(aiHero);
  const pColor = playerHero?.themeColor || "#378ADD";
  const aColor = aiHero?.themeColor || "#cc2222";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9200,
      background: "radial-gradient(ellipse at center, rgba(10,18,32,1) 0%, rgba(0,2,8,1) 80%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", fontFamily: "system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes vsStarDrift{0%,100%{opacity:0.3}50%{opacity:1}}
        @keyframes vsSweep{0%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(130%) skewX(-18deg)}}
        @keyframes vsBreathe{0%,100%{filter:drop-shadow(0 0 20px currentColor)}50%{filter:drop-shadow(0 0 40px currentColor)}}
        @keyframes vsClashPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
      `}</style>

      {/* Nebula + diagonal light streaks */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 50% 40% at 25% 45%, ${pColor}33, transparent 70%), radial-gradient(ellipse 50% 40% at 75% 55%, ${aColor}33, transparent 70%)` }} />

      <AnimatePresence mode="wait">
        {stage !== "vs" && (
          <motion.div
            key="spin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}
          >
            <div style={{ fontSize: 11, letterSpacing: 6, color: "#85B7EB", fontWeight: 900, textTransform: "uppercase", opacity: 0.9 }}>
              Drawing Opponent
            </div>
            <div style={{
              position: "relative",
              width: 340, height: 340, borderRadius: 24,
              background: `radial-gradient(circle, ${rouletteHero?.themeColor || "#378ADD"}22 0%, #040810 70%)`,
              border: `2px solid ${rouletteHero?.themeColor || "#378ADD"}`,
              boxShadow: `0 0 60px ${rouletteHero?.themeColor || "#378ADD"}77, 0 0 120px ${rouletteHero?.themeColor || "#378ADD"}44, inset 0 0 40px rgba(0,0,0,0.6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              transition: "border-color 0.12s, box-shadow 0.25s",
            }}>
              {/* corner brackets */}
              {[
                { top: 10, left: 10, bt: 1, bl: 1 },
                { top: 10, right: 10, bt: 1, br: 1 },
                { bottom: 10, left: 10, bb: 1, bl: 1 },
                { bottom: 10, right: 10, bb: 1, br: 1 },
              ].map((s, i) => (
                <div key={i} style={{
                  position: "absolute", ...s, width: 22, height: 22,
                  borderTop: s.bt ? `2px solid ${rouletteHero?.themeColor || "#378ADD"}` : "none",
                  borderLeft: s.bl ? `2px solid ${rouletteHero?.themeColor || "#378ADD"}` : "none",
                  borderRight: s.br ? `2px solid ${rouletteHero?.themeColor || "#378ADD"}` : "none",
                  borderBottom: s.bb ? `2px solid ${rouletteHero?.themeColor || "#378ADD"}` : "none",
                }} />
              ))}

              <AnimatePresence mode="popLayout">
                <motion.div
                  key={rouletteHero?.id + "-" + idx}
                  initial={{ opacity: 0, rotateY: -60, scale: 0.8 }}
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  exit={{ opacity: 0, rotateY: 60, scale: 0.8 }}
                  transition={{ duration: stage === "lock" ? 0.35 : 0.12 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
                >
                  {portraitFor(rouletteHero) ? (
                    <img src={portraitFor(rouletteHero)} alt={rouletteHero?.name}
                      style={{ width: 220, height: 220, borderRadius: 18, objectFit: "cover", boxShadow: `0 0 40px ${rouletteHero?.themeColor || "#378ADD"}`, filter: stage === "lock" ? "drop-shadow(0 0 24px currentColor)" : "none", color: rouletteHero?.themeColor || "#378ADD" }} />
                  ) : (
                    <div style={{ fontSize: 180 }}>{rouletteHero?.emoji || "❓"}</div>
                  )}
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 2, textShadow: `0 0 20px ${rouletteHero?.themeColor || "#378ADD"}` }}>
                    {rouletteHero?.name || "???"}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 3, color: rouletteHero?.themeColor || "#378ADD", textTransform: "uppercase" }}>
                    {rouletteHero?.class || ""}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* sweep */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `linear-gradient(100deg, transparent 40%, ${rouletteHero?.themeColor || "#378ADD"}44 50%, transparent 60%)`,
                animation: "vsSweep 1.8s linear infinite",
                mixBlendMode: "screen",
              }} />
            </div>
            <div style={{ fontSize: 14, color: "#6a8ab0", letterSpacing: 2, textTransform: "uppercase" }}>
              {stage === "lock" ? "Opponent Locked" : "Rolling..."}
            </div>
          </motion.div>
        )}

        {stage === "vs" && (
          <motion.div
            key="vs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: "absolute", inset: 0 }}
          >
            {/* Player side — top-center above VS */}
            <motion.div
              initial={{ y: -600, opacity: 0, rotate: -4 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.9, 0.35, 1] }}
              style={{
                position: "absolute", top: "4%", left: "50%", transform: "translateX(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                color: pColor,
              }}
            >
              <div style={{
                width: 220, height: 220, borderRadius: 22, overflow: "hidden",
                border: `3px solid ${pColor}`,
                boxShadow: `0 0 60px ${pColor}, 0 0 160px ${pColor}55, inset 0 0 30px rgba(0,0,0,0.7)`,
                background: `radial-gradient(circle, ${pColor}33, #020608)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "vsBreathe 2.4s ease-in-out infinite",
              }}>
                {pPortrait ? <img src={pPortrait} alt={playerHero?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: 160 }}>{playerHero?.emoji || "🧙"}</div>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 4, color: "#85B7EB", textTransform: "uppercase" }}>You</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: 2, textShadow: `0 0 24px ${pColor}` }}>
                {playerHero?.name || "You"}
              </div>
            </motion.div>

            {/* AI side — bottom-center below VS */}
            <motion.div
              initial={{ y: 600, opacity: 0, rotate: 4 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.9, 0.35, 1] }}
              style={{
                position: "absolute", bottom: "4%", left: "50%", transform: "translateX(-50%)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                color: aColor,
              }}
            >
              <div style={{
                width: 220, height: 220, borderRadius: 22, overflow: "hidden",
                border: `3px solid ${aColor}`,
                boxShadow: `0 0 60px ${aColor}, 0 0 160px ${aColor}55, inset 0 0 30px rgba(0,0,0,0.7)`,
                background: `radial-gradient(circle, ${aColor}33, #020608)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "vsBreathe 2.4s ease-in-out infinite",
              }}>
                {aPortrait ? <img src={aPortrait} alt={aiHero?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: 160 }}>{aiHero?.emoji || "🤖"}</div>}
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 4, color: "#ff9a9a", textTransform: "uppercase" }}>Opponent</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: 2, textShadow: `0 0 24px ${aColor}` }}>
                {aiHero?.name || "Enemy"}
              </div>
            </motion.div>

            {/* VS mark */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.45, delay: 0.25, type: "spring", stiffness: 240, damping: 14 }}
              style={{
                position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 5,
                fontSize: 160, fontWeight: 900,
                letterSpacing: 2,
                fontFamily: "'Cinzel','Trajan Pro', serif",
                color: "#fff",
                textShadow: `0 0 30px #EF9F27, 0 0 80px ${pColor}, 0 0 120px ${aColor}`,
                animation: "vsClashPulse 1.6s ease-in-out infinite",
                WebkitTextStroke: "2px rgba(255,255,255,0.6)",
              }}
            >
              VS
            </motion.div>

            {/* Clash streak */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              style={{
                position: "absolute", left: 0, right: 0, top: "50%", height: 3,
                background: `linear-gradient(90deg, transparent, ${pColor}, #fff, ${aColor}, transparent)`,
                transform: "translateY(-50%)",
                boxShadow: `0 0 24px ${pColor}, 0 0 24px ${aColor}`,
                pointerEvents: "none",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
