import { HIGH, LOW, MID } from "./timings.js";

/**
 * playAction(element, config)
 *
 * Chains 4 beats in sequence on a DOM element using the Web Animations API:
 *   1. anticipation — slight scale-up + 2-frame hold     (HIGH tier)
 *   2. travel       — move to target position             (MID tier)
 *   3. impact       — brightness flash + scale punch      (HIGH tier)
 *   4. settle       — overshoot rebound back to rest      (LOW tier)
 *
 * @param {HTMLElement} element
 * @param {object}      config
 * @param {number}      [config.travelX=0]          - px to move on X axis
 * @param {number}      [config.travelY=0]          - px to move on Y axis
 * @param {number}      [config.anticipationScale=1.08]
 * @param {number}      [config.impactScale=0.88]
 * @param {number}      [config.settleOvershoot=1.04]
 * @param {number}      [config.impactBrightness=2.2]
 * @returns {Promise<void>} resolves when all 4 beats complete
 */
export async function playAction(element, config = {}) {
  const {
    travelX = 0,
    travelY = 0,
    anticipationScale = 1.08,
    impactScale = 0.88,
    settleOvershoot = 1.04,
    impactBrightness = 2.2,
  } = config;

  // 2-frame hold at 60fps ≈ 33ms — clamped inside HIGH tier
  const FRAME2 = Math.min(33, HIGH.duration);

  // Beat 1 — anticipation: scale up, hold 2 frames
  await element
    .animate(
      [
        { transform: "scale(1) translate(0px, 0px)", filter: "brightness(1)" },
        { transform: `scale(${anticipationScale}) translate(0px, 0px)`, filter: "brightness(1)", offset: 1 - FRAME2 / HIGH.duration },
        { transform: `scale(${anticipationScale}) translate(0px, 0px)`, filter: "brightness(1)" },
      ],
      { duration: HIGH.duration, easing: HIGH.ease.join ? `cubic-bezier(${HIGH.ease.join(",")})` : HIGH.ease, fill: "forwards" }
    )
    .finished;

  // Beat 2 — travel: move to target position
  await element
    .animate(
      [
        { transform: `scale(${anticipationScale}) translate(0px, 0px)` },
        { transform: `scale(${anticipationScale}) translate(${travelX}px, ${travelY}px)` },
      ],
      { duration: MID.duration, easing: MID.ease, fill: "forwards" }
    )
    .finished;

  // Beat 3 — impact: 1-frame brightness flash + scale punch
  await element
    .animate(
      [
        { transform: `scale(${anticipationScale}) translate(${travelX}px, ${travelY}px)`, filter: "brightness(1)" },
        { transform: `scale(${impactScale}) translate(${travelX}px, ${travelY}px)`, filter: `brightness(${impactBrightness})`, offset: 1 / HIGH.duration * 16 },
        { transform: `scale(${impactScale}) translate(${travelX}px, ${travelY}px)`, filter: "brightness(1)" },
      ],
      { duration: HIGH.duration, easing: `cubic-bezier(${HIGH.ease.join(",")})`, fill: "forwards" }
    )
    .finished;

  // Beat 4 — settle: overshoot rebound back to origin
  await element
    .animate(
      [
        { transform: `scale(${impactScale}) translate(${travelX}px, ${travelY}px)` },
        { transform: `scale(${settleOvershoot}) translate(0px, 0px)`, offset: 0.6 },
        { transform: "scale(1) translate(0px, 0px)", filter: "brightness(1)" },
      ],
      { duration: LOW.duration, easing: LOW.ease, fill: "none" }
    )
    .finished;
}
