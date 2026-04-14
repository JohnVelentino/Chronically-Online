# Phase 1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the structural/clarity foundation layer of the AAA polish effort: rename Elon class → Tech, fix board overflow with Hearthstone-style scaling, visually distinguish minions from spells, add ultimate ability hover tooltip with charge indicator.

**Architecture:** Pure UI/data changes in React + Framer Motion. No engine-logic changes. All changes gate-safe: each task is independently shippable and playtestable in-browser.

**Tech Stack:** React 18, Vite, Framer Motion, plain CSS-in-JS (no Tailwind).

**Validation model:** This project has no test framework (see CLAUDE.md). Every task validates via: (1) `npm run lint` passes, (2) `npm run dev` starts clean, (3) manual browser check of specific behavior listed per task.

**Spec reference:** `docs/superpowers/specs/2026-04-14-aaa-polish-design.md` (Phase 1 section).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/data/cards.js` | Modify | Rename `"Elon"` class refs to `"Tech"`; update Elon hero themeColor. |
| `src/CardGame.jsx` | Modify | Rename class strings; extend `getUltimateMeta`; compute board card size; render ultimate tooltip. |
| `src/components/TemplateCardFace.jsx` | Modify | Update `CLASS_PALETTE.tech` cyan-neon palette; add `renderMode: "spell"` branch. |
| `src/components/BoardMinion.jsx` | Modify | Accept + apply scaled width/height props from parent. |
| `src/components/HeroSelect.jsx` | Modify | Rename "Elon" label to "Tech". |
| `src/components/CardCreator.jsx` | Modify | Update comment + class list. |
| `src/components/TypeBadge.jsx` | Create | Small pill badge showing "SPELL" or "MINION". |
| `src/components/UltimateTooltip.jsx` | Create | Floating card-style preview of ultimate ability on hover. |

---

## Task 1: Rename Elon class → Tech with cyan palette

**Files:**
- Modify: `src/data/cards.js`
- Modify: `src/CardGame.jsx`
- Modify: `src/components/TemplateCardFace.jsx`
- Modify: `src/components/HeroSelect.jsx`
- Modify: `src/components/CardCreator.jsx`

- [ ] **Step 1: Update Elon hero entry in `src/data/cards.js`**

Find line 41 (`class: "Elon"` inside Elon Musk hero). Change these fields:
```js
class: "Tech",
emoji: "🚀",
portrait: "/assets/heroes/elon.png",
cardBack: "/assets/card-backs/elon-back.png",
bio: "Move fast. Break things. Fire everyone. Post at 3am.",
themeColor: "#00e6c8",
glowColor: "rgba(0,230,200,0.55)",
```

- [ ] **Step 2: Update the 6 Elon-class cards in `src/data/cards.js`**

Find lines 73-78 (doge, neuralink, starship, x_rebrand, layoffs, mars_colony). Change every `class:"Elon"` to `class:"Tech"`. Use find/replace on the 6 lines.

- [ ] **Step 3: Update `CLASS_PALETTE` in `src/components/TemplateCardFace.jsx`**

Find lines 13-24. Replace the `elon` entry and update the existing `tech` entry to the new cyan-neon palette:
```js
export const CLASS_PALETTE = {
  "usa!":    { accent: "#f87171", border: "#c03040", text: "#f87171" },
  "usa":     { accent: "#f87171", border: "#c03040", text: "#f87171" },
  "tech":    { accent: "#00e6c8", border: "#00e6c8", text: "#9ef4e0" },
  "neutral": { accent: "#94a3b8", border: "#445566", text: "#94a3b8" },
  "gen z":   { accent: "#a78bfa", border: "#9040c8", text: "#a78bfa" },
  "space":   { accent: "#a78bfa", border: "#c88800", text: "#a78bfa" },
  "battle":  { accent: "#f87171", border: "#c03040", text: "#f87171" },
  "meme":    { accent: "#fb923c", border: "#b85a00", text: "#fb923c" },
  "crypto":  { accent: "#facc15", border: "#a08000", text: "#facc15" },
};
```

(Removed `"elon"` key; updated `"tech"` to cyan.)

- [ ] **Step 4: Rename class strings in `src/CardGame.jsx`**

Find lines 685, 686, 687, 694. Change every `class: "Elon"` to `class: "Tech"` on those lines (in the ultimate-generated minions and the ultimate summoning objects).

- [ ] **Step 5: Update Elon's hero-select label in `src/components/HeroSelect.jsx`**

Find line 124 (`label: "Elon",`). Replace with:
```js
      label: "Tech",
