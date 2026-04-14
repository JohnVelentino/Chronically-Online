import { useState } from "react";

export default function CardBack({ size = 92, imagePath = "" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!imagePath && !imgFailed;

  const w  = size;
  const h  = Math.round(size * 1.45);
  const br = Math.round(size * 0.09);

  return (
    <div style={{
      width:        w,
      height:       h,
      borderRadius: br,
      background:   "linear-gradient(160deg, #0e1526 0%, #060c1c 55%, #0a0f1e 100%)",
      border:       "none",
      boxShadow:    "0 0 0 2px #c88800, 0 0 0 4px rgba(0,0,0,0.80), 0 0 14px rgba(200,136,0,0.45), 0 12px 30px rgba(0,0,0,0.85)",
      position:     "relative",
      overflow:     "hidden",
    }}>
      {/* Supplied card-back image */}
      {showImage && (
        <img
          src={imagePath}
          alt="Card Back"
          onError={() => setImgFailed(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: br }}
        />
      )}

      {!showImage && (
        <>
          {/* Radial glow center */}
          <div style={{
            position:  "absolute",
            inset:     0,
            background:"radial-gradient(ellipse at 50% 44%, rgba(200,136,0,0.14) 0%, transparent 68%)",
          }}/>

          {/* Outer decorative border inset */}
          <div style={{
            position:     "absolute",
            inset:        Math.round(size * 0.055),
            borderRadius: Math.round(br * 0.75),
            border:       "1px solid rgba(200,136,0,0.35)",
            boxShadow:    "inset 0 0 8px rgba(200,136,0,0.12)",
          }}/>

          {/* Inner decorative border */}
          <div style={{
            position:     "absolute",
            inset:        Math.round(size * 0.105),
            borderRadius: Math.round(br * 0.55),
            border:       "1px solid rgba(200,136,0,0.20)",
          }}/>

          {/* Corner diamonds – 4 corners */}
          {[
            { top: Math.round(size * 0.045), left: Math.round(size * 0.045) },
            { top: Math.round(size * 0.045), right: Math.round(size * 0.045) },
            { bottom: Math.round(size * 0.045), left: Math.round(size * 0.045) },
            { bottom: Math.round(size * 0.045), right: Math.round(size * 0.045) },
          ].map((pos, i) => (
            <div key={i} style={{
              position:  "absolute",
              ...pos,
              width:     Math.round(size * 0.065),
              height:    Math.round(size * 0.065),
              background:"#c88800",
              transform: "rotate(45deg)",
              boxShadow: "0 0 5px rgba(200,136,0,0.60)",
              opacity:   0.85,
            }}/>
          ))}

          {/* Central emblem */}
          <div style={{
            position:      "absolute",
            top:           "50%",
            left:          "50%",
            transform:     "translate(-50%, -50%)",
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            gap:           Math.round(size * 0.024),
          }}>
            {/* Top horizontal rule */}
            <div style={{
              width:      Math.round(size * 0.38),
              height:     1,
              background: "linear-gradient(90deg, transparent, #c88800, transparent)",
            }}/>
            {/* Main symbol */}
            <div style={{
              fontSize:   Math.round(size * 0.32),
              lineHeight: 1,
              filter:     "drop-shadow(0 0 6px rgba(200,136,0,0.70))",
            }}>
              ✦
            </div>
            {/* Bottom horizontal rule */}
            <div style={{
              width:      Math.round(size * 0.38),
              height:     1,
              background: "linear-gradient(90deg, transparent, #c88800, transparent)",
            }}/>
          </div>

          {/* Subtle diagonal grain texture overlay */}
          <div style={{
            position:        "absolute",
            inset:           0,
            borderRadius:    br,
            backgroundImage: "repeating-linear-gradient(135deg, transparent 0px, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
            pointerEvents:   "none",
          }}/>
        </>
      )}
    </div>
  );
}
