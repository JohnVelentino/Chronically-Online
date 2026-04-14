# Chronically Online — AAA Polish Design

**Date:** 2026-04-14
**Status:** Approved, ready for implementation planning
**Target quality bar:** Hearthstone / Legends of Runeterra feel

---

## Goals

Elevate Chronically Online from prototype-level UX to AAA-level polish through three phases of layered improvements: structural foundations, game-feel juice, and meta polish.

## Non-Goals

- No networking / multiplayer.
- No new heroes or cards in this pass (the Tech class rename prepares the ground for future heroes but none are added here).
- No balance changes to existing mechanics.
- No test infrastructure (project has none; validation continues to be in-browser).

---

## Phase 1 — Foundations

Structural clarity fixes. Must ship before Phases 2/3 to avoid re-doing layout math.

### 1.1 Board scaling (Hearthstone-style)

**Problem:** Board uses fixed 132×176px cards. With 5+ minions they overflow and visually overlap.

**Design:**
- Cards scale proportionally with count, never scroll, never wrap.
- Formula (per side): `cardW = clamp(minW, (zoneWidth - padding) / (count + 0.5) - gap, maxW)`
  - `minW = 88`, `maxW = 132`, `gap = 10`
  - `cardH` maintains `cardW * (176/132)` aspect ratio.
- Max board size: 7 minions (Hearthstone standard).
- Board remains center-aligned via flexbox `justify-content: center`.
- Hover/selected cards lift with `z-index: 10 + scale(1.035–1.09)` so they rise above neighbors.
- Props `cardW` and `cardH` already exist on `BoardMinion`; pass computed values from `CardGame.jsx`.

**Files:** `src/CardGame.jsx` (compute per-side card size), `src/components/BoardMinion.jsx` (already accepts sizing props).

**Acceptance:** Filling a side with 7 minions shows them all, evenly spaced, no overlap. Hover still raises a card above its neighbors.

---

### 1.2 Elon → Tech class rename

**Problem:** Hero "Elon Musk" is his own class of 1. Want to enable future Tech heroes.

**Design:**
- Rename `class: "Elon"` → `class: "Tech"` across all code paths.
- Hero display name "Elon Musk" stays.
- New Tech palette in `TemplateCardFace.CLASS_PALETTE`:
  ```js
  tech: {
    bg: "rgba(0,40,50,0.55)",
    border: "#00e6c8",
    text: "#9ef4e0",
    glow: "rgba(0,230,200,0.45)"
  }
  ```
- Hero `themeColor` updates to `#00e6c8`, `glowColor: "rgba(0,230,200,0.5)"`.
- `HEROES` gains a `class: "Tech"` entry; `CLASS_CARDS` entries for doge/neuralink/starship/x_rebrand/layoffs/mars_colony all set `class: "Tech"`.

**Files touched:**
- `src/data/cards.js` — HEROES[2].class, 6 CLASS_CARDS entries
- `src/components/TemplateCardFace.jsx` — CLASS_PALETTE key rename + color update
- `src/components/BoardMinion.jsx` — palette lookup key rename
- `src/engine/ai.js` — any "Elon" string refs
- `src/CardGame.jsx` — `getUltimateMeta`: keep `id: "elon"` for hero identity but ultimate name/description unchanged

**Acceptance:** Elon's hero portrait loads, his cards display in the new cyan palette, no references to `"Elon"` class string remain in the codebase.

---

### 1.3 Minion vs Spell visual distinction

**Problem:** Spells and minions share the same card frame — type is only readable via description.

**Design:**
- Extend `TemplateCardFace` with a `renderMode: "spell"` branch:
  - Replace portrait area with a circular arcane orb (radial gradient + rotating rune overlay).
  - Purple-tinted base (`bg: rgba(60,30,100,0.55)`, `border: #9b6bff`).
  - Swirling rune border (CSS `conic-gradient` + `animation: spin 8s linear infinite`).
- Minion mode gets a subtle stone pedestal beneath portrait (thin gray ellipse with shadow).
- Type badge ribbon component (`<TypeBadge type="spell|minion" />`):
  - Top-left corner, 10px tall, always visible.
  - "SPELL" = purple pill with arcane icon ✦
  - "MINION" = bronze pill with sword icon ⚔
- Hover FX:
  - Spells emit 3–5 slow-rising arcane particles (purple, `opacity 0.6 → 0`).
  - Minions emit a faint dust ring at the pedestal.

**Files:** `src/components/TemplateCardFace.jsx`, new `src/components/TypeBadge.jsx`, new `src/components/CardHoverFX.jsx`.

**Acceptance:** At a glance (even at board-scaled 88×117), spells and minions are visually distinct via frame + badge.

---

### 1.4 Ultimate ability tooltip