```

- [ ] **Step 6: Update `src/components/CardCreator.jsx`**

Find line 47 comment. Replace:
```js
// Cards in data use "USA!", "Tech", "neutral", or undefined (also neutral).
```

Find line 122 (class dropdown entry). Replace:
```js
  { id: "Tech",    label: "Tech",     color: "#00e6c8" },
```

- [ ] **Step 7: Verify no `"Elon"` class strings remain**

Run search in the editor or via Grep for `"Elon"` and `'Elon'` in `src/`. Expected: zero matches. (The hero's display **name** `"Elon Musk"` stays — it's a name, not a class string.)

- [ ] **Step 8: Lint + browser validation**

```bash
npm run lint
npm run dev
```

In browser:
1. Start a match with Elon hero.
2. Verify his cards render with cyan-green border/glow (not blue).
3. Play Doge Coin, Starship, Mars Colony — confirm each shows "Tech" class watermark.
4. Check Card Creator UI (if accessible) shows "Tech" in class dropdown.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Rename Elon class to Tech with cyan palette

Prepares the class system for additional Tech heroes. Hero name
"Elon Musk" unchanged. Updates CLASS_PALETTE, HeroSelect label,
CardCreator dropdown, and all class-string references in cards and
ultimate-generated minions.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Board scaling (Hearthstone-style)

**Files:**
- Modify: `src/CardGame.jsx`
- Modify: `src/components/BoardMinion.jsx`

- [ ] **Step 1: Locate the board-zone render blocks in `src/CardGame.jsx`**

Search for `BoardMinion` component usage. There are two sides (enemy and player). Each renders a flex row of `<BoardMinion />` instances over `gs.ai.board` and `gs.player.board`.

- [ ] **Step 2: Add the scaling helper near the top of `CardGame.jsx`**

Just after the `ULTIMATE_USE_MAX` constant (around line 33), add:

```js
const BOARD_CARD_MIN_W = 88;
const BOARD_CARD_MAX_W = 132;
const BOARD_CARD_ASPECT = 176 / 132;
const BOARD_SIDE_PAD_PX = 24;
const BOARD_CARD_GAP_PX = 10;

