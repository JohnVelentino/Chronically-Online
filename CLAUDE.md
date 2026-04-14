# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, hot reload)
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

There are no tests. The game is validated by running it in the browser.

## Architecture

This is a single-page browser card game — a Hearthstone-style 1v1 between a human player and an AI opponent. Everything runs client-side; there is no backend.

### Data flow

```
src/data/cards.js          ← card/hero definitions (pure data)
       ↓
src/engine/gameState.js    ← player init, deck building, draw logic
src/engine/combat.js       ← all game mechanics (the bulk of logic)
src/engine/ai.js           ← AI turn simulation, returns step array
       ↓
src/CardGame.jsx           ← top-level game component, owns all state
       ↓
src/components/*           ← pure display components
```

### Game state (`gs`)

The entire match lives in a single immutable `gs` object managed by `useState` in `CardGame.jsx`. It has the shape:

```js
{
  player: { name, hp, maxHp, armor, mana, maxMana, deck, hand, board, ... },
  ai:     { same shape as player },
  turn:   "player" | "ai",
  visibility: { ... }   // which AI hand cards are revealed
}
```

All engine functions take `gs` and return a new `gs` (plus a `log[]`). Never mutate state directly.

### Engine layer (`src/engine/`)

- **`gameState.js`** — `initPlayer`, `makeDeck`, `makeDeckFrom`, `drawCard`. Deck construction and player initialization only.
- **`combat.js`** — Every mechanic: `applySpell`, `playBattlecry`, `doAttack`, `dealDamage`, `buffMinion`, `destroyMinion`, `summonToken`, `takeControlOfMinion`, `startTurn`, `resolveEndOfTurn`, and ~30 more. Adding a new card effect means adding a case in `applySpell` (line ~665) or `playBattlecry` (line ~777).
- **`ai.js`** — `runAiTurnSteps` simulates a full AI turn and returns an array of step objects. `CardGame.jsx` replays them one-by-one with delays for animation.

### Card & hero data (`src/data/cards.js`)

- `HEROES` — array of hero definitions with `id`, `deckIds[]`, `themeColor`, portrait path, etc.
- `CLASS_CARDS` — class-specific cards (Trump/USA!, Elon/Elon, CIA/USA!)
- `NEUTRAL_CARDS` — shared cards available to all heroes
- `getLib()` — returns the merged pool of all cards
- `DECK_SIZE_TARGET = 35`

Card schema for minions: `{ id, name, cost, atk, hp, type:"minion", desc, emoji, rarity, keywords[], class? }`  
Card schema for spells: `{ id, name, cost, type:"spell", effect, targetType:"minion"|"none"|"hero", desc, emoji, rarity, class? }`

Keywords that have engine support: `taunt`, `charge`, `rush`, `elusive` (stealth), `divine_shield`, `battlecry`, `windfury`, `lifesteal`, `poisonous`, `aura_other_friendly_attack_1`.

### Dev config system (`src/dev/`)

A localStorage-persisted config store for live UI tweaking. Access from browser console:

```js
window.__DEV__.getDevConfig()
window.__DEV__.setDevConfig({ visual: { ambientParticles: false } })
window.__DEV__.resetDevConfig()
```

`devConfig.js` exports `getDevConfig`, `setDevConfig`, `resetDevConfig`, `subscribe`. The React hook `useDevConfig.js` wraps these for component use.

### Key UI constants in `CardGame.jsx`

Layout magic numbers (hero positions, animation timing, board sizing) are defined as named constants at the top of `CardGame.jsx`. Change those rather than hard-coding values inline.

### Adding a new card

1. Add the card definition to `CLASS_CARDS` or `NEUTRAL_CARDS` in `src/data/cards.js`.
2. If it has a spell effect, add a case for `effect` in `applySpell` in `src/engine/combat.js`.
3. If it has a battlecry, add a case in `playBattlecry` in `src/engine/combat.js`.
4. Add the card's `id` to the relevant hero's `deckIds` in `HEROES` if it's class-specific.

### Adding a new hero

Add an entry to the `HEROES` array in `src/data/cards.js` with `id`, `name`, `class`, `deckIds` (20 card IDs), and optional `portrait`/`cardBack` paths. Ultimate abilities are handled by `getUltimateMeta` in `CardGame.jsx`.
