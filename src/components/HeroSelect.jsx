import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HEROES, CLASS_CARDS, DEFAULT_CARDS, RC, getHeroDeckIds } from "../data/cards.js";
import { getUltimateMeta } from "../data/ultimates.js";
import { getSFX } from "../audio/sfx.js";

// Small card preview used only inside HeroSelect
function MiniCard({ card }) {
  const rc = RC[card.rarity || "common"];
  const isClass = !!card.class;
  return (
    <div style={{
      width: 96, flexShrink: 0,
      background: rc.bg,
      border: "1.5px solid " + (isClass ? rc.border : "rgba(255,255,255,0.12)"),
      borderRadius: 10, padding: "6px 6px 5px",
      boxSizing: "border-box", position: "relative",
      boxShadow: isClass ? "0 0 10px " + rc.glow : "0 2px 8px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Rarity stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent," + rc.border + ",transparent)", borderRadius: "8px 8px 0 0" }} />

      {/* Cost */}
      <div style={{
        position: "absolute", top: 5, left: 5, width: 18, height: 18, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(255,255,255,0.25),rgba(7,34,82,0.95))",
        border: "1px solid " + rc.border,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color: "#fff", zIndex: 2,
      }}>{card.cost}</div>

      {/* Art */}
      <div style={{ textAlign: "center", fontSize: 26, marginTop: 8, marginBottom: 2, filter: "drop-shadow(0 2px 6px " + rc.glow + ")" }}>
        {card.emoji || "🃏"}
      </div>

      {/* Name */}
      <div style={{ fontSize: 8, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.2, marginBottom: 2 }}>
        {card.name}
      </div>

      {/* Desc */}
      <div style={{ fontSize: 7, color: "#9aaecc", textAlign: "center", lineHeight: 1.3, flexGrow: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {card.desc}
      </div>

      {/* Stats */}
      {card.type === "minion" && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <div style={{ background: "linear-gradient(135deg,#c03a20,#8a1a0a)", color: "#fff", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 900 }}>{card.atk}</div>
          <div style={{ background: "linear-gradient(135deg,#1b7f4c,#0a5030)", color: "#fff", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 900 }}>{card.hp}</div>
        </div>
      )}
      {card.type === "spell" && (
        <div style={{ textAlign: "center", fontSize: 7, color: rc.label, fontWeight: 900, marginTop: 2 }}>✦ SPELL ✦</div>
      )}

      {/* Class tag */}
      <div style={{
        marginTop: 4,
        textAlign: "center", fontSize: 6.5, fontWeight: 900, letterSpacing: 0.6,
        textTransform: "uppercase", padding: "1px 0",
        color: isClass ? rc.label : "rgba(255,255,255,0.25)",
        borderTop: "1px solid " + (isClass ? rc.border + "66" : "rgba(255,255,255,0.08)"),
      }}>
        {isClass ? card.class : "Neutral"}
      </div>
    </div>
  );
}