**Problem:** Ultimate button shows no info. Player must remember effects.

**Design:**
- Extend `getUltimateMeta(hero)` with: `cost`, `desc`, `emoji`, `themeColor`, `effectSummary`.
  - Trump — "The Japan Special": 10⚡ cost, "Deal 8 damage to all enemies and summon 2x The Wall."
  - CIA — "Deep State Download": 10⚡, "Take control of up to 2 enemy minions and steal 1 card."
  - Elon — "Future Tech": 10⚡, "Summon Mars Colony and give all friendlies Charge."
- On hover over Ultimate button: render a floating preview anchored to the button.
  - Uses `TemplateCardFace` with `renderMode: "spell"` for consistent look.
  - Positioned: `right: 120px` from button, vertically centered on pointer.
  - Fade in 120ms.
- Charge indicator below button:
  - Two pips ⚡⚡ — lit = available charge, dim = locked/spent.
  - Sub-text: "Unlocks at 5/10 mana."

**Files:** `src/CardGame.jsx` (extend `getUltimateMeta`, add hover state + render), reuse `TemplateCardFace`.

**Acceptance:** Hovering the Ultimate button shows a full-size card preview with name/cost/description; charge pips accurately reflect used/available state.

---

## Phase 2 — Game-feel (juice layer)

Layered on top of Phase 1. Each item is independent and toggleable via `devConfig` for A/B testing.

### 2.1 Smart card draw animation

**Problem:** `drawCard` currently adds to hand with no animation; player misses what they drew.

**Design:**
- New animation module: `src/animations/drawAnimation.js`.
- Two modes, auto-selected:
  - **Full (~1100ms)** — for turn-start single draws and spell-triggered draws:
    1. Deck glows + pulses (120ms)
    2. Card flies out toward center (200ms, spring ease)
    3. Zooms to 1.6× scale at center, rotates +3°, rarity glow (600ms hold)
    4. Flies to hand slot via `layoutId` handoff (300ms)
  - **Condensed (~400ms)** — for mulligan + multi-draws (Neuralink `draw2`, Signal Intercept):
    - Skip the center hold; just fly deck → hand with rarity flash (280ms).
    - Multi-draw cards stagger 80ms apart.
- New state in `CardGame.jsx`: `drawQueue` array; animations chain.
- Framer Motion `layoutId="card-<uid>"` is already used by `BoardMinion`; `HandCard` needs matching `layoutId` so the flight lands smoothly.

**Files:** new `src/animations/drawAnimation.js`, `src/CardGame.jsx` (queue + trigger), `src/components/HandCard.jsx` (layoutId).

**Acceptance:** Drawing a card on turn start flies it from deck → center → hand in ~1.1s; Neuralink draws 2 cards with 400ms each.

---

### 2.2 Mana crystal animation

**Problem:** Mana shown as plain "7/10" number. No feedback when spent/refilled.

**Design:**
- New component: `src/components/ManaCrystals.jsx`.
- 10 crystal pips rendered as hexagonal SVG shapes:
  - Available: cyan glow + inner shine.
  - Spent: dim outline only.
  - Locked (beyond maxMana): hidden / faint grey.
- Transitions:
  - Spending N mana: N crystals drain right-to-left with 60ms stagger, each plays "ting" SFX.
  - Turn refill: crystals fill left-to-right with 80ms stagger + rising chime.
  - Max mana up: new crystal slot fades in with a flash.
- Sits where the current mana text is, both sides.

**Files:** new `src/components/ManaCrystals.jsx`, `src/CardGame.jsx` (swap out text), `src/audio/sfx.js` (add `manaTing`, `manaRefill`).

**Acceptance:** Playing a 3-cost card visibly drains 3 crystals in sequence; turn start refills with clear animation.

---

### 2.3 Card-play slam FX

**Problem:** Minions currently enter with a subtle arc; no weight or impact.

**Design:**
- Extend `BoardMinion` entry animation:
  - Scale 1.4× → 1.0× over 150ms (ease-out, heavy).
  - On landing: spawn `<SlamFX />` — ground dust ring (radial expansion 0 → 80px, 300ms fade).
  - Camera shake: 8px, 180ms via transform on `.board-stage`.
  - Bass-heavy impact SFX (new `sfx.slam`).
- **Legendary minions:** gold shockwave ring (expands to 140px), heavier shake (14px, 260ms), deeper bass stinger.
- Already existing `SummonRune` continues to play beneath.
- Controlled by `devConfig.visual.slamFX` (default on).

**Files:** `src/components/BoardMinion.jsx` (entry tweak), new `src/components/SlamFX.jsx`, `src/CardGame.jsx` (shake trigger), `src/audio/sfx.js`.

**Acceptance:** Playing Mars Colony (legendary) produces visible gold shockwave + hard screen shake + deep bass hit.

