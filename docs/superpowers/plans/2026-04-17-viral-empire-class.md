# Patch: Viral Empire Class + New Heroes

Date: 2026-04-17
Status: design spec locked, not implemented

## UI polish
- Lean neon cyber vibe for buttons across the game.
- All flavor text vertical + italic font (consistent rule).
- Gen Z style/theme/vibe on ALL new cards and copy.
- Flavor text on almost everything.

## New class: Viral Empire

### Core mechanic: "Fan" minion (replaces generic Stan)
- Before it resolves (pre-summon / on play), gives ALL other friendly Fans on board a buff.
- Buff varies per hero (hero-specific aura flavor):
  - **Andrew Tate** — Manly G fans → **+1/+1** to other Fans.
  - **Other heroes** — weaker or no Fan buff; compensated by stronger Ultimate.
- Balance knob: weaker Fan buff → stronger Ult, and vice versa.

---

## Hero 1 — Andrew Tate (Top G)

**Vibe:** luxury RICH HIGH VALUE MAN, self-improvement, Escape the Matrix. Big bulky G minions + buff spells + OP versatile "Escape the Matrix" tools.

### Ultimate: "Top G Protocol"
- Summon three **8/8 War Room Member** with **Charge**.
- Then **Discover 1 of 3** cards (choose 1):
  - Cigar Night
  - Bugatti Chiron Pur Sport
  - A-Level Celebrity Security Team

### Discover cards

**Cigar Night** — 10 mana spell
- Own hero takes 10 damage.
- Give all friendly minions **+8/+8**.
- Draw a card.
- Flavor: *"The smoke clears… only alphas remain."*

**Bugatti Chiron Pur Sport** — 8 mana, 8/10 minion
- ALL your minions have **Charge**. This minion has **Charge**.
- Flavor: *"What color is your Bugatti?..."*

**A-Level Celebrity Security Team** — 6 mana spell
- Gain **10 Armor**.
- Summon **four 4/8 Security Team** minions with **Taunt**. Cannot attack enemy hero.
- Flavor: TBD, funny/alpha-coded.

### Deck theme cards (ideas to build out)
- Welcome to the Real World
- The Real World University
- Escape The Matrix
- Cards that: destroy enemy minions, copy enemy cards, gain mana, disable enemy Ultimate for 2 turns.
- Keep existing invented cards — user approved them.

---

## Hero 2 — PewDiePie

**Vibe:** classic Bro Army 2014 + T-Series Battle Era. Aggressive **Zoo deck** — tons of early cards, minions that buff each other. Amnesia playthrough + Happy Wheels meme references (Stephano, Barrels, etc.).

### Ultimate: "Subscribe!"
- Steal **10 random cards** from enemy deck into your deck.
- Summon **six 2/2 Nine Year Old Army** with **Charge**.
- Add **Bitch Lasagna** spell to your hand.

### Bitch Lasagna — 5 mana spell
- Deal **8 damage** to all enemies.
- Draw **6 cards**.
- Restore **30 health**.
- Summon a **2/40 T-Series** minion with **Taunt** and **Elusive** for your OPPONENT.
- Flavor: TBD, meme-coded.

### Deck theme
- Small cheap minions that buff each other (Zoo).
- Meme references: Stephano, Piggeh, Barrels, Mr. Chair, Jennifer (Amnesia + Happy Wheels).

---

## Hero 3 — Mark Zuckerberg

**Vibe:** corporate / lizard / surveillance. Robotic, data-mining, Metaverse-coded.

### Ultimate: "The Metaverse"
- Transform ALL minions on the board into **2/2 Avatars**. They cannot attack heroes.
- Enemy discards **2 cards** from hand.
- All cards in enemy hand cost **+2**.
- Mark draws **2 cards**.
- Reduce cost of all cards in Mark's deck by **1 Aura**.

### Deck theme
- Corporate surveillance, data harvest, lizard tells, VR/AR gear.
- User said existing card ideas are good — continue in this vibe.

---

## Implementation notes (when building)

Files to touch:
- `src/data/cards.js` — add class `"Viral"`, add HEROES entries (tate, pewdiepie, zuck), add CLASS_CARDS + deckIds[] per hero.
- `src/engine/combat.js` — new effects:
  - Fan pre-summon aura buff (hero-dependent).
  - Charge-to-all-minions grant (Bugatti).
  - Cost reduction on enemy hand (Metaverse).
  - Deck cost reduction (Metaverse).
  - Steal-from-deck (Subscribe).
  - Transform minion into token (Metaverse avatars).
  - Discover-3 picker (Top G Protocol) — may need new UI flow.
  - Disable enemy ult for N turns (Tate class spell).
- `src/engine/ai.js` — add `resolveAiUltimate` branches for `tate`, `pewdiepie`, `zuck`.
- `src/CardGame.jsx` — `getUltimateMeta` entries for 3 new heroes. Discover overlay UI.
- `src/components/` — neon cyber button restyle. Vertical italic flavor-text component.

Open design questions:
- Exact Fan stat line (1/1? 2/2?).
- Other heroes' Fan buff variants (if Fan carries across all Viral heroes).
- Balance: Tate's Fan buff strongest → his ult or other tools weaker? User said "balance with strong ULT or something" so the weaker-Fan heroes get stronger ults.
- "Disable Enemy Ultimate for 2 turns" — new status flag on `ai.ultimateLocked` / `player.ultimateLocked`.