export default function HeroSelect({ onSelect }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [heroImgFailed, setHeroImgFailed] = useState({});
  // Read per-hero portraits from localStorage (read-only; upload is in Card Forge → DEV tab)
  const [customPortraits] = useState(() => {
    try {
      const loaded = {};
      HEROES.forEach(hero => {
        const saved = localStorage.getItem(`heroPortrait:${hero.id}`);
        if (saved) loaded[hero.id] = saved;
      });
      return loaded;
    } catch { return {}; }
  });

  // Build the card preview list for a hero: all unique card ids in their deck
  function deckPreview(hero) {
    const lib = [...DEFAULT_CARDS, ...CLASS_CARDS];
    const seen = new Set();
    const cards = [];
    for (const id of getHeroDeckIds(hero.id)) {
      if (!seen.has(id)) {
        const c = lib.find(x => x.id === id);
        if (c) cards.push(c);
        seen.add(id);
      }
    }
    // Class cards first, then neutral
    return [
      ...cards.filter(c => c.class),
      ...cards.filter(c => !c.class),
    ];
  }

  function pick(hero) {
    setChosen(hero.id);
    getSFX().blammm();
    const pickedPortrait = customPortraits[hero.id] || hero.portrait || null;
    const pickedHero = pickedPortrait ? { ...hero, portrait: pickedPortrait } : hero;
    // Hold the glow burst a beat before handing off to fade-to-game.
    setTimeout(() => onSelect(pickedHero), 900);
  }

  const classes = [
    {
      id: "usa",
      label: "USA!",
      subtitle: "Loud patriots, black-budget weirdos, and covert nonsense.",
      themeColor: "#cc2222",
      glowColor: "rgba(204,34,34,0.35)",
    },
    {
      id: "tech",
      label: "Tech",
      subtitle: "Rocket chaos, tech flexing, and posting through the apocalypse.",
      themeColor: "#00e6c8",
      glowColor: "rgba(0,230,200,0.35)",
    },
    {
      id: "viral",
      label: "Viral Empire",
      subtitle: "Main-character energy. Top G, 9yo army, and a philanthropy arc.",
      themeColor: "#d4af37",
      glowColor: "rgba(212,175,55,0.4)",
    },
    {
      id: "israel",
      label: "Israel",
      subtitle: "Coalition yap, Iron Dome energy, and classified rizz ops.",
      themeColor: "#3ba8ff",
      glowColor: "rgba(180,220,255,0.5)",
    },
  ];

  const heroClassKey = (hero) => hero.class.toLowerCase().startsWith("usa") ? "usa" : hero.class.toLowerCase();
  const heroesForClass = selectedClass ? HEROES.filter(hero => heroClassKey(hero) === selectedClass) : [];
  const active = hovered || heroesForClass[0] || HEROES[0];
  const activeClass = classes.find(cls => cls.id === selectedClass) || null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      style={{
        minHeight: "100vh", background: "#04080f",
        display: "flex", flexDirection: "column", alignItems: "center",
        fontFamily: "system-ui, sans-serif", color: "#fff",
        padding: "12px 24px 24px", boxSizing: "border-box",
        position: "relative", overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes ultShimmer{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
        @keyframes ultBreathe{0%,100%{filter:drop-shadow(0 0 10px currentColor)}50%{filter:drop-shadow(0 0 22px currentColor)}}
        @keyframes heroChosenGlow{0%{box-shadow:0 0 0 0 currentColor,0 0 40px currentColor}70%{box-shadow:0 0 0 60px rgba(0,0,0,0),0 0 120px currentColor}100%{box-shadow:0 0 0 0 rgba(0,0,0,0),0 0 0 currentColor}}
        @keyframes heroChosenRing{0%{transform:scale(0.6);opacity:0.9}100%{transform:scale(2.4);opacity:0}}
        @keyframes titleDrop{0%{opacity:0;transform:translateY(-18px);letter-spacing:10px}100%{opacity:1;transform:translateY(0);letter-spacing:6px}}
        @keyframes titleGlowPulse{0%,100%{text-shadow:0 0 40px rgba(55,138,221,0.5)}50%{text-shadow:0 0 60px rgba(55,138,221,0.9),0 0 100px rgba(127,119,221,0.5)}}
      `}</style>

      {/* Background glow matching hovered hero */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: selectedClass && !hovered && activeClass
          ? `radial-gradient(ellipse 60% 45% at 50% 0%, ${activeClass.glowColor}, transparent 70%)`
          : hovered
          ? `radial-gradient(ellipse 60% 45% at 50% 0%, ${hovered.glowColor}, transparent 70%)`
          : "radial-gradient(ellipse 60% 45% at 50% 0%, rgba(55,138,221,0.15), transparent 70%)",
        transition: "background 0.5s",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1100 }}>
        {/* Title — big "Choose Your Class / Hero" drops in on mount */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: "#EF9F27", fontWeight: 900, letterSpacing: 6, textTransform: "uppercase", marginBottom: 8 }}>
            Chronically Online
          </div>
          <motion.div
            key={selectedClass ? "hero-title" : "class-title"}
            initial={{ opacity: 0, y: -24, letterSpacing: "14px" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "3px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 44, fontWeight: 900, lineHeight: 1,
              color: "#fff",
              textShadow: "0 0 40px rgba(55,138,221,0.6), 0 0 90px rgba(127,119,221,0.35)",
              animation: "titleGlowPulse 3.2s ease-in-out infinite",
              textTransform: "uppercase",
            }}
          >
            {selectedClass ? "Choose Your Hero" : "Choose Your Class"}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ fontSize: 12, color: "#6a8ab0", marginTop: 6, letterSpacing: 1, fontStyle: "italic" }}
          >
            {selectedClass ? "Pick your fighter. This shapes your whole run." : "Four factions. One main character arc."}
          </motion.div>
        </div>

        {!selectedClass && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 240px)", justifyContent: "center", columnGap: 120, rowGap: 20, marginBottom: 24 }}>
            {classes.map(cls => (
              <motion.div
                key={cls.id}
                onMouseEnter={() => getSFX().plick()}
                onClick={() => { getSFX().buttonClick(); setSelectedClass(cls.id); setHovered(null); setChosen(null); }}
                whileHover={{ y: -8, scale: 1.03 }}
                style={{
                  width: 240, cursor: "pointer",
                  background: `linear-gradient(160deg, ${cls.themeColor}22, #060c18)`,
                  border: "2px solid " + cls.themeColor,
                  borderRadius: 22, padding: "20px 22px 18px",
                  boxShadow: `0 0 34px ${cls.glowColor}, 0 8px 32px rgba(0,0,0,0.55)`,
                  userSelect: "none",
                }}
              >
                <div style={{ display: "inline-block", fontSize: 9, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", padding: "2px 10px", borderRadius: 4, marginBottom: 12, background: cls.themeColor + "33", border: "1px solid " + cls.themeColor + "88", color: cls.themeColor }}>
                  Class
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>{cls.label}</div>
                <div style={{ fontSize: 12, color: "#6a8ab0", lineHeight: 1.6, marginBottom: 18 }}>{cls.subtitle}</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                  {HEROES.filter(hero => heroClassKey(hero) === cls.id).map(hero => (
                    <div key={hero.id} style={{ fontSize: 11, fontWeight: 800, color: "#d9e9ff", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "5px 10px" }}>
                      {hero.name}
                    </div>
                  ))}
                </div>
                <div style={{ background: cls.themeColor, border: "2px solid " + cls.themeColor, borderRadius: 8, padding: "9px 0", textAlign: "center", fontSize: 12, fontWeight: 900, letterSpacing: 1, color: "#fff" }}>
                  SELECT CLASS
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {selectedClass && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <button
                onClick={() => { setSelectedClass(null); setHovered(null); setChosen(null); }}
                style={{ background: "transparent", border: "1px solid #1e3a5a", color: "#6a8ab0", borderRadius: 999, padding: "8px 18px", fontSize: 11, fontWeight: 900, cursor: "pointer", letterSpacing: 0.8, textTransform: "uppercase" }}
              >
                Back to Classes
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 36, flexWrap: "wrap" }}>
              {heroesForClass.map(hero => {
                const isHov = hovered?.id === hero.id;
                const isPicked = chosen === hero.id;
                const ultMeta = getUltimateMeta(hero);
                return (
                  <motion.div
                    key={hero.id}
                    onMouseEnter={() => { setHovered(hero); getSFX().plick(); }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => pick(hero)}
                    whileHover={{ y: -8, scale: 1.03 }}
                    animate={isPicked ? {
                      scale: [1, 1.18, 1.08, 1.04],
                      transition: { duration: 0.85, times: [0, 0.25, 0.55, 1], ease: "easeOut" },
                    } : {}}
                    style={{
                      width: 200, cursor: "pointer",
                      background: isPicked
                        ? `radial-gradient(circle at 50% 40%, ${hero.themeColor}55, #060c18 70%)`
                        : isHov
                        ? `linear-gradient(160deg, ${hero.themeColor}28, #060c18)`
                        : "linear-gradient(160deg,#080e1a,#060c18)",
                      border: "2px solid " + (isPicked ? hero.themeColor : isHov ? hero.themeColor : "#0d1830"),
                      borderRadius: 20, padding: "24px 20px 20px",
                      boxShadow: isPicked
                        ? `0 0 0 3px ${hero.themeColor}, 0 0 80px ${hero.themeColor}, 0 0 160px ${hero.glowColor}, 0 12px 40px rgba(0,0,0,0.8)`
                        : isHov
                        ? `0 0 40px ${hero.glowColor}, 0 8px 32px rgba(0,0,0,0.6)`
                        : "0 4px 20px rgba(0,0,0,0.5)",
                      transition: "border-color 0.25s, background 0.25s, box-shadow 0.35s",
                      userSelect: "none",
                      position: "relative",
                      zIndex: isPicked ? 60 : isHov ? 50 : 1,
                      color: hero.themeColor,
                    }}
                  >
                    {/* Expanding ring burst on pick */}
                    {isPicked && (
                      <>
                        <div style={{
                          position: "absolute", inset: -10, borderRadius: 24,
                          border: `3px solid ${hero.themeColor}`,
                          pointerEvents: "none",
                          animation: "heroChosenRing 0.9s ease-out forwards",
                          color: hero.themeColor,
                        }} />
                        <div style={{
                          position: "absolute", inset: -20, borderRadius: 28,
                          border: `2px solid ${hero.themeColor}`,
                          pointerEvents: "none",
                          animation: "heroChosenRing 0.9s ease-out 0.15s forwards",
                          color: hero.themeColor,
                          opacity: 0.7,
                        }} />
                      </>
                    )}
                    <AnimatePresence>
                      {isHov && (
                        <motion.div
                          initial={{ opacity: 0, x: 18, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 18, scale: 0.9 }}
                          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            position: "absolute",
                            left: "calc(100% + 22px)",
                            top: -6,
                            width: 304,
                            borderRadius: 18,
                            padding: 2,
                            background: `linear-gradient(155deg, ${hero.themeColor} 0%, ${hero.themeColor}66 40%, #0a1220 100%)`,
                            boxShadow: `0 0 0 1px ${hero.themeColor}88, 0 0 46px ${hero.glowColor}, 0 22px 56px rgba(0,0,0,0.8)`,
                            pointerEvents: "none",
                            zIndex: 10,
                            overflow: "hidden",
                          }}
                        >
                          {/* Inner opaque body */}
                          <div style={{
                            position: "relative",
                            borderRadius: 16,
                            background: "linear-gradient(165deg, #0f1a2e 0%, #08111f 55%, #04080f 100%)",
                            padding: "18px 20px 16px",
                            overflow: "hidden",
                          }}>
                            {/* Radial tint */}
                            <div style={{
                              position: "absolute", inset: 0,
                              background: `radial-gradient(ellipse 80% 50% at 30% 0%, ${hero.themeColor}26, transparent 70%)`,
                              pointerEvents: "none",
                            }} />
                            {/* Animated foil sweep */}
                            <div style={{
                              position: "absolute", top: 0, left: 0, width: "60%", height: "100%",
                              background: `linear-gradient(100deg, transparent 30%, ${hero.themeColor}33 48%, ${hero.themeColor}55 50%, ${hero.themeColor}33 52%, transparent 70%)`,
                              mixBlendMode: "screen",
                              animation: "ultShimmer 3.4s ease-in-out infinite",
                              pointerEvents: "none",
                            }} />
                            {/* Corner brackets */}
                            <div style={{ position: "absolute", top: 7, left: 7, width: 14, height: 14, borderTop: `2px solid ${hero.themeColor}`, borderLeft: `2px solid ${hero.themeColor}`, borderTopLeftRadius: 4 }} />
                            <div style={{ position: "absolute", top: 7, right: 7, width: 14, height: 14, borderTop: `2px solid ${hero.themeColor}`, borderRight: `2px solid ${hero.themeColor}`, borderTopRightRadius: 4 }} />
                            <div style={{ position: "absolute", bottom: 7, left: 7, width: 14, height: 14, borderBottom: `2px solid ${hero.themeColor}`, borderLeft: `2px solid ${hero.themeColor}`, borderBottomLeftRadius: 4 }} />
                            <div style={{ position: "absolute", bottom: 7, right: 7, width: 14, height: 14, borderBottom: `2px solid ${hero.themeColor}`, borderRight: `2px solid ${hero.themeColor}`, borderBottomRightRadius: 4 }} />

                            <div style={{ position: "relative", zIndex: 2 }}>
                              {/* Header with dividers */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
                                <div style={{ height: 1, width: 24, background: `linear-gradient(90deg, transparent, ${hero.themeColor})` }} />
                                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2.8, textTransform: "uppercase", color: hero.themeColor, textShadow: `0 0 10px ${hero.themeColor}99` }}>
                                  ⚡ Ultimate ⚡
                                </div>
                                <div style={{ height: 1, width: 24, background: `linear-gradient(90deg, ${hero.themeColor}, transparent)` }} />
                              </div>

                              {/* Icon plaque + name */}
                              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                                <div style={{
                                  width: 58, height: 58, flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 32,
                                  background: `radial-gradient(circle, ${hero.themeColor}55 0%, ${hero.themeColor}15 55%, transparent 100%)`,
                                  border: `1.5px solid ${hero.themeColor}`,
                                  borderRadius: 14,
                                  boxShadow: `0 0 22px ${hero.glowColor}, inset 0 0 18px ${hero.themeColor}44`,
                                  color: hero.themeColor,
                                  animation: "ultBreathe 2.6s ease-in-out infinite",
                                }}>
                                  <span style={{ filter: `drop-shadow(0 0 8px ${hero.themeColor})` }}>{ultMeta.emoji}</span>
                                </div>
                                <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", lineHeight: 1.15, letterSpacing: 0.3, textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>
                                  {ultMeta.name}
                                </div>
                              </div>

                              {/* Description panel */}
                              <div style={{
                                fontSize: 12, color: "#eaf1fb", lineHeight: 1.55,
                                padding: "11px 13px",
                                background: "rgba(0,0,0,0.42)",
                                border: `1px solid ${hero.themeColor}44`,
                                borderRadius: 10,
                                boxShadow: `inset 0 0 14px rgba(0,0,0,0.5)`,
                              }}>
                                {ultMeta.desc}
                              </div>

                              {/* Footer */}
                              <div style={{
                                marginTop: 12, fontSize: 8.5, fontWeight: 900, letterSpacing: 1.8,
                                textTransform: "uppercase", color: hero.themeColor,
                                textAlign: "center",
                                paddingTop: 10,
                                borderTop: `1px dashed ${hero.themeColor}55`,
                              }}>
                                ◆ 2 Charges · Unlocks at 5 &amp; 10 Aura ◆
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div style={{
                      width: 96, height: 96, fontSize: 72, textAlign: "center", margin: "0 auto 14px",
                      filter: isHov ? `drop-shadow(0 0 24px ${hero.themeColor})` : "none",
                      transition: "filter 0.3s",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", zIndex: 2,
                    }}>
                      {(customPortraits[hero.id] || hero.portrait) && !heroImgFailed[hero.id] ? (
                        <img
                          src={customPortraits[hero.id] || hero.portrait}
                          alt={hero.name}
                          onError={() => setHeroImgFailed(prev => ({ ...prev, [hero.id]: true }))}
                          style={{ width: 90, height: 90, objectFit: "cover", objectPosition: "center", borderRadius: 14, display: "block" }}
                        />
                      ) : (
                        <span>{hero.emoji}</span>
                      )}
                    </div>

                    <div style={{
                      display: "inline-block", fontSize: 9, fontWeight: 900,
                      letterSpacing: 1.5, textTransform: "uppercase",
                      padding: "2px 10px", borderRadius: 4, marginBottom: 6,
                      background: hero.themeColor + "33",
                      border: "1px solid " + hero.themeColor + "88",
                      color: hero.themeColor,
                    }}>{hero.class}</div>

                    <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6, lineHeight: 1.1 }}>{hero.name}</div>
                    <div style={{ fontSize: 11, color: "#6a8ab0", lineHeight: 1.5, marginBottom: 18 }}>{hero.bio}</div>

                    <div style={{
                      background: isHov ? hero.themeColor : "transparent",
                      border: "2px solid " + (isHov ? hero.themeColor : "#0d1830"),
                      borderRadius: 8, padding: "8px 0", textAlign: "center",
                      fontSize: 12, fontWeight: 900, letterSpacing: 1,
                      color: isHov ? "#fff" : "#1a3050",
                      transition: "all 0.2s",
                    }}>
                      {isHov ? "SELECT HERO" : "—"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Deck preview for hovered hero */}
        <AnimatePresence mode="wait">
          {selectedClass && hovered && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,transparent," + hovered.themeColor + "44)" }} />
                <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: hovered.themeColor }}>
                  {hovered.name}'s Deck
                </div>
                <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg," + hovered.themeColor + "44,transparent)" }} />
              </div>

              {/* Class cards row */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: hovered.themeColor, marginBottom: 8 }}>
                  {hovered.class} Class Cards
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {deckPreview(hovered).filter(c => c.class).map(c => (
                    <MiniCard key={c.id} card={c} />
                  ))}
                </div>
              </div>

              {/* Neutral cards row */}
              <div>
                <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: "#445", marginBottom: 8 }}>
                  Neutral Cards
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {deckPreview(hovered).filter(c => !c.class).map(c => (
                    <MiniCard key={c.id} card={c} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {selectedClass && !hovered && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: "center", color: "#1a2a3a", fontSize: 13, marginTop: 12 }}
            >
              Hover a hero to preview their deck
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