---

### 2.4 Attack telegraphing

**Problem:** Attack arrow exists but doesn't indicate valid/invalid targets clearly.

**Design:**
- Enhance `ArrowOverlay`:
  - When attacker is selected, compute valid targets on the enemy side (respecting Taunt).
  - Valid targets pulse green glow (`box-shadow: 0 0 18px #5dcaa5`, 1.2s loop).
  - Invalid targets (blocked by Taunt) pulse red with a small 🔒 icon overlay.
  - Arrow follows cursor with spring physics (stiffness 260, damping 22).
  - Hover a valid target → arrow "locks" (snap + pull-back recoil animation, 120ms).
- Hero portraits are treated as valid targets like minions.

**Files:** `src/components/ArrowOverlay.jsx`, `src/CardGame.jsx` (valid-target computation).

**Acceptance:** Selecting an attacker with enemy Taunt in play shows green-glowing Taunt + red-locked non-Taunt minions + hero.

---

### 2.5 Hero hit reactions

**Problem:** Hero takes damage with only a number popup; no visceral feedback.

**Design:**
- On hero damage:
  - Portrait flinches (shake 6px x, 200ms, ease-out).
  - Short red radial vignette over the portrait (200ms fade).
  - Camera: no shake for face damage (reserved for slam).
- Cracked-glass overlay on portrait accumulates with HP loss:
  - > 15 HP: no cracks
  - 10–15 HP: 1 faint crack PNG overlay (opacity 0.4)
  - 5–10 HP: 2 cracks (opacity 0.7)
  - ≤ 5 HP: full shatter + pulsing red border
- Overlay rendered in `HeroPortrait.jsx` as absolutely-positioned SVG/PNG layer.

**Files:** `src/components/HeroPortrait.jsx`, new `public/assets/fx/crack-1.png`, `crack-2.png`, `shatter.png` (placeholder SVG acceptable until art is sourced).

**Acceptance:** Hero at 4 HP shows pulsing red border + heavy cracks; taking damage adds a flinch + vignette.

---

### 2.6 Turn banner

**Problem:** Turn switches with no visual announcement.

**Design:**
- Full-screen horizontal banner sweeps across on turn change.
- 700ms total: slide in 200ms from right, hold 300ms centered, slide out 200ms to left.
- "YOUR TURN" — gold gradient text, gold glow.
- "ENEMY TURN" — crimson gradient text, red glow.
- Banner height ~120px, full-width, semi-transparent dark backdrop.
- Plays BEFORE the turn's first game action resolves (blocks interaction for 500ms).

**Files:** new `src/components/TurnBanner.jsx`, `src/CardGame.jsx` (trigger in `startTurn` wrapper).

**Acceptance:** Every turn change shows the banner; AI doesn't start acting until banner clears.

---

### 2.7 Enemy card reveal on play

**Problem:** AI plays cards with only a small play-history chip; player doesn't see what was played clearly.

**Design:**
- When AI plays a card, insert a reveal step in `runAiTurnSteps` output.
- Reveal animation: card flies from enemy hand position → center, enlarges to 1.2× hand size (~150×200), pauses 900ms, then:
  - Minion: flies to its board slot (300ms).
  - Spell: dissolves into target with appropriate effect FX (400ms).
- Reuses the draw-animation queue infrastructure from 2.1 (reversed direction).
- Mid-reveal: target becomes visible (glow on targeted minion/hero) so player understands the play.

**Files:** `src/engine/ai.js` (emit reveal step), `src/CardGame.jsx` (replay step), reuses `drawAnimation.js`.

**Acceptance:** When AI plays Tariff, the card enlarges center-screen for ~1s before all friendly minions flash with the damage.

---

## Phase 3 — Meta polish

Ship last. Lower implementation risk, highest "vibes" payoff.

### 3.1 Emote wheel

**Problem:** No personality; matches feel sterile.

**Design:**
- Right-click (or long-press) hero portrait → radial menu of 6 emotes:
  1. "Greetings" — friendly
  2. "Well Played" — compliment
  3. "Threaten" — hostile
  4. "Oops" — flub reaction
  5. "Thanks" — acknowledge
  6. "Thinking" — stalling
- Each hero has unique voice lines per emote (12 × 6 = 72 audio clips; placeholder text-only bubbles OK initially).
- Chat bubble appears above portrait for 3s.
- 3-second cooldown per emote (prevent spam).
- Squelch: right-click opponent's portrait → "Squelch" option hides their emotes for rest of match.

**Files:** new `src/components/EmoteWheel.jsx`, new `src/components/ChatBubble.jsx`, `src/CardGame.jsx` (state + handlers), `src/audio/sfx.js` (emote clips).

**Acceptance:** Right-click your hero opens wheel; selecting "Well Played" plays audio + shows bubble; opponent can be squelched.

