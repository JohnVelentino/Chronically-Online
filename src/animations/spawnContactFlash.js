import { HIGH } from "./timings.js";

/**
 * spawnContactFlash(targetElement)
 *
 * Spawns a white overlay on the target element at the exact frame a hit resolves.
 * Timeline:
 *   frame 0  — overlay inserted at opacity 0.7
 *   +16ms    — hold ends, fade begins
 *   +96ms    — fade complete (16ms hold + HIGH.duration 80ms fade), element removed
 *
 * @param {HTMLElement} targetElement
 */
export function spawnContactFlash(targetElement) {
  if (!targetElement) return;

  const overlay = document.createElement("div");

  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #ffffff;
    opacity: 0.7;
    pointer-events: none;
    z-index: 9999;
    mix-blend-mode: screen;
  `;

  // Ensure the target can contain an absolute child
  const existingPosition = getComputedStyle(targetElement).position;
  if (existingPosition === "static") {
    targetElement.style.position = "relative";
  }

  targetElement.appendChild(overlay);

  // Hold 1 frame (16ms), then fade over HIGH.duration (80ms)
  setTimeout(() => {
    overlay.style.transition = `opacity ${HIGH.duration}ms linear`;
    overlay.style.opacity = "0";

    setTimeout(() => overlay.remove(), HIGH.duration);
  }, 16);
}