function computeBoardCardSize(count, zoneWidth) {
  if (count <= 0) return { w: BOARD_CARD_MAX_W, h: Math.round(BOARD_CARD_MAX_W * BOARD_CARD_ASPECT) };
  const available = Math.max(0, zoneWidth - BOARD_SIDE_PAD_PX * 2);
  const raw = (available / count) - BOARD_CARD_GAP_PX;
  const w = Math.max(BOARD_CARD_MIN_W, Math.min(BOARD_CARD_MAX_W, Math.floor(raw)));
  return { w, h: Math.round(w * BOARD_CARD_ASPECT) };
}
```

- [ ] **Step 3: Measure board width with a ref**

Inside the component, find where `playerBoardContainerRef` is declared (around line 126). Add a sibling ref and width state:

```js
const enemyBoardContainerRef = useRef(null);
const [playerBoardW, setPlayerBoardW] = useState(1200);
const [enemyBoardW, setEnemyBoardW] = useState(1200);
```

Then add a ResizeObserver effect (place near other `useEffect` blocks, e.g., after the scroll-lock effect ~line 171):

```js
useEffect(() => {
  function measure() {
    if (playerBoardContainerRef.current) setPlayerBoardW(playerBoardContainerRef.current.clientWidth);
    if (enemyBoardContainerRef.current) setEnemyBoardW(enemyBoardContainerRef.current.clientWidth);
  }
  measure();
  const ro = new ResizeObserver(measure);
  if (playerBoardContainerRef.current) ro.observe(playerBoardContainerRef.current);
  if (enemyBoardContainerRef.current) ro.observe(enemyBoardContainerRef.current);
  window.addEventListener("resize", measure);
  return () => {
    ro.disconnect();
    window.removeEventListener("resize", measure);
  };
}, [phase]);
```

- [ ] **Step 4: Compute per-side size just before render**

Inside the component body but above the return, add:

```js
const playerSize = computeBoardCardSize(gs?.player?.board?.length || 0, playerBoardW);
const enemySize  = computeBoardCardSize(gs?.ai?.board?.length || 0, enemyBoardW);
```

- [ ] **Step 5: Wire the ref + sized props into both sides**

Locate the JSX that renders the enemy board container. Add `ref={enemyBoardContainerRef}` to that element. For each `<BoardMinion ... />` in the enemy board map, pass:

```jsx
cardW={enemySize.w}
cardH={enemySize.h}
```

Do the same for the player side using `playerSize`. The player board container should already have `ref={playerBoardContainerRef}`.

Also ensure the container's CSS has `justifyContent: "center"`, `gap: BOARD_CARD_GAP_PX`, `flexWrap: "nowrap"`, `overflow: "visible"` (no horizontal scroll). If a style block there uses `flex-wrap: wrap`, change to `nowrap`.

- [ ] **Step 6: Confirm `BoardMinion` already honors `cardW`/`cardH`**

Open `src/components/BoardMinion.jsx`. Confirm that `cardW` and `cardH` props (lines 35-36) are used in the `style` prop (line 115-118). No code change required — this is verification only.

- [ ] **Step 7: Lint + browser validation**

```bash
npm run lint
npm run dev
```

In browser:
1. Start a match.
2. Summon minions up to 4 — cards remain at max size 132×176.
3. Summon up to 7 (use dev tools / Neuralink combos / fresh game) — cards shrink smoothly, no overlap, no horizontal scroll.
4. Hover any minion on a full board — it lifts above its neighbors without clipping.
5. Resize the browser window — cards re-scale responsively.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Scale board minions to prevent overlap (Hearthstone-style)

Cards now shrink proportionally as board fills, clamped between 88 and
132px wide. ResizeObserver measures each side's zone width; cards
reflow smoothly on resize. Max 7 minions supported cleanly.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: TypeBadge component + wire into card faces

**Files:**
- Create: `src/components/TypeBadge.jsx`
- Modify: `src/components/TemplateCardFace.jsx`

- [ ] **Step 1: Create `src/components/TypeBadge.jsx`**

Full file contents:
```jsx
import React from "react";

const STYLES = {
  spell: {
    bg: "linear-gradient(135deg, #6b2fc8 0%, #9b6bff 100%)",
    border: "#c8a0ff",
    text: "#ffffff",
    icon: "✦",
    label: "SPELL",
  },
  minion: {
    bg: "linear-gradient(135deg, #8b5a1a 0%, #c8860a 100%)",
    border: "#ffd98a",
    text: "#fff4d0",
    icon: "⚔",
    label: "MINION",
  },
};

