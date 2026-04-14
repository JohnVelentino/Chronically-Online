/**
 * Animation timing tiers — single source of truth.
 * All animation durations and easing must import from here.
 *
 * LOW  — gentle settle   (250ms, ease-in-out)
 * MID  — crisp confirm   (150ms, ease-out)
 * HIGH — sharp impact    ( 80ms, cubic-bezier snap)
 */

export const LOW = {
  duration: 250,
  ease: "easeInOut",
  durationS: 0.25,
};

export const MID = {
  duration: 150,
  ease: "easeOut",
  durationS: 0.15,
};

export const HIGH = {
  duration: 80,
  ease: [0.25, 0.46, 0.45, 0.94], // cubic-bezier snap
  durationS: 0.08,
};