---

### 3.2 Victory/defeat screen

**Problem:** Match outcome is a toast that flashes and disappears.

**Design:**
- New `src/components/OutcomeScreen.jsx`.
- Triggered when `winner` state is set; current match view fades to 40% opacity behind it.
- Layout:
  - Winner's hero portrait, full size, glowing.
  - Massive banner: "VICTORY" (gold, particle rain) or "DEFEAT" (crimson, falling ash).
  - Match stats panel:
    - Turns played
    - Damage dealt (player / enemy)
    - Minions played
    - Cards drawn
    - MVP minion (most damage dealt)
  - Buttons: "Play Again" (rematch same matchup) / "Hero Select" (back to menu).
- Loser's portrait gets desaturate + shatter after 1.5s.

**Files:** new `src/components/OutcomeScreen.jsx`, `src/CardGame.jsx` (track stats + render).

**Acceptance:** Winning shows full-screen VICTORY with stats; losing shows DEFEAT with portrait shatter.

---

### 3.3 Sound design pass

**Problem:** Limited SFX coverage; no class differentiation.

**Design:**
- Class-specific card-play stingers (layered on top of slam SFX from 2.3):
  - USA! — brass horn stinger
  - Tech — synth zap / modem sound
  - CIA — classified bleep + distant typing
  - Neutral — subtle woodblock
- Type-specific base sounds:
  - Spells — arcane whoosh + crackle
  - Minions — thud (already done via slam)
- Ambient board music per matchup (see 3.4) — low volume, seamless loop, -18dB.
- All routed through existing `audioManager.js`. New `audio/music/` folder for loops.

**Files:** `src/audio/sfx.js` (new clip registrations), `src/audio/audioManager.js` (music loop support), new files under `public/assets/audio/`.

**Acceptance:** Playing a USA! minion has a distinct horn stinger; spells hiss when cast; a quiet music loop plays during the match.

---

### 3.4 Board theming per matchup

**Problem:** Board looks the same regardless of who's playing.

**Design:**
- Extend `BoardAmbience` with `theme` prop computed from both heroes' classes.
- Themes:
  - **USA! × USA!** — rally stage: stars/stripes bunting, camera-flash particles.
  - **Tech × Tech** — neon server farm: binary-code particles, cyan grid floor.
  - **CIA × CIA** — dim bunker: dust motes, flickering fluorescent.
  - **Mixed pairings** — fall back to a neutral arena theme; secondary accent tints from the losing-popularity-contest hero's class.
- Each theme ties to an ambient music track (3.3) and a BG color.
- Board floor texture swaps via CSS class on `.board-stage`.

**Files:** `src/components/BoardAmbience.jsx`, `src/CardGame.jsx` (pass theme prop), CSS additions in `src/index.css`.

**Acceptance:** Tech-vs-Tech match has neon grid floor + binary particles + synth music; switching heroes changes the theme.

---

## Cross-cutting concerns

### Dev config toggles
All Phase 2 juice features gate on `devConfig.visual.*` flags (default on). This lets you A/B test and disable anything that doesn't feel right. New flags:
- `slamFX`, `cameraShake`, `turnBanner`, `drawAnimation`, `manaCrystals`, `attackTelegraph`, `hitReactions`, `boardTheme`.

### Performance
- All new animations use `transform` + `opacity` only (GPU-accelerated).
- Framer Motion `layoutId` used sparingly — only for the draw→hand handoff.
- Particle systems capped at 50 concurrent particles total.
- `desyncAnimations` pattern from `BoardMinion` applied to any new looping anim.

### Asset budget
- Art placeholders are acceptable; anything requiring final art has SVG stand-ins listed per feature.
- Audio can ship with royalty-free freesound.org clips; voice lines are text-bubble-only at launch.

### Incremental shippability
- After each phase, the game is fully playable and improved vs. prior state. No phase leaves the game in a broken intermediate state.

---

## Decision log

| Decision | Rationale |
|---|---|
| Hearthstone scaling over horizontal scroll | Matches AAA genre convention; no UX to learn. |
| Phase split 4/7/4 | Foundations must precede juice; juice must precede meta. |
| Keep "Elon Musk" hero name, only rename class | Preserves character identity while enabling class expansion. |
| Full spell-card hover for Ultimate | User explicitly chose option C (full card + charge indicator). |
| Smart pacing for draw anim | Prevents multi-draw cards from feeling slow. |
| All juice features toggleable | Safety net for iteration. |

---

## Out of scope (explicitly not doing)

- End-of-turn rope timer (skipped per user).
- Keyword glossary tooltips (skipped per user).
- Networked multiplayer.
- Card balance changes.
- New heroes (infrastructure enabled, content not added).
- Mobile/touch controls.
