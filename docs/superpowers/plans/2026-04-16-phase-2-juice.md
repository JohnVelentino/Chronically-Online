# Phase 2 — Game-Feel Juice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer AAA-grade game-feel on top of the Phase 1 foundation: animated mana crystals, minion slam FX, attack telegraphing, hero hit reactions, and a turn-transition banner. Phase 2 is pure polish — no engine-rule changes.

**Architecture:** React + Framer Motion additions, almost entirely in `src/components/*` and `src/CardGame.jsx`. State lives where it already does (`gs.player.mana`, `gs.player.maxMana`, `phase`, `attackVisual`, HP on heroes). Effects subscribe via `useEffect` on prev/next-value deltas — no engine coupling.

**Tech Stack:** React 18, Vite, Framer Motion, plain CSS-in-JS (no Tailwind).

**Validation model:** No test framework (see CLAUDE.md). Every task validates via: (1) `npm run lint` passes, (2) `npm run dev` starts clean, (3) manual browser check of specific behavior per task.

**Scope note:** 9 patch items (draw animation, mulligan, rules, AI ultimate, AI targeting fix, CIA reveal, TypeBadge reposition, ult cost→0, revealed-hand scaling) already shipped ad-hoc during playtesting. This plan covers only the 5 remaining juice items from the original Phase 2 scope.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/components/ManaCrystals.jsx` | Create | Row of gem-style crystals with fill/drain animation per current/max. |
| `src/components/SlamImpact.jsx` | Create | One-shot radial burst + dust ring + mini screen-shake trigger for minion drop. |
| `src/components/AttackPreview.jsx` | Create | Predicted-damage floating tag anchored to attacker/defender while selAtk hover. |
| `src/components/HeroHitFX.jsx` | Create | Portrait shake + red flash + crunch number pop (wraps HeroPortrait overlay). |
| `src/components/TurnBanner.jsx` | Create | Full-width sweeping "YOUR TURN" / "OPPONENT TURN" banner. |
| `src/CardGame.jsx` | Modify | Wire 5 new components; replace inline AI mana pip row and player Aura Points text; add screen-shake transform; hook into `phase` transitions for the banner; compute predicted damage in onHover. |
| `src/components/HeroPortrait.jsx` | Modify | Expose a hit-reaction hook (surface HP delta) so HeroHitFX can render crunch numbers without duplicating HP state tracking. |
| `src/components/BoardMinion.jsx` | Modify | Fire `onSlam` callback on first mount so SlamImpact can spawn at minion position. |

---

## Task 1: Mana crystals (animated gem UI)

Replace the plain `{gs.player.mana}/{gs.player.maxMana} Aura Points` text box and the AI's pip row with a proper crystal row. Current crystals fill bright cyan; spent crystals drain to dim; locked slots (> maxMana) stay dark.

**Files:**
- Create: `src/components/ManaCrystals.jsx`
- Modify: `src/CardGame.jsx`

- [ ] **Step 1: Create `src/components/ManaCrystals.jsx`**

Render a row of up to 10 crystal divs. Each is a ~22×28 faceted gem (CSS `clip-path: polygon(...)` hexagon). Use Framer Motion `AnimatePresence` with keyed per-crystal divs; animate `fill` state (`available | spent | locked`) via `animate` color + inner glow. Include a `justSpent` prop that plays a quick drain animation (scale 1→1.25→0.9→1, color cyan→white→dim) when mana drops. Accept props: `current`, `max`, `size` (default 22), `compact` (boolean — for AI's smaller row).

Key implementation: keep a `prevCurrent` ref; when `current < prevCurrent`, flag the crystals in index range `[current, prevCurrent)` with `justSpent=true` for 400ms. Use a per-crystal `<motion.div>` with `animate` transitioning background gradient:
- available: `linear-gradient(135deg,#5ad8ff,#0d6fc4)` + `boxShadow: 0 0 10px #5ad8ff`
- spent: `linear-gradient(135deg,#1a2a40,#0a1420)` + no glow
- locked: `linear-gradient(135deg,#0a0f18,#05080c)` + `opacity: 0.45`

- [ ] **Step 2: Wire into player side in `CardGame.jsx`**

Locate the `auraIndicatorLayout` fixed-position div showing `{gs.player.mana}/{gs.player.maxMana} Aura Points`. Replace the inner div's textual content with:

```jsx
<ManaCrystals current={gs.player.mana} max={gs.player.maxMana} size={22} />
```

Keep the outer positioning wrapper intact so the hero-layout config still drives placement.

- [ ] **Step 3: Wire into AI side in `CardGame.jsx`**

Locate the `Array.from({ length: gs.ai.maxMana })` inline pip row. Replace with:

```jsx
<ManaCrystals current={gs.ai.mana} max={gs.ai.maxMana} size={14} compact />
```

- [ ] **Step 4: Add import**

```js
import ManaCrystals from "./components/ManaCrystals.jsx";
```

- [ ] **Step 5: Gotcha check — HeroPortrait's own mana pill**

`src/components/HeroPortrait.jsx` still renders `{mana}/{maxMana} Aura Points` when passed `mana`/`maxMana` props. Grep usages — currently neither call site passes those props. Leave HeroPortrait's block as-is (dead code path; non-breaking). Do not refactor in this task.

- [ ] **Step 6: Lint + browser validation**

```bash
npm run lint
npm run dev
```

In browser:
1. Start a match. Player row shows 1 glowing cyan crystal. AI row (smaller) shows 0.
2. End turn. AI crystal appears at max=1, drains when AI plays.
3. Play a minion. Crystals in the spent range drain with a quick pop.
4. Turn 10, no mana spent: 10 full cyan crystals. After spending 4: 4 dim, 6 bright.
5. Game remains readable and no horizontal overflow at 10 crystals.

- [ ] **Step 7: Commit**

Subject: `feat(ui): animated mana crystal row`

---

## Task 2: Slam FX on minion drop

When a minion enters the board, spawn a one-shot impact burst at its position: radial shockwave ring, dust-puff sprites, short screen shake. Leverages existing `SummonRune` layer but adds weight.

**Files:**
- Create: `src/components/SlamImpact.jsx`
- Modify: `src/CardGame.jsx` (optionally `src/components/BoardMinion.jsx`)

- [ ] **Step 1: Create `src/components/SlamImpact.jsx`**

One-shot Framer Motion component: a central white flash, a radial expanding ring (scale 0→2.5, opacity 0.9→0, 350ms), and 6–8 dust particles flung outward (randomized angles, duration 500ms). Accept props: `x`, `y`, `color` (default amber `rgba(239,159,39,0.8)`). Absolute-positioned, `pointerEvents: none`, z-index 400. Self-removing via `onAnimationComplete` callback.

- [ ] **Step 2: Track slam events in `CardGame.jsx`**

Add state next to `summonRunes`:
```js
const [slamEvents, setSlamEvents] = useState([]);
const [shakeKey, setShakeKey] = useState(0);
```

Helper:
```js
function spawnSlam(uid, side) {
  const ref = getMinionRef(uid);
  const rect = ref?.current?.getBoundingClientRect();
  if (!rect) return;
  const id = mkUid();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  setSlamEvents(prev => [...prev, { id, x, y, side }]);
  setShakeKey(k => k + 1);
  setTimeout(() => setSlamEvents(prev => prev.filter(e => e.id !== id)), 600);
}
```

- [ ] **Step 3: Detect minion entry in existing board-diff effect**

`prevBoardUids` already exists. Extend (or add) a `useEffect` that diffs `gs.player.board`/`gs.ai.board` vs `prevBoardUids.current` and calls `spawnSlam(uid, side)` for each newly-added uid. Gate on `phase !== "hero_select"` and `phase !== "mulligan"` to avoid firing during initial setup. Keep summonRune logic untouched — slam is additive.

- [ ] **Step 4: Render slam overlays**

Near the `<ArrowOverlay>` render block:
```jsx
<AnimatePresence>
  {slamEvents.map(e => (
    <SlamImpact key={e.id} x={e.x} y={e.y} color={e.side === "player" ? "rgba(93,202,165,0.85)" : "rgba(226,75,74,0.85)"} />
  ))}
</AnimatePresence>
```

- [ ] **Step 5: Apply screen shake to board-arena wrapper**

Locate `<div className="board-arena" ...>`. Wrap its inner content in a `<motion.div>` keyed by `shakeKey`:
```jsx
<motion.div
  key={shakeKey}
  animate={{ x: [0, -6, 5, -3, 0], y: [0, 3, -2, 1, 0] }}
  transition={{ duration: 0.28, ease: "easeOut" }}
  style={{ width: "100%", height: "100%" }}
>
  {/* existing zones */}
</motion.div>
```

Gotcha: The shake must not disrupt absolute-positioned board zones. If layout breaks, apply shake via a `transform` on a dedicated wrapper that only contains `.board-zone--enemy` and `.board-zone--player`.

- [ ] **Step 6: Import in `CardGame.jsx`**

```js
import SlamImpact from "./components/SlamImpact.jsx";
```

- [ ] **Step 7: Lint + browser validation**

```bash
npm run lint
npm run dev
```

1. Play a minion — visible flash + ring + small arena shake.
2. Enemy plays a minion — same effect, red-tinted ring.
3. Summon-rune ring still fires (additive).
4. Shake does not cause heroes, hand, or HUD to jitter.
5. Multiple simultaneous summons — multiple rings, shake doesn't compound badly.

- [ ] **Step 8: Commit**

Subject: `feat(fx): slam impact on minion summon`

---

## Task 3: Attack telegraphing (predicted damage preview)

While a player minion is selected for attack (`selAtk` set) and the cursor is over a valid target, show predicted damage numbers near both the attacker and the defender before the swing resolves.

**Files:**
- Create: `src/components/AttackPreview.jsx`
- Modify: `src/CardGame.jsx`

- [ ] **Step 1: Create `src/components/AttackPreview.jsx`**

Props: `attackerRect`, `defenderRect`, `attackerDmg`, `defenderDmg`, `lethal` (bool). Renders two floating red badges:
- Near defender: `-{attackerDmg}` in red, with a small skull emoji if `lethal`.
- Near attacker: `-{defenderDmg}` (retaliation damage, only if target is a minion).

Use `position: fixed`; `pointerEvents: none`, z-index 950. Fade in 120ms with Framer Motion.

- [ ] **Step 2: Add hover state in `CardGame.jsx`**

Near `hovTarget`:
```js
const [attackPreviewTarget, setAttackPreviewTarget] = useState(null);
```

- [ ] **Step 3: Wire hover handlers**

For each enemy `<BoardMinion>`, wrap with a div capturing `onMouseEnter={() => selAtk && setAttackPreviewTarget({ kind: "minion", uid: m.uid })}` and `onMouseLeave={() => setAttackPreviewTarget(null)}`.

For the AI hero `<HeroPortrait ... isAI />`, wrap with same handlers, setting `{ kind: "hero" }`.

- [ ] **Step 4: Compute predicted damage**

```js
const attackerMinion = selAtk ? gs.player.board.find(m => m.uid === selAtk) : null;
let previewProps = null;
if (attackerMinion && attackPreviewTarget) {
  if (attackPreviewTarget.kind === "hero") {
    previewProps = {
      attackerRect: selAtkRef.current?.getBoundingClientRect(),
      defenderRect: enemyHeroRef.current?.getBoundingClientRect(),
      attackerDmg: attackerMinion.atk,
      defenderDmg: 0,
      lethal: attackerMinion.atk >= gs.ai.hp,
    };
  } else {
    const def = gs.ai.board.find(m => m.uid === attackPreviewTarget.uid);
    if (def) {
      previewProps = {
        attackerRect: selAtkRef.current?.getBoundingClientRect(),
        defenderRect: getMinionRef(def.uid).current?.getBoundingClientRect(),
        attackerDmg: attackerMinion.atk,
        defenderDmg: def.atk,
        lethal: attackerMinion.atk >= def.hp,
      };
    }
  }
}
```

- [ ] **Step 5: Render the preview**

Next to `<ArrowOverlay>`:
```jsx
{previewProps && <AttackPreview {...previewProps} />}
```

- [ ] **Step 6: Clear on attack resolution / cancel**

In `onEnemyMinionClick`, `onEnemyHeroClick`, and the Escape-key handler, add `setAttackPreviewTarget(null)` alongside existing `setSelAtk(null)` calls.

- [ ] **Step 7: Gotcha — taunt gating**

Respect taunt: gate on `!aiHasTaunt || defMinion?.keywords?.includes("taunt")` in previewProps computation. Also skip when `ciaUltSelection` is active.

- [ ] **Step 8: Lint + browser validation**

```bash
npm run lint
npm run dev
```

1. Select one of your minions, arrow appears.
2. Hover an enemy minion — floating `-X` damage tags appear on both sides.
3. Lethal check: attack ≥ hp — skull emoji appears.
4. Hover enemy hero — only attacker-side damage shows.
5. Taunt present, hover a non-taunt target — no preview.
6. Press Escape or cancel — preview clears.

- [ ] **Step 9: Commit**

Subject: `feat(ui): attack telegraph with damage preview`

---

## Task 4: Hero hit reactions

`HeroPortrait.jsx` already flashes red for 500ms on HP drop. Upgrade: add a portrait shake, a bigger red radial flash, and a crunch number pop showing the damage delta.

**Files:**
- Create: `src/components/HeroHitFX.jsx`
- Modify: `src/components/HeroPortrait.jsx`

- [ ] **Step 1: Create `src/components/HeroHitFX.jsx`**

Self-contained effect layer: one-shot animated `-{amount}` red number in bold serif that scale-pops from 0.3→1.5→1 and drifts upward 30px over 900ms. Plus a full-frame red radial gradient overlay (`opacity 0.6→0`, 500ms). Props: `amount`, `onDone`. Absolute-positioned to fill its parent.

- [ ] **Step 2: Extend HP-drop effect in `HeroPortrait.jsx`**

Find the existing `useEffect` for HP flash. Expand:
```js
const [hitFx, setHitFx] = useState([]);
useEffect(() => {
  const delta = prevHp.current - hp;
  if (delta > 0) {
    setFlashing(true);
    setTimeout(() => setFlashing(false), 500);
    const id = Math.random().toString(36).slice(2);
    setHitFx(arr => [...arr, { id, amount: delta }]);
    setTimeout(() => setHitFx(arr => arr.filter(f => f.id !== id)), 950);
  }
  prevHp.current = hp;
}, [hp]);
```

- [ ] **Step 3: Add portrait shake**

Wrap the inner 150×150 portrait `<div>` with a `<motion.div>`:
```jsx
<motion.div
  animate={hitFx.length ? { x: [0, -8, 7, -4, 3, 0], y: [0, 4, -3, 2, 0, 0] } : { x: 0, y: 0 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>
  {/* existing portrait block */}
</motion.div>
```

- [ ] **Step 4: Render HeroHitFX overlay**

Inside the 150×150 box:
```jsx
{hitFx.map(f => (
  <HeroHitFX key={f.id} amount={f.amount} />
))}
```

- [ ] **Step 5: Gotcha — guard against heals**

Only fire when `delta > 0`. Do not fire on HP increases.

- [ ] **Step 6: Import HeroHitFX**

```js
import HeroHitFX from "./HeroHitFX.jsx";
```

- [ ] **Step 7: Lint + browser validation**

```bash
npm run lint
npm run dev
```

1. Get hit by an enemy minion — portrait shakes, red flash, `-3` number floats up.
2. Hit the enemy — same effect on their portrait.
3. Cast an AOE spell for 4 damage — reads `-4`.
4. Heal yourself — no hit FX.
5. Multiple sequential hits — each plays cleanly.

- [ ] **Step 8: Commit**

Subject: `feat(fx): hero hit shake flash crunch numbers`

---

## Task 5: Turn banner (sweeping transition)

Big full-width banner sweeping across the screen on phase transition between `player_turn` and `ai_turn`. ~900ms lifetime, non-blocking.

**Files:**
- Create: `src/components/TurnBanner.jsx`
- Modify: `src/CardGame.jsx`

- [ ] **Step 1: Create `src/components/TurnBanner.jsx`**

Props: `kind` (`"player"` | `"opponent"`), `show`, `onDone`. Fixed-positioned mid-screen: a gradient stripe (800px × 120px) sweeps in from left (x: -600 → 0), holds 300ms, exits right (x: 0 → 600). Text: "YOUR TURN" (gold/green gradient) or "OPPONENT TURN" (red gradient). `textShadow` for readability, reuse `ultimateShimmer` keyframe.

Fire `onDone` via `setTimeout(900)` or `onAnimationComplete`.

- [ ] **Step 2: Track phase transitions in `CardGame.jsx`**

```js
const [turnBanner, setTurnBanner] = useState(null);
const prevPhase = useRef(phase);

useEffect(() => {
  if (prevPhase.current !== phase) {
    if (phase === "player_turn") setTurnBanner({ kind: "player", id: Math.random() });
    else if (phase === "ai_turn")  setTurnBanner({ kind: "opponent", id: Math.random() });
    prevPhase.current = phase;
  }
}, [phase]);
```

- [ ] **Step 3: Render the banner**

At top level of returned JSX:
```jsx
<AnimatePresence>
  {turnBanner && (
    <TurnBanner
      key={turnBanner.id}
      kind={turnBanner.kind}
      show
      onDone={() => setTurnBanner(null)}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 4: Import**

```js
import TurnBanner from "./components/TurnBanner.jsx";
```

- [ ] **Step 5: Gotcha — phase gating**

Effect only fires on `player_turn`/`ai_turn`; other phases (mulligan, rules, gameover, hero_select) naturally excluded.

- [ ] **Step 6: Gotcha — z-index vs match-fade**

Match-fade overlay runs at match start. Banner z-index 550 sits between cards and arrows (below fade opaque layer).

- [ ] **Step 7: Lint + browser validation**

```bash
npm run lint
npm run dev
```

1. Start match. After mulligan, "YOUR TURN" sweeps.
2. End turn. "OPPONENT TURN" sweeps.
3. AI finishes. "YOUR TURN" sweeps again.
4. Game over — no banner fires.
5. Banner doesn't block clicks.

- [ ] **Step 8: Commit**

Subject: `feat(ui): turn transition banner`

---

## Phase 2 wrap-up

- [ ] **Final sweep: 10-minute playtest across all three heroes**

Play one match per hero (Trump, CIA, Tech/Elon). Confirm:
- Mana crystals fill/drain correctly every turn.
- Minion drops always trigger slam + shake.
- Attack preview tags appear on hover and clear cleanly.
- Hero portrait shakes + crunch numbers on every damage event.
- Turn banner fires on every phase flip, never on gameover or hero-select.
- No console errors.

- [ ] **Tag the phase-2 completion commit**

```bash
git tag -a phase-2-complete -m "Phase 2 juice: mana crystals, slam FX, attack telegraph, hero hit reactions, turn banner"
```
