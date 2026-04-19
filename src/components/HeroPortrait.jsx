// 1.7x bigger portrait (88→150px), "AP" → "Aura Points"
import { useState, useEffect, useRef } from "react";

export default function HeroPortrait({ name, hp, maxHp, emoji, portrait, isAI, isTarget, onClick, mana, maxMana, armor = 0, ultimateInfo = null, onUltimateClick, heroRef, showName = true, size = 160 }) {
  const [flashing, setFlashing] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const prevHp = useRef(hp);
  useEffect(() => {
    if (hp < prevHp.current) { setFlashing(true); setTimeout(() => setFlashing(false), 500); }
    prevHp.current = hp;
  }, [hp]);
  useEffect(() => setPortraitFailed(false), [portrait]);
  const pct = Math.max(0, hp / maxHp);
  const isLow = hp <= 10;
  const isTrumpUltimate = (ultimateInfo?.name || "").toLowerCase().includes("japan");
  const isElonUltimate = (ultimateInfo?.name || "").toLowerCase().includes("future tech");
  const unlockedCharges = ultimateInfo?.unlockedCharges || 0;
  const usedCharges = ultimateInfo?.usedCount || 0;
  const availableCharges = Math.max(0, unlockedCharges - usedCharges);
  const ultimateStateLabel = usedCharges >= 2
    ? "Spent"
    : unlockedCharges === 0
      ? "Locked"
      : availableCharges === 2
        ? "2 Charges"
        : availableCharges === 1
          ? "1 Charge"
          : "Spent";
  const ultButtonStyle = isTrumpUltimate
    ? {
        bg: ultimateInfo?.canUse ? "linear-gradient(145deg,#7f1010,#d12b2b)" : "#2a171a",
        border: ultimateInfo?.canUse ? "#ff7171" : "#5c3940",
        glow: ultimateInfo?.canUse ? "0 0 18px rgba(226,75,74,0.75), 0 0 34px rgba(165,35,35,0.55)" : "none",
        text: ultimateInfo?.canUse ? "#ffe6e6" : "#9d7a84",
      }
    : isElonUltimate
      ? {
          bg: ultimateInfo?.canUse ? "linear-gradient(145deg,#0e3a6f,#1c7cd6)" : "#152132",
          border: ultimateInfo?.canUse ? "#7ec6ff" : "#3a4f69",
          glow: ultimateInfo?.canUse ? "0 0 18px rgba(85,182,255,0.8), 0 0 34px rgba(42,120,201,0.55)" : "none",
          text: ultimateInfo?.canUse ? "#e6f5ff" : "#7d94ae",
        }
      : {
          bg: ultimateInfo?.canUse ? "linear-gradient(145deg,#6f3e9f,#9b59dd)" : "#151d2a",
          border: ultimateInfo?.canUse ? "#cda2ff" : "#36485f",
          glow: ultimateInfo?.canUse ? "0 0 16px rgba(155,89,221,0.65)" : "none",
          text: ultimateInfo?.canUse ? "#fff" : "#6f89a7",
        };

  return (
    <div ref={heroRef} onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: isTarget ? "pointer" : "default" }}>
      {!isAI && ultimateInfo && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 1 }}>
          <div style={{ fontSize: 9, color: "#93b3d2", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 900 }}>
            {ultimateInfo.name} · {ultimateStateLabel}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1].map(i => {
              const used = i < usedCharges;
              const unlocked = i < unlockedCharges;
              return (
                <div
                  key={i}
                  title={used ? "Used" : unlocked ? "Unlocked" : "Locked"}
                  style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: used ? "#2f3a47" : unlocked ? "#f7bf35" : "#0f1b2d",
                    border: "1px solid " + (used ? "#607588" : unlocked ? "#ffd575" : "#35506f"),
                    boxShadow: unlocked && !used ? "0 0 10px rgba(247,191,53,0.8)" : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: size, height: size, borderRadius: 26,
        background: isAI ? "linear-gradient(160deg,#1a0606,#280e0e)" : "linear-gradient(160deg,#061a06,#0e2810)",
        border: isTarget ? "3px solid #5DCAA5" : isLow ? "3px solid #E24B4A" : "3px solid " + (isAI ? "#cc4444" : "#44cc88"),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: isTarget ? "0 0 36px rgba(93,202,165,0.85)" : isLow ? "0 0 32px rgba(226,75,74,0.8)" : "0 0 24px " + (isAI ? "rgba(200,60,60,0.4)" : "rgba(60,200,100,0.4)"),
        transition: "box-shadow 0.3s, transform 0.15s",
        transform: flashing ? "scale(1.08)" : isTarget ? "scale(1.04)" : "scale(1)",
        userSelect: "none", position: "relative", overflow: "hidden",
        willChange: "transform",
      }}>
        {flashing && <div style={{ position: "absolute", inset: 0, background: "rgba(226,75,74,0.4)", borderRadius: 24, animation: "flashFade 0.5s ease-out" }} />}
        {portrait && !portraitFailed ? (
          <img
            src={portrait}
            alt={name}
            onError={() => setPortraitFailed(true)}
            style={{ width: 120, height: 92, objectFit: "cover", borderRadius: 12, marginBottom: 2 }}
          />
        ) : (
          <div style={{ fontSize: 68 }}>{emoji}</div>
        )}
        <div style={{ fontSize: 30, fontWeight: 900, color: isLow ? "#E24B4A" : (isAI ? "#ff8888" : "#44ff99"), lineHeight: 1 }}>{hp}</div>
      </div>
      {!isAI && ultimateInfo && (
        <div style={{ position: "relative", marginLeft: 8 }}>
          {ultimateInfo.canUse && (
            <div
              aria-hidden
              style={{
                position: "absolute", inset: -10, borderRadius: 22,
                background: `radial-gradient(circle, ${ultButtonStyle.border}55 0%, transparent 70%)`,
                animation: "ultimatePulse 1.8s ease-in-out infinite",
                pointerEvents: "none", zIndex: 0,
              }}
            />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onUltimateClick?.(); }}
            disabled={!ultimateInfo.canUse}
            style={{
              position: "relative", zIndex: 1,
              width: 128,
              minHeight: 92,
              background: ultButtonStyle.bg,
              border: `2px solid ${ultButtonStyle.border}`,
              color: ultButtonStyle.text,
              borderRadius: 16,
              padding: "10px 9px",
              fontSize: 12,
              fontWeight: 900,
              cursor: ultimateInfo.canUse ? "pointer" : "not-allowed",
              letterSpacing: 0.6,
              textTransform: "uppercase",
              boxShadow: ultimateInfo.canUse
                ? `${ultButtonStyle.glow}, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 6px rgba(0,0,0,0.35)`
                : "inset 0 1px 0 rgba(255,255,255,0.04)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 5,
              transition: "transform 0.15s, box-shadow 0.2s",
              overflow: "hidden",
            }}
          >
            {ultimateInfo.canUse && (
              <span
                aria-hidden
                style={{
                  position: "absolute", top: 0, left: "-60%", width: "60%", height: "100%",
                  background: "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                  animation: "ultimateShimmer 2.6s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}
            <span style={{ position: "relative", fontSize: 18, lineHeight: 1, filter: ultimateInfo.canUse ? "drop-shadow(0 0 6px rgba(255,255,255,0.55))" : "none" }}>★</span>
            <span style={{ position: "relative", fontSize: 10, lineHeight: 1.1, textAlign: "center" }}>{ultimateInfo.buttonLabel}</span>
            <span style={{ position: "relative", fontSize: 9, opacity: 0.9 }}>{availableCharges}/2</span>
          </button>
        </div>
      )}
      </div>
      {showName && <div style={{ fontSize: 11, color: "#445", fontWeight: 700 }}>{name}</div>}
      {!isAI && Number.isFinite(mana) && Number.isFinite(maxMana) && (
        <div style={{
          background: "linear-gradient(135deg,#1a3a6a,#0d2244)",
          border: "1px solid #378ADD",
          borderRadius: 8, padding: "4px 12px",
          fontSize: 12, fontWeight: 900, color: "#aad4ff",
          boxShadow: "0 0 10px rgba(55,138,221,0.5)",
          letterSpacing: 0.5, whiteSpace: "nowrap",
        }}>
          {mana}/{maxMana} Aura Points
        </div>
      )}
      {!isAI && armor > 0 && (
        <div style={{
          background: "linear-gradient(135deg,#3e4f67,#24344b)",
          border: "1px solid #6f8cad",
          borderRadius: 8, padding: "3px 10px",
          fontSize: 11, fontWeight: 900, color: "#cfe4ff",
          letterSpacing: 0.4, whiteSpace: "nowrap",
        }}>
          Armor: {armor}
        </div>
      )}
    </div>
  );
}