export default function TypeBadge({ type = "minion", scale = 1 }) {
  const s = STYLES[type] || STYLES.minion;
  const fontSize = Math.max(6.5, 7.5 * scale);
  return (
    <div
      style={{
        position: "absolute",
        top: 4,
        left: 4,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 5px",
        borderRadius: 8,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize,
        fontWeight: 900,
        letterSpacing: 0.4,
        boxShadow: `0 1px 3px rgba(0,0,0,0.6), 0 0 6px ${s.border}66`,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: fontSize * 1.1, lineHeight: 1 }}>{s.icon}</span>
      <span style={{ lineHeight: 1 }}>{s.label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Import TypeBadge in `TemplateCardFace.jsx`**

Add at the top of `src/components/TemplateCardFace.jsx` (after existing imports):
```jsx
import TypeBadge from "./TypeBadge.jsx";
```

- [ ] **Step 3: Render the badge in each card face render path**

Inside the `TemplateCardFace` component's returned JSX — at the top level of the card root (as a child, before the art/portrait area) — add:
```jsx
<TypeBadge type={card.type === "spell" ? "spell" : "minion"} scale={Math.max(0.6, (width || 132) / 132)} />
```

If `TemplateCardFace` has multiple return branches (e.g., one per `renderMode`), add the badge in each branch, OR add it once at the outermost wrapper. Place wherever it's inside the card bounds and above existing children (z-index 5).

- [ ] **Step 4: Lint + browser validation**

```bash
npm run lint
npm run dev
```

In browser:
1. Look at your hand: every minion shows a bronze "⚔ MINION" pill top-left; every spell shows a purple "✦ SPELL" pill.
2. Play a minion — badge stays visible on the board-scaled card.
3. Verify the badge doesn't overlap critical info (cost gem, attack/hp).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add TypeBadge for instant card-type readability

Bronze "MINION" pill and purple "SPELL" pill render top-left on every
card face. Scales down on board-mode cards.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Spell frame variant (distinct visual for spells)

**Files:**
- Modify: `src/components/TemplateCardFace.jsx`

- [ ] **Step 1: Inspect the current TemplateCardFace branches**

Open `src/components/TemplateCardFace.jsx`. Note where `card.type === "spell"` vs `minion` is currently differentiated. The goal is to give spells a distinctly different look: purple-tinted bg, a circular arcane orb in place of the portrait, a swirling rune border.

- [ ] **Step 2: Add a SpellOrb inline helper above the component**

Inside `TemplateCardFace.jsx`, above the default-exported function, add:

```jsx
function SpellOrb({ emoji, size = 64 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        background: "radial-gradient(circle at 50% 40%, #d4b0ff 0%, #7a3fcc 45%, #2a0f55 100%)",
        boxShadow: "0 0 18px #9b6bffaa, inset 0 0 18px #3a1070",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -4,
          borderRadius: "50%",
          background: "conic-gradient(from 0deg, #c8a0ff, transparent 40%, #9b6bff, transparent 80%, #c8a0ff)",
          animation: "spellOrbSpin 6s linear infinite",
          opacity: 0.55,
          pointerEvents: "none",
        }}
      />
      <span style={{ fontSize: size * 0.5, zIndex: 1, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}>
        {emoji || "✦"}
      </span>
      <style>{`@keyframes spellOrbSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
```

- [ ] **Step 3: Wrap spell cards with a purple-tinted backdrop**

Inside the component's returned JSX, find the main card-container `style` prop. If the card is a spell (`card.type === "spell"`), override the background and border:

```jsx
const isSpell = card.type === "spell";
const spellBg = "linear-gradient(180deg, rgba(60,30,100,0.55), rgba(30,10,55,0.85))";
const spellBorder = "#9b6bff";
```

Merge into the root container style when `isSpell`:
```jsx
style={{
  ...existingStyle,
  ...(isSpell ? { background: spellBg, borderColor: spellBorder, boxShadow: "0 0 18px rgba(155,107,255,0.35), inset 0 0 16px rgba(90,40,160,0.4)" } : {}),
}}
```

- [ ] **Step 4: Replace the portrait slot with SpellOrb for spells**

Find the portrait/art rendering block within the card body. Wrap it in a type check:

```jsx
{isSpell ? (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
    <SpellOrb emoji={card.emoji} size={Math.min(width, height) * 0.45} />
  </div>
) : (
  /* existing minion portrait / emoji block */
)}
```

(Keep the existing minion branch exactly as it was.)

- [ ] **Step 5: Lint + browser validation**

```bash
npm run lint
npm run dev
```

In browser:
1. Cast your hand. Every spell (e.g., Executive Order, Fake News, Doge Coin) shows the purple orb + rune border.
2. Minions still show their portrait/emoji as before.
3. Drag a spell — orb remains visually distinct at drag-scale.
4. Verify spells and minions are distinguishable in a full hand at a glance.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Distinct spell frame: purple orb + rune border

Spell cards now render with a circular arcane orb, conic-gradient rune
ring spinning behind it, and purple-tinted background. Minions keep
their portrait frame. Combined with TypeBadge, card type is readable
at any size.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Extend getUltimateMeta with description + cost

**Files:**
- Modify: `src/CardGame.jsx`

- [ ] **Step 1: Replace `getUltimateMeta` in `src/CardGame.jsx`**

Find lines 55-61. Replace the entire function with:

```js
function getUltimateMeta(hero) {
  const heroId = typeof hero === "string" ? hero : hero?.id;
  if (heroId === "trump") return {
    id: "trump",
    name: "The Japan Special",
    cost: 10,
    emoji: "🇯🇵",
    themeColor: "#cc2222",
    desc: "Deal 8 damage to all enemies and summon 2× The Wall.",
  };
  if (heroId === "cia") return {
    id: "cia",
    name: "Deep State Download",
    cost: 10,
    emoji: "🛰️",
    themeColor: "#6dc6d6",
    desc: "Take control of up to 2 enemy minions and steal 1 card from their hand.",
  };
  if (heroId === "elon") return {
    id: "elon",
    name: "Future Tech",
    cost: 10,
    emoji: "🚀",
    themeColor: "#00e6c8",
    desc: "Summon Mars Colony and give all friendlies Charge.",
  };
  return { id: "generic", name: "Ultimate", cost: 10, emoji: "⚡", themeColor: "#ffcc33", desc: "A powerful hero-specific ability." };
}
```

- [ ] **Step 2: Verify downstream callers still work**

Grep for `getUltimateMeta(` in the codebase. Existing callers only read `.id` and `.name`; the added fields are additive and won't break anything.

```bash
# visual check only, no code change
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no new warnings. If there's an unused-variable warning, ignore for now — Task 6 uses the new fields.

- [ ] **Step 4: Commit**

```bash
git add src/CardGame.jsx
git commit -m "$(cat <<'EOF'
Extend getUltimateMeta with cost, emoji, description

Adds cost, emoji, themeColor, and desc fields to each hero's ultimate
metadata. Used by the upcoming UltimateTooltip preview.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Ultimate tooltip (card preview on hover + charge indicator)

**Files:**
- Create: `src/components/UltimateTooltip.jsx`
- Modify: `src/CardGame.jsx`

- [ ] **Step 1: Create `src/components/UltimateTooltip.jsx`**

Full file contents:
```jsx
import React from "react";
import { motion } from "framer-motion";

const RARITY_GLOW = "rgba(250,199,117,0.55)";

export default function UltimateTooltip({ meta, unlockedCharges, usedCharges, maxCharges, anchorRect }) {
  if (!meta || !anchorRect) return null;

  const cardW = 200;
  const cardH = 280;
  const left = Math.max(12, anchorRect.left - cardW - 16);
  const top = Math.max(12, anchorRect.top + anchorRect.height / 2 - cardH / 2);

  const pips = Array.from({ length: maxCharges }).map((_, i) => {
    const isUsed = i < usedCharges;
    const isLocked = i >= unlockedCharges;
    return { isUsed, isLocked };
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed",
        left,
        top,
        width: cardW,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: cardW,
          height: cardH,
          borderRadius: 14,
          background: `linear-gradient(180deg, ${meta.themeColor}33, rgba(15,20,35,0.95))`,
          border: `2px solid ${meta.themeColor}`,
          boxShadow: `0 0 24px ${meta.themeColor}88, 0 10px 28px rgba(0,0,0,0.7), inset 0 0 16px ${RARITY_GLOW}`,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          color: "#f0eee6",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "#2b3c90", border: "2px solid #9bb6ff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 18, color: "#fff",
            boxShadow: "0 0 10px #3b57d0aa",
          }}>{meta.cost}</div>
          <div style={{ fontSize: 32, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}>{meta.emoji}</div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 16, textAlign: "center", color: meta.themeColor, textShadow: `0 0 8px ${meta.themeColor}88` }}>
          {meta.name}
        </div>
        <div style={{
          flex: 1,
          fontSize: 12.5,
          lineHeight: 1.4,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: 10,
          color: "#dcdac8",
        }}>
          {meta.desc}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
          {pips.map((p, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: p.isUsed ? "#333" : p.isLocked ? "#1a2030" : meta.themeColor,
              border: `1.5px solid ${p.isLocked ? "#445" : meta.themeColor}`,
              boxShadow: !p.isUsed && !p.isLocked ? `0 0 8px ${meta.themeColor}` : "none",
              opacity: p.isLocked ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, color: "#000",
            }}>
              {p.isUsed ? "✓" : p.isLocked ? "🔒" : "⚡"}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#99a0b0", textAlign: "center" }}>
          Charges unlock at 5 and 10 mana.
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Import the tooltip in `CardGame.jsx`**

Near the other `./components/*` imports (around line 10-18), add:
```js
import UltimateTooltip from "./components/UltimateTooltip.jsx";
```

Also ensure `AnimatePresence` from `framer-motion` is imported (it already is, line 2).

- [ ] **Step 3: Add tooltip state and a ref for the ultimate button**

Inside the component near other `useState` hooks (around line 105-107 area), add:
```js
const [ultHover, setUltHover] = useState(false);
const ultBtnRef = useRef(null);
```

- [ ] **Step 4: Attach the ref + mouse handlers to the Ultimate button**

Locate the JSX for the player's Ultimate button (search for "Ultimate" or `ULTIMATE_USE_MAX`). Add:
```jsx
ref={ultBtnRef}
onMouseEnter={() => setUltHover(true)}
onMouseLeave={() => setUltHover(false)}
```

to the button's props. If the button is already conditionally disabled, keep those props intact.

- [ ] **Step 5: Render the tooltip via portal-style inline anchored to the button**

At the end of the top-level JSX (just before the closing wrapper fragment/div — same place `DamageNumber` or similar overlays render), add:

```jsx
<AnimatePresence>
  {ultHover && gs?.player && (
    <UltimateTooltip
      meta={getUltimateMeta(gs.player.hero || selectedHero)}
      unlockedCharges={getUnlockedUltimateCharges(gs.player.maxMana)}
      usedCharges={gs.player.ultimateUses || 0}
      maxCharges={ULTIMATE_USE_MAX}
      anchorRect={ultBtnRef.current?.getBoundingClientRect()}
    />
  )}
</AnimatePresence>
```

If `gs.player.hero` is not the right path to the hero object, use `selectedHero` or whatever variable currently sources the player's hero in `CardGame.jsx` (check what gets passed to other hero-related helpers in the file).

- [ ] **Step 6: Lint + browser validation**

```bash
npm run lint
npm run dev
```

In browser:
1. Start a match as Trump. Hover the Ultimate button — a full spell-card-style preview appears to the left of the button showing cost 10, name "The Japan Special", description, and two unlit charge pips with locks (since mana < 5).
2. Advance turns until maxMana reaches 5. The first pip is now lit cyan (unlocked, unused).
3. Use the ultimate. Pip 1 shows ✓ (used); pip 2 still locked.
4. Reach maxMana 10. Pip 2 unlocks.
5. Hover out — tooltip fades cleanly.
6. Repeat with CIA and Elon (Tech) heroes to verify all three ultimates show correct meta.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add UltimateTooltip with card preview and charge indicator

Hovering the Ultimate button now shows a full spell-card-style preview
anchored to the button: cost, emoji, name, description, and pip row
indicating used / available / locked charges. Players no longer have
to memorize their hero's ultimate effect.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 wrap-up

- [ ] **Final sweep: run the game for 10 minutes across all three heroes**

Play at least one match with each hero (Trump, CIA, Elon/Tech). Confirm:
- Board never overflows or overlaps, even with 7 minions.
- Every card in hand and on board is instantly identifiable as spell or minion.
- Tech (Elon) cards all render in cyan, not blue.
- Ultimate tooltip appears on hover, disappears on leave, shows accurate charge state.
- No console errors in DevTools.

- [ ] **Tag the phase-1 completion commit**

```bash
git tag -a phase-1-complete -m "Phase 1 foundations: board scaling, class rename, type distinction, ultimate tooltip"
```

Phase 1 shipped. Time to `/clear` and come back later for the Phase 2 (game-feel) plan.

---

## Self-review checklist (completed by planner)

**Spec coverage:**
- [x] 1.1 Board scaling → Task 2
- [x] 1.2 Elon → Tech rename → Task 1
- [x] 1.3 Minion vs Spell distinction → Tasks 3 + 4 (badge + spell frame). *Hover FX particles from spec §1.3 deferred to Phase 2 juice layer — they belong with other hover/play FX and don't block clarity.*
- [x] 1.4 Ultimate tooltip → Tasks 5 + 6

**Placeholder scan:** No TBDs, no "implement later", no "similar to above". All code steps show full code.

**Type consistency:** `getUltimateMeta` returns `{id, name, cost, emoji, themeColor, desc}` and `UltimateTooltip` consumes exactly those fields. `computeBoardCardSize` returns `{w, h}`, passed as `cardW`/`cardH` matching `BoardMinion`'s existing props.

**Note on hover FX:** Spec §1.3 mentions arcane particles on spell hover and dust rings on minion hover. These are cosmetic additions that pair naturally with the Phase 2 `CardHoverFX`/particle system and are not required for type readability (which the badge + frame already achieve). They are tracked in the Phase 2 plan.
