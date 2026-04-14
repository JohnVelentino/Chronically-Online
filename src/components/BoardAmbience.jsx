const PARTICLES = [
  ["16%", "14%", 3, 34, 18, 0.0, 0.16],
  ["33%", "8%", 2, 28, 23, 2.1, 0.11],
  ["54%", "12%", 4, 40, 20, 1.2, 0.13],
  ["72%", "9%", 3, 30, 26, 3.3, 0.1],
  ["88%", "15%", 2, 36, 22, 0.8, 0.12],
];

export default function BoardAmbience({ color = "rgba(55,138,221,0.22)", zone = "enemy" }) {
  return (
    <div className={`board-ambient board-ambient--${zone}`} style={{ "--board-zone-glow": color }}>
      <div className="board-ambient__base" />
      <div className="board-ambient__glow" />
      <div className="board-ambient__texture" />
      <div className="board-ambient__depth" />
      <div className="board-ambient__vignette" />
      <div className="board-ambient__haze" />

      {PARTICLES.map(([left, bottom, size, drift, duration, delay, opacity], i) => (
        <span
          key={i}
          className="board-ambient__particle"
          style={{
            "--particle-left": left,
            "--particle-bottom": bottom,
            "--particle-size": `${size}px`,
            "--particle-drift": `${drift}px`,
            "--particle-duration": `${duration}s`,
            "--particle-delay": `${delay}s`,
            "--particle-opacity": opacity,
          }}
        />
      ))}
    </div>
  );
}
