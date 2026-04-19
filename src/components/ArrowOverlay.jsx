import { useState, useEffect } from "react";

export default function ArrowOverlay({ fromRef, toRef, cursor, color }) {
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    let rafId;
    let active = true;
    function measure() {
      if (!active) return;
      if (!fromRef?.current) { rafId = requestAnimationFrame(measure); return; }
      // SVG is position:fixed — use viewport coords, no scroll offset.
      const from = fromRef.current.getBoundingClientRect();
      const toRect = toRef?.current ? toRef.current.getBoundingClientRect() : null;
      const x1 = from.left + from.width / 2;
      const y1 = from.top + from.height / 2;
      let x2 = x1, y2 = y1;
      if (toRect) {
        x2 = toRect.left + toRect.width / 2;
        y2 = toRect.top + toRect.height / 2;
      } else if (cursor) {
        x2 = cursor.x;
        y2 = cursor.y;
      }
      setCoords({ x1, y1, x2, y2 });
      rafId = requestAnimationFrame(measure);
    }
    rafId = requestAnimationFrame(measure);
    return () => { active = false; cancelAnimationFrame(rafId); };
  }, [fromRef, toRef, cursor]);
  if (!coords) return null;
  const { x1, y1, x2, y2 } = coords;
  const dx = x2 - x1; const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len; const ny = dy / len;
  const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
  const cx = mx - ny * 60; const cy = my + nx * 60;
  const arrowHead = `${x2 - nx * 14 + ny * 8},${y2 - ny * 14 - nx * 8} ${x2},${y2} ${x2 - nx * 14 - ny * 8},${y2 - ny * 14 + nx * 8}`;
  return (
    <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 999 }}>
      <defs>
        <marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={color} />
        </marker>
        <filter id="glow-arrow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke={color} strokeWidth="3" strokeDasharray="8 4" filter="url(#glow-arrow)" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.5s" repeatCount="indefinite" />
      </path>
      <polygon points={arrowHead} fill={color} filter="url(#glow-arrow)" opacity="0.95" />
      <circle cx={x1} cy={y1} r="7" fill={color} opacity="0.7" />
    </svg>
  );
}
