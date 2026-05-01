/* eslint-disable react-hooks/purity */
import { useMemo } from "react";

/**
 * Cinematic deep-space backdrop.
 *  - 3-layer parallax starfield (twinkle + drift)
 *  - Drifting nebula clouds
 *  - Slow shooting stars
 *  - Soft vignette
 *
 * Cheap: pure CSS animations on lightweight DOM nodes (no canvas).
 * Stable: stars seeded once via useMemo, won't reshuffle on rerender.
 */
export default function CosmicBackground({
  density = 170,
  shootingStars = 2,
  accentA = "rgba(80,40,160,0.18)",
  accentB = "rgba(30,100,200,0.15)",
  accentC = "rgba(150,60,180,0.12)",
  vignette = 0.55,
}) {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < density; i++) {
      const layer = i < density * 0.55 ? "far" : i < density * 0.85 ? "mid" : "near";
      const size =
        layer === "far"
          ? 0.8 + Math.random() * 0.6
          : layer === "mid"
          ? 1.3 + Math.random() * 0.7
          : 2 + Math.random() * 0.8;
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        layer,
        twinkleDelay: Math.random() * 6,
        twinkleDur: 2.4 + Math.random() * 4.2,
        driftDur: 60 + Math.random() * 80,
      });
    }
    return arr;
  }, [density]);

  const shooters = useMemo(() => {
    const arr = [];
    // Each shooter cycles on its own long loop so they appear rare and one at a time.
    // Loop = visible burst (dur) + dead air (gap). Big random offsets stagger the channels.
    for (let i = 0; i < shootingStars; i++) {
      const dur = 2.0 + Math.random() * 1.2;       // 2.0–3.2s flight
      const gap = 22 + Math.random() * 28;          // 22–50s of dark sky between bursts
      arr.push({
        id: i,
        top: -8 + Math.random() * 28,               // start near the top of the sky
        left: 10 + Math.random() * 70,
        delay: 6 + Math.random() * 28 + i * 14,     // stagger channels
        dur,
        gap,
        cycle: dur + gap,
        // Diagonally FALLING — angle ~30–55° below horizontal so it looks like a real shooting star, not a sweep
        angle: 30 + Math.random() * 25,
        len: 220 + Math.random() * 180,             // long, graceful tail
        size: 3 + Math.random() * 1.6,              // head size
      });
    }
    return arr;
  }, [shootingStars]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes cosmicTwinkle{0%,100%{opacity:0.25;transform:scale(1)}50%{opacity:1;transform:scale(1.18)}}
        @keyframes cosmicNebula{0%,100%{opacity:0.42;transform:scale(1) rotate(0deg)}50%{opacity:0.62;transform:scale(1.05) rotate(2deg)}}
        @keyframes cosmicDrift{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(0,-40px,0)}}
        /* Falling star: visible burst lives entirely in the first ~10% of the
           cycle, the rest of the loop is dead sky. Per-shooter --visible (0..1)
           matches the keyframe's own visibility window so head + trail stay
           in sync regardless of cycle length. */
        @keyframes cosmicFall{
          0%   {opacity:0;transform:translate3d(0,0,0) scale(0.7);}
          1%   {opacity:0.0;}
          3%   {opacity:1;transform:translate3d(calc(var(--dx) * 0.05), calc(var(--dy) * 0.05),0) scale(1);}
          7%   {opacity:1;}
          9%   {opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(0.9);}
          100% {opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(0.9);}
        }
        @keyframes cosmicTrail{
          0%,1%   {opacity:0;transform:scaleX(0.1);}
          3%      {opacity:0.85;transform:scaleX(0.55);}
          7%      {opacity:1;transform:scaleX(1);}
          9%      {opacity:0;transform:scaleX(1);}
          100%    {opacity:0;transform:scaleX(1);}
        }
        @keyframes cosmicAuroraA{0%,100%{transform:translate3d(-12%,-6%,0) scale(1);opacity:0.42}50%{transform:translate3d(8%,2%,0) scale(1.12);opacity:0.58}}
        @keyframes cosmicAuroraB{0%,100%{transform:translate3d(10%,8%,0) scale(1);opacity:0.32}50%{transform:translate3d(-6%,-4%,0) scale(1.15);opacity:0.5}}
        @keyframes cosmicAuroraC{0%,100%{transform:translate3d(-4%,12%,0) scale(1);opacity:0.28}50%{transform:translate3d(6%,-2%,0) scale(1.1);opacity:0.46}}
      `}</style>

      {/* Deep gradient base */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 120% 70% at 50% 20%, rgba(30,60,120,0.32), transparent 60%), radial-gradient(ellipse 80% 50% at 80% 90%, rgba(90,50,140,0.22), transparent 60%), radial-gradient(ellipse 80% 50% at 15% 85%, rgba(25,90,160,0.18), transparent 60%), linear-gradient(180deg, #02050d 0%, #000208 100%)",
        }}
      />

      {/* Base nebula haze — three radial blobs that bloom slowly */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 42% 32% at 25% 30%, ${accentA}, transparent 70%), radial-gradient(ellipse 36% 26% at 75% 60%, ${accentB}, transparent 70%), radial-gradient(ellipse 32% 22% at 50% 80%, ${accentC}, transparent 70%)`,
          animation: "cosmicNebula 22s ease-in-out infinite",
        }}
      />

      {/* Aurora wisps — three independently drifting soft glow blobs.
          Each has its own keyframe + duration so the screen never falls
          into a visible repeating pattern. No linear sweeps, no banding. */}
      <div
        style={{
          position: "absolute",
          left: "-10%",
          top: "-8%",
          width: "70%",
          height: "60%",
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${accentA}, transparent 70%)`,
          filter: "blur(40px)",
          mixBlendMode: "screen",
          animation: "cosmicAuroraA 38s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-8%",
          top: "20%",
          width: "60%",
          height: "55%",
          background: `radial-gradient(ellipse 55% 60% at 50% 50%, ${accentB}, transparent 72%)`,
          filter: "blur(48px)",
          mixBlendMode: "screen",
          animation: "cosmicAuroraB 46s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "20%",
          bottom: "-10%",
          width: "65%",
          height: "55%",
          background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${accentC}, transparent 72%)`,
          filter: "blur(44px)",
          mixBlendMode: "screen",
          animation: "cosmicAuroraC 52s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Star layer with very slow drift */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          animation: "cosmicDrift 90s linear infinite",
        }}
      >
        {stars.map((s) => (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background:
                s.layer === "near" ? "#fff" : s.layer === "mid" ? "#eaf2ff" : "#cfd8ec",
              boxShadow:
                s.layer === "near"
                  ? `0 0 ${s.size * 4}px rgba(255,255,255,0.95), 0 0 ${s.size * 9}px rgba(140,180,255,0.55)`
                  : s.layer === "mid"
                  ? `0 0 ${s.size * 2.5}px rgba(220,235,255,0.75)`
                  : "none",
              animation: `cosmicTwinkle ${s.twinkleDur}s ease-in-out ${s.twinkleDelay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Falling shooting stars — rare, diagonal, with glowing head + tapered tail.
          Whole element travels via cosmicFall (head + tail move together),
          while the trail also independently grows on a synced cycle. */}
      {shooters.map((sh) => {
        // wrapper is rotated by sh.angle, so the star travels along +x in its
        // own frame — total flight = sh.len; visual diagonal comes from rotate.
        return (
          <div
            key={sh.id}
            style={{
              position: "absolute",
              top: `${sh.top}%`,
              left: `${sh.left}%`,
              width: 0,
              height: 0,
              transform: `rotate(${sh.angle}deg)`,
              transformOrigin: "0 50%",
              "--dx": `${sh.len}px`,
              "--dy": `0px`,
              // We rotate the wrapper itself, so the star travels along +x in its own frame.
              animation: `cosmicFall ${sh.cycle}s linear ${sh.delay}s infinite`,
              opacity: 0,
              willChange: "transform, opacity",
              pointerEvents: "none",
            }}
          >
            {/* Tapered tail — grows from the head's wake */}
            <div
              style={{
                position: "absolute",
                top: -1,
                left: -sh.len,
                width: sh.len,
                height: 2,
                transformOrigin: "100% 50%",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(170,205,255,0.35) 45%, rgba(220,235,255,0.85) 88%, #ffffff 100%)",
                borderRadius: 999,
                filter: "blur(0.5px) drop-shadow(0 0 8px rgba(180,215,255,0.9))",
                animation: `cosmicTrail ${sh.cycle}s linear ${sh.delay}s infinite`,
              }}
            />
            {/* Glowing head — bright nucleus + soft halo */}
            <div
              style={{
                position: "absolute",
                top: -sh.size,
                left: -sh.size,
                width: sh.size * 2,
                height: sh.size * 2,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, #ffffff 0%, rgba(220,235,255,0.95) 35%, rgba(150,200,255,0.55) 65%, transparent 80%)",
                boxShadow:
                  "0 0 14px rgba(255,255,255,0.95), 0 0 30px rgba(180,215,255,0.8), 0 0 56px rgba(120,170,255,0.45)",
              }}
            />
            {/* Subtle bloom flare around head */}
            <div
              style={{
                position: "absolute",
                top: -sh.size * 4,
                left: -sh.size * 4,
                width: sh.size * 8,
                height: sh.size * 8,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(220,235,255,0.55) 0%, rgba(180,215,255,0.15) 35%, transparent 70%)",
                filter: "blur(2px)",
              }}
            />
          </div>
        );
      })}

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
    </div>
  );
}
