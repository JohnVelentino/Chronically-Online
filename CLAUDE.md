# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

`npm run dev | build | lint | preview`. No tests — user validates in browser.

**Important:** never run `npm run dev` or browser checks. User runs server + tests own changes. Just give recap after edits.

## Architecture

Single-page browser card game (Hearthstone-style 1v1 vs AI). Client-only, no backend.

### Layout

- `src/data/cards.js` — card/hero data. `HEROES`, `CLASS_CARDS`, `NEUTRAL_CARDS`, `getLib()`, `DECK_SIZE_TARGET=35`.
- `src/engine/gameState.js` — `initPlayer`, `makeDeck`, `makeDeckFrom`, `drawCard`.
- `src/engine/combat.js` — all mechanics. New card effects → case in `applySpell` or `playBattlecry`.
- `src/engine/ai.js` — `runAiTurnSteps` returns step array; `CardGame.jsx` replays w/ delays.
- `src/CardGame.jsx` — top-level state owner. Single immutable `gs` via `useState`. Layout magic numbers are named consts at top.
- `src/components/*` — pure display.
- `src/dev/devConfig.js` — localStorage config: `window.__DEV__.{get,set,reset}DevConfig()`. Hook: `useDevConfig.js`.

### State

`gs = { player, ai, turn, visibility }`. Both players have `{ name, hp, maxHp, armor, mana, maxMana, deck, hand, board, ... }`. Engine fns take `gs`, return new `gs` + `log[]`. Never mutate.

### Card schema

Minion: `{ id, name, cost, atk, hp, type:"minion", desc, emoji, rarity, keywords[], class? }`
Spell: `{ id, name, cost, type:"spell", effect, targetType:"minion"|"none"|"hero", desc, emoji, rarity, class? }`

Supported keywords: `taunt, charge, rush, elusive, divine_shield, battlecry, windfury, lifesteal, poisonous, aura_other_friendly_attack_1`.

### Adding card

1. Define in `CLASS_CARDS` or `NEUTRAL_CARDS`.
2. Spell → case in `applySpell`. Battlecry → case in `playBattlecry`.
3. Class-specific → add id to hero's `deckIds`.

### Adding hero

Entry in `HEROES`: `id`, `name`, `class`, `deckIds` (20 ids), optional `portrait`/`cardBack`. Ultimate via `getUltimateMeta` in `CardGame.jsx`.
