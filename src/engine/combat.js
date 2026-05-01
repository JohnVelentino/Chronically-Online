import { mkUid, drawCard, makeDeckFrom } from "./gameState.js";
import { HEROES, getLib } from "../data/cards.js";

function triggerBeastGamesRestart(gs) {
  let next = gs;
  ["player", "ai"].forEach(s => {
    const heroId = next[s].heroId;
    const hero = HEROES.find(h => h.id === heroId);
    const deckIds = hero?.deckIds || [];
    const fullDeck = makeDeckFrom(deckIds);
    const hand = fullDeck.slice(0, 9);
    const deck = fullDeck.slice(9, 14); // 5-card deck
    next = {
      ...next,
      [s]: {
        ...next[s],
        hp: next[s].maxHp,
        armor: 0,
        mana: 10,
        maxMana: 10,
        hand,
        deck,
        board: [],
        ultimateUses: 2,
        ultimateUsedThisTurn: s === "player",
        beastGamesCasts: 0,
        pendingManaNextTurn: 0,
        tempAuraBonus: 0,
      },
    };
  });
  return next;
}

function getEnemySide(side) {
  return side === "player" ? "ai" : "player";
}

// After a discounted card is played, restore original costs on remaining hand cards
// and clear the flag. Called from play-card paths (spell, minion, both sides).
export function consumeAlgoTweak(gs, side) {
  if (!gs?.[side]?.algoTweakActive) return gs;
  const restoredHand = gs[side].hand.map(c => {
    if (!c._algoDiscounted) return c;
    const { _algoDiscounted, _algoOrigCost, ...rest } = c;
    return { ...rest, cost: _algoOrigCost ?? c.cost };
  });
  return { ...gs, [side]: { ...gs[side], hand: restoredHand, algoTweakActive: false } };
}

// ── Discover mechanic ─────────────────────────────────────────────────────────
// Engine-side support for "reveal 3, pick 1" flows. When the caster is the
// player, we stash a `pendingDiscover` on gs so the UI can open a modal.
// When the caster is AI, we auto-pick immediately.
//
// Actions:
//   destroy_from_enemy_hand, destroy_from_enemy_deck,
//   copy_from_enemy_deck_to_hand,
//   steal_from_enemy_deck_to_hand, steal_from_enemy_hand
//
// `sourceSide` field on pendingDiscover is the caster side (where cards go).
function sampleN(arr, n) {
  const bag = [...arr];
  const out = [];
  while (out.length < n && bag.length) {
    const idx = Math.floor(Math.random() * bag.length);
    out.push(bag.splice(idx, 1)[0]);
  }
  return out;
}

export function resolveDiscover(gs, pickedUid) {
  const pd = gs.pendingDiscover;
  if (!pd) return { gs, log: [] };
  const log = [];
  const side = pd.side;
  const enemy = side === "player" ? "ai" : "player";
  const picked = pd.cards.find(c => c.uid === pickedUid) || pd.cards[0];
  let ng = { ...gs, pendingDiscover: null };
  if (!picked) return { gs: ng, log };
  const label = pd.sourceLabel || "Discover";
  switch (pd.action) {
    case "destroy_from_enemy_hand":
      ng = { ...ng, [enemy]: { ...ng[enemy], hand: ng[enemy].hand.filter(c => c.uid !== picked.uid) } };
      ng = recordDiscard(ng, enemy, picked, label);
      log.push(`${label}: destroyed ${picked.name} from enemy hand.`);
      break;
    case "destroy_from_enemy_deck":
      ng = { ...ng, [enemy]: { ...ng[enemy], deck: ng[enemy].deck.filter(c => c.uid !== picked.uid) } };
      log.push(`${label}: destroyed ${picked.name} from enemy deck.`);
      break;
    case "copy_from_enemy_deck_to_hand":
      if (ng[side].hand.length < 10) {
        ng = { ...ng, [side]: { ...ng[side], hand: [...ng[side].hand, { ...picked, uid: mkUid() }] } };
        log.push(`${label}: copied ${picked.name}.`);
      } else log.push(`${label}: hand full — copy refused.`);
      break;
    case "copy_from_enemy_hand_to_hand":
      if (ng[side].hand.length < 10) {
        ng = { ...ng, [side]: { ...ng[side], hand: [...ng[side].hand, { ...picked, uid: mkUid() }] } };
        log.push(`${label}: copied ${picked.name} from enemy hand.`);
      } else log.push(`${label}: hand full — copy refused.`);
      break;
    case "steal_from_enemy_deck_to_hand":
      if (ng[side].hand.length < 10) {
        ng = {
          ...ng,
          [side]: { ...ng[side], hand: [...ng[side].hand, picked] },
          [enemy]: { ...ng[enemy], deck: ng[enemy].deck.filter(c => c.uid !== picked.uid) },
        };
        log.push(`${label}: stole ${picked.name} from enemy deck.`);
      } else log.push(`${label}: hand full — steal refused.`);
      break;
    case "steal_from_enemy_hand":
      if (ng[side].hand.length < 10) {
        ng = {
          ...ng,
          [side]: { ...ng[side], hand: [...ng[side].hand, picked] },
          [enemy]: { ...ng[enemy], hand: ng[enemy].hand.filter(c => c.uid !== picked.uid) },
        };
        log.push(`${label}: stole ${picked.name}.`);
      } else log.push(`${label}: hand full — steal refused.`);
      break;
    default:
      log.push(`${label}: unknown action.`);
  }
  return { gs: ng, log };
}

export function openDiscover(gs, { side, pool, action, sourceLabel, count = 3 }) {
  if (!pool || !pool.length) return gs;
  const picks = sampleN(pool, Math.min(count, pool.length));
  if (!picks.length) return gs;
  if (side === "ai") {
    const ng = { ...gs, pendingDiscover: { side, cards: picks, action, sourceLabel } };
    const pickedAi = picks[Math.floor(Math.random() * picks.length)];
    return resolveDiscover(ng, pickedAi.uid).gs;
  }
  return { ...gs, pendingDiscover: { side, cards: picks, action, sourceLabel } };
}

function asAtk(value) {
  return Number.isFinite(value) ? value : 0;
}

function asHp(value) {
  return Number.isFinite(value) ? value : 1;
}

function pickRandom(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

let __discardEventCounter = 0;
// Append a discard reveal event to gs so the UI can animate the lost card.
// `side` = side that LOST the card. `reason` = short label (spell/effect name).
function recordDiscard(gs, side, card, reason = "") {
  if (!card) return gs;
  __discardEventCounter += 1;
  const eventId = `disc-${Date.now()}-${__discardEventCounter}-${Math.random().toString(36).slice(2, 7)}`;
  const events = Array.isArray(gs.discardEvents) ? gs.discardEvents : [];
  return { ...gs, discardEvents: [...events, { eventId, side, card, reason }] };
}

function applyHeroDamageWithArmor(hero, amount) {
  const armor = Math.max(0, hero.armor || 0);
  const blocked = Math.min(armor, amount);
  const overflow = Math.max(0, amount - blocked);
  return { ...hero, armor: armor - blocked, hp: hero.hp - overflow };
}

function consumeHeroDamage(gs, heroSide, amount) {
  if (amount <= 0) return { gs, amount: 0 };
  // Bezos Ascension: hero is invulnerable while any of his ult summons are still alive.
  if (gs[heroSide].bezosAscension) {
    const stillAscending = (gs[heroSide].board || []).some(m => m.bezosAscensionToken);
    if (stillAscending) return { gs, amount: 0 };
  }
  const shield = gs[heroSide].heroShieldTurns || 0;
  if (shield > 0) {
    return { gs, amount: 0 };
  }
  const ironDomer = (gs[heroSide].board || []).find(
    m => m.keywords?.includes("iron_dome") && m.ironDomeReady !== false
  );
  if (ironDomer) {
    const next = {
      ...gs,
      [heroSide]: {
        ...gs[heroSide],
        board: gs[heroSide].board.map(m =>
          m.uid === ironDomer.uid ? { ...m, ironDomeReady: false } : m
        ),
      },
    };
    return { gs: next, amount: 0 };
  }
  return { gs, amount };
}

function withReveals(gs, patch) {
  return { ...gs, visibility: { ...(gs.visibility || {}), ...patch } };
}

function normalizeMinionStats(minion) {
  const baseAtk = asAtk(minion.baseAtk ?? minion.atk ?? minion.attack ?? 0);
  const auraAttackBonus = asAtk(minion.auraAttackBonus ?? 0);
  const tempAttackBonus = asAtk(minion.tempAttackBonus ?? 0);
  return {
    ...minion,
    baseAtk,
    auraAttackBonus,
    tempAttackBonus,
    atk: baseAtk + auraAttackBonus + tempAttackBonus,
    maxHp: asHp(minion.maxHp ?? minion.hp ?? minion.health ?? 1),
    hp: asHp(minion.hp ?? minion.health ?? 1),
  };
}

function hasAuraAttackSource(minion) {
  if (minion.effectConfig?.aura?.type === "other_friendly_attack" && minion.effectConfig.aura.amount) return true;
  return (minion.keywords || []).includes("aura_other_friendly_attack_1");
}

function recalculateAuras(gs) {
  const next = { ...gs };
  ["player", "ai"].forEach(side => {
    const board = gs[side].board.map(normalizeMinionStats);
    const sources = board.filter(hasAuraAttackSource);
    const auraPerMinion = sources.length;
    next[side] = {
      ...gs[side],
      board: board.map(minion => {
        if (!auraPerMinion) return { ...minion, auraAttackBonus: 0, atk: minion.baseAtk + minion.tempAttackBonus };
        const ownSource = hasAuraAttackSource(minion) ? 1 : 0;
        const auraAttackBonus = Math.max(0, auraPerMinion - ownSource);
        return {
          ...minion,
          auraAttackBonus,
          atk: minion.baseAtk + minion.tempAttackBonus + auraAttackBonus,
        };
      }),
    };
  });
  return next;
}

export function createMinionEntity(card) {
  const baseAtk = card.atk ?? card.attack ?? 0;
  const baseHp = card.hp ?? card.health ?? 1;
  const keywords = Array.isArray(card.keywords) ? [...card.keywords] : [];
  if (keywords.includes("stealth") && !keywords.includes("elusive")) keywords.push("elusive");

  const hasCharge = keywords.includes("charge");
  const hasRush = keywords.includes("rush");
  const immediateAttack = hasCharge || hasRush;

  return normalizeMinionStats({
    ...card,
    baseAtk: asAtk(baseAtk),
    hp: asHp(baseHp),
    maxHp: asHp(card.maxHp ?? baseHp),
    keywords,
    summoningSick: !immediateAttack,
    canAttack: immediateAttack,
    attacksRemaining: immediateAttack ? 1 : 0,
    rushOnlyThisTurn: hasRush && !hasCharge,
    uid: card.uid || mkUid(),
  });
}

function updateMinion(gs, side, uid, updater) {
  return {
    ...gs,
    [side]: {
      ...gs[side],
      board: gs[side].board.map(m => (m.uid === uid ? updater(m) : m)),
    },
  };
}

function extractDeadMinions(gs) {
  const dead = [];
  ["player", "ai"].forEach(side => {
    gs[side].board.forEach(minion => {
      if ((minion.hp ?? 0) <= 0) dead.push({ side, minion });
    });
  });
  return dead;
}

function removeDeadMinions(gs) {
  return {
    ...gs,
    player: { ...gs.player, board: gs.player.board.filter(m => (m.hp ?? 0) > 0) },
    ai: { ...gs.ai, board: gs.ai.board.filter(m => (m.hp ?? 0) > 0) },
  };
}

function getTriggerActions(card, trigger) {
  if (!card) return [];
  const cfg = card.effectConfig?.[trigger];
  if (Array.isArray(cfg)) return cfg;
  if (cfg) return [cfg];
  if (trigger === "on_death" && card.effectParams?.onDeath) {
    return Array.isArray(card.effectParams.onDeath) ? card.effectParams.onDeath : [card.effectParams.onDeath];
  }
  return [];
}

function resolveDeaths(gs, sourceSide, log = []) {
  let next = gs;
  while (true) {
    const dead = extractDeadMinions(next);
    if (!dead.length) return promoteSurvivorIfSolo(recalculateAuras(next), log);
    next = removeDeadMinions(next);

    for (const { side, minion } of dead) {
      const actions = getTriggerActions(minion, "on_death");
      if (!actions.length) continue;
      for (const action of actions) {
        next = runTriggerAction(next, action, side, sourceSide, minion.uid, log);
      }
    }
  }
}

function promoteSurvivorIfSolo(gs, log = []) {
  const all = [
    ...gs.player.board.map(m => ({ side: "player", m })),
    ...gs.ai.board.map(m => ({ side: "ai", m })),
  ];
  const contestants = all.filter(x => x.m.isContestant);
  if (contestants.length !== 1) return gs;
  const { side, m } = contestants[0];
  const promoted = normalizeMinionStats({
    ...m,
    id: "survivor",
    name: "Survivor",
    isContestant: false,
    baseAtk: (m.baseAtk ?? m.atk ?? 3) + 10,
    hp: m.hp + 10,
    maxHp: (m.maxHp ?? m.hp) + 10,
    emoji: "🏆",
    rarity: "legendary",
    keywords: Array.from(new Set([...(m.keywords || []), "charge"])),
    desc: "Charge. Winner winner.",
    summoningSick: false,
    canAttack: true,
    attacksRemaining: 1,
  });
  log.push("🏆 SURVIVOR! Winner winner chicken dinner.");
  return recalculateAuras({
    ...gs,
    [side]: {
      ...gs[side],
      board: gs[side].board.map(x => (x.uid === m.uid ? promoted : x)),
    },
  });
}

export function drawCards(gs, side, amount) {
  let next = gs;
  for (let i = 0; i < amount; i += 1) {
    next = { ...next, [side]: drawCard(next[side]) };
  }
  return next;
}

export function enemyDrawCards(gs, side, amount) {
  return drawCards(gs, getEnemySide(side), amount);
}

export function revealHand(gs, targetSide, duration = "turn") {
  const key = `${targetSide}HandRevealed`;
  const until = duration === "turn" ? `end_of_${getEnemySide(targetSide)}_turn` : duration;
  return withReveals(gs, { [key]: true, [`${key}Until`]: until });
}

export function lookAtTopCards(gs, side, count) {
  const preview = gs[side].deck.slice(0, Math.max(0, count)).map(card => ({ ...card }));
  return {
    gs: { ...gs, [side]: { ...gs[side], deckPreview: preview } },
    cards: preview,
  };
}

export function chooseOneAndKeep(_side, cards) {
  return cards?.length ? cards[0] : null;
}

export function removeChosenCardFromPreviewAndLeaveRestInDeck(gs, side, chosenCard) {
  const preview = gs[side].deckPreview || [];
  if (!preview.length || !chosenCard) return gs;
  const chosen = preview.find(c => c.uid === chosenCard.uid) || preview[0];
  const rest = preview.filter(c => c.uid !== chosen.uid);
  const remainingDeck = gs[side].deck.filter(c => !preview.some(p => p.uid === c.uid));
  const hand = gs[side].hand.length < 10 ? [...gs[side].hand, chosen] : gs[side].hand;
  return {
    ...gs,
    [side]: {
      ...gs[side],
      hand,
      deck: [...rest, ...remainingDeck],
      deckPreview: [],
    },
  };
}

export function copyRandomCardFromHand(gs, sourceSide, targetSide) {
  const srcHand = gs[sourceSide].hand;
  const picked = pickRandom(srcHand);
  if (!picked || gs[targetSide].hand.length >= 10) return gs;
  return {
    ...gs,
    [targetSide]: { ...gs[targetSide], hand: [...gs[targetSide].hand, { ...picked, uid: mkUid() }] },
  };
}

export function stealRandomCardFromHand(gs, sourceSide, targetSide) {
  const srcHand = gs[sourceSide].hand;
  const picked = pickRandom(srcHand);
  if (!picked || gs[targetSide].hand.length >= 10) return gs;
  return {
    ...gs,
    [sourceSide]: { ...gs[sourceSide], hand: srcHand.filter(c => c.uid !== picked.uid) },
    [targetSide]: { ...gs[targetSide], hand: [...gs[targetSide].hand, picked] },
  };
}

export function stealCardFromHandByUid(gs, sourceSide, targetSide, cardUid) {
  const srcHand = gs[sourceSide].hand;
  const picked = srcHand.find(card => card.uid === cardUid);
  if (!picked || gs[targetSide].hand.length >= 10) return gs;
  return {
    ...gs,
    [sourceSide]: { ...gs[sourceSide], hand: srcHand.filter(card => card.uid !== picked.uid) },
    [targetSide]: { ...gs[targetSide], hand: [...gs[targetSide].hand, picked] },
  };
}

export function summonToken(gs, side, tokenData, count = 1) {
  let next = gs;
  for (let i = 0; i < count; i += 1) {
    if (next[side].board.length >= 7) break;
    const token = createMinionEntity({
      ...tokenData,
      id: tokenData.id || "token",
      name: tokenData.name || "Token",
      type: "minion",
      cost: tokenData.cost ?? 0,
      rarity: tokenData.rarity || "common",
      effect: tokenData.effect || "",
      class: tokenData.class || "neutral",
      keywords: tokenData.keywords || [],
    });
    next = { ...next, [side]: { ...next[side], board: [...next[side].board, token] } };
  }
  return recalculateAuras(next);
}

export function takeControlOfMinion(gs, minionUid, newOwner, duration = "permanent", currentTurnSide = newOwner, options = {}) {
  let fromSide = null;
  ["player", "ai"].forEach(side => {
    if (gs[side].board.some(m => m.uid === minionUid)) fromSide = side;
  });
  if (!fromSide || fromSide === newOwner || gs[newOwner].board.length >= 7) return gs;

  const minion = gs[fromSide].board.find(m => m.uid === minionUid);
  const moved = {
    ...minion,
    controlledBy: newOwner,
    originalOwner: minion.originalOwner || fromSide,
    temporaryControl: duration === "turn",
    returnControlOnTurnEnd: duration === "turn" ? currentTurnSide : null,
    summoningSick: false,
    canAttack: true,
    attacksRemaining: Math.max(minion.attacksRemaining || 0, 1),
    keepOnKillControl: !!options.keepOnKill,
  };

  const next = {
    ...gs,
    [fromSide]: { ...gs[fromSide], board: gs[fromSide].board.filter(m => m.uid !== minionUid) },
    [newOwner]: { ...gs[newOwner], board: [...gs[newOwner].board, moved] },
  };
  return recalculateAuras(next);
}

function returnTemporaryControl(gs, side) {
  let next = gs;
  const toReturn = gs.player.board
    .filter(m => m.temporaryControl && m.returnControlOnTurnEnd === side)
    .map(m => ({ from: "player", minion: m }))
    .concat(gs.ai.board.filter(m => m.temporaryControl && m.returnControlOnTurnEnd === side).map(m => ({ from: "ai", minion: m })));

  for (const entry of toReturn) {
    const targetOwner = entry.minion.originalOwner || getEnemySide(entry.from);
    if (next[targetOwner].board.length >= 7) continue;
    next = {
      ...next,
      [entry.from]: { ...next[entry.from], board: next[entry.from].board.filter(m => m.uid !== entry.minion.uid) },
      [targetOwner]: {
        ...next[targetOwner],
        board: [
          ...next[targetOwner].board,
          {
            ...entry.minion,
            controlledBy: targetOwner,
            temporaryControl: false,
            returnControlOnTurnEnd: null,
          },
        ],
      },
    };
  }
  return recalculateAuras(next);
}

export function dealDamage(gs, targetId, amount, sourceSide = "player") {
  let next = gs;
  if (targetId === "hero_player") {
    next = damageHero(next, "player", amount);
  } else if (targetId === "hero_ai") {
    next = damageHero(next, "ai", amount);
  } else {
    ["player", "ai"].forEach(side => {
      if (next[side].board.some(m => m.uid === targetId)) {
        next = updateMinion(next, side, targetId, m => ({ ...m, hp: m.hp - amount }));
      }
    });
  }
  return resolveDeaths(next, sourceSide);
}

export function dealDamageToAll(gs, targetGroup, amount, sourceSide = "player") {
  const enemySide = getEnemySide(sourceSide);
  let next = gs;
  if (targetGroup === "all_minions") {
    ["player", "ai"].forEach(side => {
      next = { ...next, [side]: { ...next[side], board: next[side].board.map(m => ({ ...m, hp: m.hp - amount })) } };
    });
  } else if (targetGroup === "all_enemies") {
    next = damageHero(next, enemySide, amount);
    next = {
      ...next,
      [enemySide]: {
        ...next[enemySide],
        board: next[enemySide].board.map(m => ({ ...m, hp: m.hp - amount })),
      },
    };
  } else if (targetGroup === "enemy_minions") {
    next = { ...next, [enemySide]: { ...next[enemySide], board: next[enemySide].board.map(m => ({ ...m, hp: m.hp - amount })) } };
  } else if (targetGroup === "friendly_minions") {
    next = { ...next, [sourceSide]: { ...next[sourceSide], board: next[sourceSide].board.map(m => ({ ...m, hp: m.hp - amount })) } };
  }
  return resolveDeaths(next, sourceSide);
}

export function dealDamageRandomEnemyMinion(gs, side, amount) {
  const enemySide = getEnemySide(side);
  const target = pickRandom(gs[enemySide].board);
  if (!target) return gs;
  return dealDamage(gs, target.uid, amount, side);
}

export function buffMinion(gs, minionUid, attackDelta, healthDelta, duration = "permanent", ownerSide = "player") {
  let next = gs;
  ["player", "ai"].forEach(side => {
    if (!next[side].board.some(m => m.uid === minionUid)) return;
    next = updateMinion(next, side, minionUid, m => {
      const normalized = normalizeMinionStats(m);
      const buffed = {
        ...normalized,
        hp: normalized.hp + healthDelta,
        maxHp: normalized.maxHp + Math.max(0, healthDelta),
      };
      if (duration === "turn") {
        buffed.tempAttackBonus = (buffed.tempAttackBonus || 0) + attackDelta;
        buffed.tempAttackExpiresOn = ownerSide;
      } else {
        buffed.baseAtk += attackDelta;
      }
      return normalizeMinionStats(buffed);
    });
  });
  return resolveDeaths(recalculateAuras(next), ownerSide);
}

export function grantImmediateAttack(gs, minionUid, targetMode = "any", attacks = 1) {
  let next = gs;
  ["player", "ai"].forEach(side => {
    if (!next[side].board.some(m => m.uid === minionUid)) return;
    next = updateMinion(next, side, minionUid, m => ({
      ...m,
      summoningSick: false,
      canAttack: true,
      attacksRemaining: Math.max(m.attacksRemaining || 0, attacks),
      rushOnlyThisTurn: targetMode === "minion",
    }));
  });
  return next;
}

export function silenceMinion(gs, minionUid, sourceSide = "player") {
  let next = gs;
  ["player", "ai"].forEach(side => {
    if (!next[side].board.some(m => m.uid === minionUid)) return;
    next = updateMinion(next, side, minionUid, m => normalizeMinionStats({
      ...m,
      keywords: [],
      tempAttackBonus: 0,
      auraAttackBonus: 0,
      frozenNextTurn: true,
      desc: "Silenced. Can't attack next turn.",
    }));
  });
  return resolveDeaths(recalculateAuras(next), sourceSide);
}

export function bounceMinionToHand(gs, minionUid, costDelta = 0, sourceSide = "player") {
  let next = gs;
  let ownerSide = null;
  let minion = null;
  ["player", "ai"].forEach(side => {
    const found = next[side].board.find(m => m.uid === minionUid);
    if (found) { ownerSide = side; minion = found; }
  });
  if (!ownerSide || !minion) return gs;
  const owner = next[ownerSide];
  if (owner.hand.length >= 10) {
    return destroyMinion(next, minionUid, sourceSide);
  }
  const cleanCard = {
    id: minion.id,
    name: minion.name,
    cost: Math.max(0, (minion.cost || 0) + costDelta),
    atk: minion.baseAtk ?? minion.atk ?? 0,
    hp: minion.maxHp ?? minion.hp ?? 1,
    type: "minion",
    rarity: minion.rarity || "common",
    class: minion.class || "neutral",
    keywords: Array.isArray(minion.keywords) ? [...minion.keywords] : [],
    desc: minion.desc || "",
    emoji: minion.emoji || "",
    uid: mkUid(),
  };
  next = {
    ...next,
    [ownerSide]: {
      ...owner,
      hand: [...owner.hand, cleanCard],
      board: owner.board.filter(m => m.uid !== minionUid),
    },
  };
  return recalculateAuras(next);
}

export function destroyMinion(gs, minionUid, sourceSide = "player") {
  let next = gs;
  ["player", "ai"].forEach(side => {
    if (!next[side].board.some(m => m.uid === minionUid)) return;
    next = updateMinion(next, side, minionUid, m => ({ ...m, hp: 0 }));
  });
  return resolveDeaths(next, sourceSide);
}

export function destroyMinionWithAttackAtMost(gs, targetId, limit, sourceSide = "player") {
  for (const side of ["player", "ai"]) {
    const minion = gs[side].board.find(m => m.uid === targetId);
    if (minion && (minion.atk ?? 0) <= limit) {
      return destroyMinion(gs, targetId, sourceSide);
    }
  }
  return gs;
}

export function destroyAllMinions(gs, sourceSide = "player") {
  const marked = {
    ...gs,
    player: { ...gs.player, board: gs.player.board.map(m => ({ ...m, hp: 0 })) },
    ai: { ...gs.ai, board: gs.ai.board.map(m => ({ ...m, hp: 0 })) },
  };
  return resolveDeaths(marked, sourceSide);
}

export function applyZuckUltimate(gs, casterSide) {
  const enemySide = getEnemySide(casterSide);
  const caster = gs[casterSide];
  const enemy = gs[enemySide];

  const slots = Math.max(0, 7 - caster.board.length);
  const clones = enemy.board.slice(0, slots).map(src => {
    const kw = Array.isArray(src.keywords) ? [...src.keywords] : [];
    const immediate = kw.includes("charge") || kw.includes("rush");
    return {
      ...src,
      uid: mkUid(),
      summoningSick: !immediate,
      canAttack: immediate,
      attacksRemaining: immediate ? 1 : 0,
      rushOnlyThisTurn: kw.includes("rush") && !kw.includes("charge"),
    };
  });

  const cheapenedHand = caster.hand.map(c => ({ ...c, cost: Math.max(0, (c.cost || 0) - 1) }));
  const bumpedHand = enemy.hand.map(c => ({ ...c, cost: (c.cost || 0) + 1, zuckBump: true }));

  return recalculateAuras({
    ...gs,
    [casterSide]: { ...caster, board: [...caster.board, ...clones], hand: cheapenedHand },
    [enemySide]: { ...enemy, hand: bumpedHand },
  });
}

export function damageHero(gs, heroSide, amount) {
  if (amount <= 0) return gs;
  const res = consumeHeroDamage(gs, heroSide, amount);
  if (res.amount <= 0) return res.gs;
  return {
    ...res.gs,
    [heroSide]: applyHeroDamageWithArmor(res.gs[heroSide], res.amount),
  };
}

export function dealHeroDamageWithBoardCondition(gs, attackerSide, baseDamage, bonusDamage, enemyMustHaveNoMinions = true) {
  const enemySide = getEnemySide(attackerSide);
  const noEnemyMinions = gs[enemySide].board.length === 0;
  const damage = enemyMustHaveNoMinions && noEnemyMinions ? bonusDamage : baseDamage;
  return damageHero(gs, enemySide, damage);
}

export function destroyAllMinionsAndDamageBothHeroes(gs, amount, sourceSide = "player") {
  let next = destroyAllMinions(gs, sourceSide);
  next = damageHero(next, "player", amount);
  next = damageHero(next, "ai", amount);
  return next;
}

export function randomMultiAttack(gs, attackerUid, attackerSide, hits = 3) {
  let next = gs;
  for (let i = 0; i < hits; i += 1) {
    const attacker = next[attackerSide].board.find(m => m.uid === attackerUid);
    if (!attacker || attacker.hp <= 0 || (attacker.attacksRemaining ?? 0) <= 0) break;

    const enemySide = getEnemySide(attackerSide);
    const taunts = next[enemySide].board.filter(m => m.keywords?.includes("taunt"));
    const minionTargets = (taunts.length ? taunts : next[enemySide].board).filter(m => !m.keywords?.includes("elusive"));
    const canHitHero = !taunts.length && !attacker.rushOnlyThisTurn;
    const pool = [...minionTargets.map(m => m.uid), ...(canHitHero ? ["hero"] : [])];
    if (!pool.length) break;

    const target = pickRandom(pool);
    const result = doAttack(attackerUid, attackerSide, target, next);
    next = result.gs;
  }
  return next;
}

export function dealAoEAndDrawPerKill(gs, side, targetGroup, amount) {
  const enemySide = getEnemySide(side);
  const before = gs[enemySide].board.length;
  let next = dealDamageToAll(gs, targetGroup, amount, side);
  const after = next[enemySide].board.length;
  const destroyed = Math.max(0, before - after);
  if (destroyed > 0) next = drawCards(next, side, destroyed);
  return next;
}

export function summonRandomClassMinionsFromDeck(gs, side, className, count) {
  let next = gs;
  for (let i = 0; i < count; i += 1) {
    if (next[side].board.length >= 7) break;
    const candidates = next[side].deck.filter(c => c.type === "minion" && c.class === className);
    const picked = pickRandom(candidates);
    if (!picked) break;
    const deck = next[side].deck.filter(c => c.uid !== picked.uid);
    const minion = createMinionEntity(picked);
    next = { ...next, [side]: { ...next[side], deck, board: [...next[side].board, minion] } };
  }
  return recalculateAuras(next);
}

function runTriggerAction(gs, action, ownerSide, sourceSide, selfUid, log = []) {
  const enemySide = getEnemySide(ownerSide);
  const targetSide = action.target === "enemy" ? enemySide : ownerSide;
  const resolvedTargetId =
    action.targetIdFrom === "input_target"
      ? action.inputTargetId
      : action.targetIdFrom === "target_or_enemy_hero"
        ? (action.inputTargetId || `hero_${enemySide}`)
        : (action.targetId || selfUid);
  switch (action.type) {
    case "draw_cards":
      return drawCards(gs, targetSide, action.amount || 1);
    case "enemy_draw_cards":
      return enemyDrawCards(gs, ownerSide, action.amount || 1);
    case "reveal_hand":
      return revealHand(gs, enemySide, action.duration || "turn");
    case "summon_token":
      return summonToken(gs, targetSide, action.token || {}, action.count || 1);
    case "deal_damage":
      return dealDamage(gs, resolvedTargetId, action.amount || 0, sourceSide);
    case "deal_damage_all":
      return dealDamageToAll(gs, action.targetGroup || "enemy_minions", action.amount || 0, ownerSide);
    case "deal_damage_random_enemy_minion":
      return dealDamageRandomEnemyMinion(gs, ownerSide, action.amount || 0);
    case "destroy_random_enemy_minion": {
      const board = gs[enemySide].board || [];
      if (!board.length) return gs;
      const victim = pickRandom(board);
      if (!victim) return gs;
      return destroyMinion(gs, victim.uid, ownerSide);
    }
    case "add_card_to_hand": {
      if (gs[ownerSide].hand.length >= 10) return gs;
      let cardData = action.card || null;
      if (!cardData && action.cardId) {
        const lib = getLib();
        cardData = lib.find(c => c.id === action.cardId) || null;
      }
      if (!cardData) return gs;
      const fresh = { ...cardData, uid: mkUid() };
      return { ...gs, [ownerSide]: { ...gs[ownerSide], hand: [...gs[ownerSide].hand, fresh] } };
    }
    case "deal_aoe_draw_per_kill":
      return dealAoEAndDrawPerKill(gs, ownerSide, action.targetGroup || "all_enemies", action.amount || 1);
    case "buff_minion":
      return buffMinion(gs, resolvedTargetId, action.attackDelta || 0, action.healthDelta || 0, action.duration || "permanent", ownerSide);
    case "grant_immediate_attack":
      return grantImmediateAttack(gs, resolvedTargetId, action.targetMode || "any", action.attacks || 1);
    case "gain_mana_next_turn":
      return { ...gs, [ownerSide]: { ...gs[ownerSide], pendingManaNextTurn: (gs[ownerSide].pendingManaNextTurn || 0) + (action.amount || 1) } };
    case "look_at_top_choose_one": {
      const looked = lookAtTopCards(gs, ownerSide, action.count || 3);
      const chosen = chooseOneAndKeep(ownerSide, looked.cards);
      return removeChosenCardFromPreviewAndLeaveRestInDeck(looked.gs, ownerSide, chosen);
    }
    case "destroy_minion":
      return destroyMinion(gs, resolvedTargetId, ownerSide);
    case "destroy_minion_at_most_attack":
      return destroyMinionWithAttackAtMost(gs, resolvedTargetId, action.limit || 0, ownerSide);
    case "destroy_all_minions":
      return destroyAllMinions(gs, ownerSide);
    case "destroy_all_minions_damage_both_heroes":
      return destroyAllMinionsAndDamageBothHeroes(gs, action.amount || 0, ownerSide);
    case "damage_hero": {
      const heroSide = action.target === "self" ? ownerSide : enemySide;
      return damageHero(gs, heroSide, action.amount || 0);
    }
    case "damage_hero_with_board_condition":
      return dealHeroDamageWithBoardCondition(gs, ownerSide, action.baseDamage || 0, action.bonusDamage || 0, action.enemyMustHaveNoMinions !== false);
    case "copy_random_card_from_hand":
      return copyRandomCardFromHand(gs, enemySide, ownerSide);
    case "steal_random_card_from_hand":
      return stealRandomCardFromHand(gs, enemySide, ownerSide);
    case "take_control":
      return takeControlOfMinion(gs, resolvedTargetId, ownerSide, action.duration || "permanent", ownerSide, { keepOnKill: !!action.keepOnKill });
    case "random_multi_attack":
      return randomMultiAttack(gs, resolvedTargetId, ownerSide, action.hits || 3);
    case "summon_random_class_minions_from_deck":
      return summonRandomClassMinionsFromDeck(gs, ownerSide, action.className || "neutral", action.count || 1);
    case "if_friendly_minions_at_least": {
      if (gs[ownerSide].board.length >= (action.count || 0)) {
        let next = gs;
        for (const nested of action.then || []) next = runTriggerAction(next, { ...nested, inputTargetId: action.inputTargetId }, ownerSide, sourceSide, selfUid, log);
        return next;
      }
      return gs;
    }
    case "steal_top_enemy_deck_card": {
      const deck = gs[enemySide].deck;
      if (!deck.length || gs[ownerSide].hand.length >= 10) return gs;
      const top = deck[0];
      return {
        ...gs,
        [ownerSide]: { ...gs[ownerSide], hand: [...gs[ownerSide].hand, top] },
        [enemySide]: { ...gs[enemySide], deck: deck.slice(1) },
      };
    }
    case "eli_cohen_steal": {
      const selfMinion = (gs[ownerSide]?.board || []).find(m => m.uid === selfUid);
      const operator = selfMinion?.operatorSide || ownerSide;
      const victim = getEnemySide(operator);
      return stealRandomCardFromHand(gs, victim, operator);
    }
    case "heal_friendlies": {
      const amt = action.amount || 0;
      const p = gs[ownerSide];
      return {
        ...gs,
        [ownerSide]: {
          ...p,
          hp: Math.min(p.maxHp, p.hp + amt),
          board: p.board.map(m => ({ ...m, hp: Math.min(m.maxHp ?? m.hp, m.hp + amt) })),
        },
      };
    }
    case "mark_enemy_one_hp": {
      const eb = gs[enemySide].board;
      if (!eb.length) return gs;
      const t = pickRandom(eb);
      return updateMinion(gs, enemySide, t.uid, m => ({ ...m, hp: 1 }));
    }
    default:
      return gs;
  }
}

function triggerMinionHook(gs, hook, side, sourceSide, log = []) {
  let next = gs;
  const snapshot = [...next[side].board];
  for (const minion of snapshot) {
    const actions = getTriggerActions(minion, hook);
    if (!actions.length) continue;
    for (const action of actions) {
      next = runTriggerAction(next, action, side, sourceSide, minion.uid, log);
    }
    next = resolveDeaths(next, sourceSide, log);
  }
  return next;
}

export function startTurn(gs, side) {
  return recalculateAuras({
    ...gs,
    [side]: {
      ...gs[side],
      board: gs[side].board.map(m => {
        const ironDomeRefresh = m.keywords?.includes("iron_dome") ? { ironDomeReady: true } : {};
        if (m.frozenNextTurn) {
          return {
            ...normalizeMinionStats(m),
            summoningSick: false,
            canAttack: false,
            attacksRemaining: 0,
            rushOnlyThisTurn: false,
            frozenNextTurn: false,
            ...ironDomeRefresh,
          };
        }
        return {
          ...normalizeMinionStats(m),
          summoningSick: false,
          canAttack: true,
          attacksRemaining: m.attacksRemaining && m.attacksRemaining > 1 ? m.attacksRemaining : 1,
          rushOnlyThisTurn: false,
          ...ironDomeRefresh,
        };
      }),
    },
  });
}

export function resolveEndOfTurn(gs, side) {
  const log = [];
  let next = triggerMinionHook(gs, "end_of_turn", side, side, log);

  next = {
    ...next,
    player: {
      ...next.player,
      board: next.player.board.map(m => {
        if (m.tempAttackBonus && m.tempAttackExpiresOn === side) {
          return normalizeMinionStats({ ...m, tempAttackBonus: 0, tempAttackExpiresOn: null });
        }
        return normalizeMinionStats(m);
      }),
    },
    ai: {
      ...next.ai,
      board: next.ai.board.map(m => {
        if (m.tempAttackBonus && m.tempAttackExpiresOn === side) {
          return normalizeMinionStats({ ...m, tempAttackBonus: 0, tempAttackExpiresOn: null });
        }
        return normalizeMinionStats(m);
      }),
    },
  };

  next = returnTemporaryControl(next, side);

  // Restore Hustlers University -1 cost discount at end of the caster's turn.
  if (next[side].hand.some(c => c._hustlerDiscounted)) {
    next = {
      ...next,
      [side]: {
        ...next[side],
        hand: next[side].hand.map(c => {
          if (!c._hustlerDiscounted) return c;
          const { _hustlerDiscounted, _hustlerOrigCost, ...rest } = c;
          return { ...rest, cost: _hustlerOrigCost ?? (c.cost || 0) };
        }),
      },
    };
  }

  // Clear Zuck's "enemy cards cost +1 next turn" bump at end of the affected side's turn
  if (next[side].hand.some(c => c.zuckBump)) {
    next = {
      ...next,
      [side]: {
        ...next[side],
        hand: next[side].hand.map(c => {
          if (!c.zuckBump) return c;
          const { zuckBump: _zuckBump, ...rest } = c;
          return { ...rest, cost: Math.max(0, (c.cost || 0) - 1) };
        }),
      },
    };
  }

  const visibility = next.visibility || {};
  const cleared = { ...visibility };
  ["playerHandRevealed", "aiHandRevealed"].forEach(key => {
    if (visibility[`${key}Until`] === `end_of_${side}_turn`) {
      cleared[key] = false;
      cleared[`${key}Until`] = null;
    }
    const turnsKey = `${key}Turns`;
    if ((visibility[turnsKey] || 0) > 0) {
      const remaining = visibility[turnsKey] - 1;
      if (remaining <= 0) {
        cleared[key] = false;
        cleared[turnsKey] = 0;
        cleared[`${key}Until`] = null;
      } else {
        cleared[turnsKey] = remaining;
      }
    }
  });
  next = { ...next, visibility: cleared };

  // Decrement enemy hero shield (Iron Dome spell) so shield persists one full enemy turn.
  const enemySide = getEnemySide(side);
  if ((next[enemySide].heroShieldTurns || 0) > 0) {
    next = {
      ...next,
      [enemySide]: {
        ...next[enemySide],
        heroShieldTurns: Math.max(0, (next[enemySide].heroShieldTurns || 0) - 1),
      },
    };
  }

  // ── Total System Glitch (Biden ult) decay + chaos cost reroll ──────────────
  if ((next.totalSystemGlitchTurns || 0) > 0) {
    next = { ...next, totalSystemGlitchTurns: next.totalSystemGlitchTurns - 1 };
    if (next.totalSystemGlitchTurns <= 0) {
      // Restore original costs on both hands.
      ["player", "ai"].forEach(s => {
        next = {
          ...next,
          [s]: {
            ...next[s],
            hand: next[s].hand.map(c => {
              if (c._glitchOrigCost == null) return c;
              const { _glitchOrigCost, _glitchCostState, ...rest } = c;
              return { ...rest, cost: _glitchOrigCost };
            }),
          },
        };
      });
      log.push("✅ Total System Glitch ended. Costs restored.");
    } else {
      // Reroll all hand costs to a random value 0..10 with state markers.
      ["player", "ai"].forEach(s => {
        next = {
          ...next,
          [s]: {
            ...next[s],
            hand: next[s].hand.map(c => {
              const orig = c._glitchOrigCost != null ? c._glitchOrigCost : (c.cost || 0);
              const newCost = Math.floor(Math.random() * 11);
              const state = newCost > orig ? "high" : newCost < orig ? "low" : "neutral";
              return { ...c, cost: newCost, _glitchOrigCost: orig, _glitchCostState: state };
            }),
          },
        };
      });
    }
  }

  // ── Policy Change end-of-turn revert ───────────────────────────────────────
  if (next.policySwapActiveOn === side) {
    ["player", "ai"].forEach(s => {
      next = {
        ...next,
        [s]: {
          ...next[s],
          board: next[s].board.map(m => {
            if (!m._policySwap) return m;
            const { _policySwap, ...rest } = m;
            return normalizeMinionStats({
              ...rest,
              baseAtk: _policySwap.origAtk,
              hp: Math.min(_policySwap.origHp, m.hp),
              maxHp: _policySwap.origMax,
            });
          }),
        },
      };
    });
    next = { ...next, policySwapActiveOn: null };
    log.push("Policy Change reverted.");
  }

  // ── Hidden Effect (Behind The Scenes) — fires at end of caster's turn ───────
  const ownPending = next[side].pendingHiddenEffect;
  if (ownPending && ownPending.fireOn === getEnemySide(side)) {
    const roll = Math.floor(Math.random() * 4);
    if (roll === 0) {
      next = drawCards(next, side, 2);
      log.push("Behind The Scenes: drew 2.");
    } else if (roll === 1) {
      next = dealDamageToAll(next, "enemy_minions", 3, side);
      log.push("Behind The Scenes: 3 to enemy minions.");
    } else if (roll === 2) {
      next = damageHero(next, getEnemySide(side), 5);
      log.push("Behind The Scenes: 5 to enemy hero.");
    } else {
      next = summonToken(next, side, { id: "agent_token", name: "Secret Agent", atk: 4, hp: 4, type: "minion", rarity: "rare", class: "USA!", emoji: "🕴️", keywords: [] }, 1);
      log.push("Behind The Scenes: 4/4 Agent summoned.");
    }
    next = { ...next, [side]: { ...next[side], pendingHiddenEffect: null } };
  }

  // ── Bezos Ascension cleanup: when all summons dead, hero is targetable again ─
  ["player", "ai"].forEach(s => {
    if (next[s].bezosAscension) {
      const stillAscending = (next[s].board || []).some(m => m.bezosAscensionToken);
      if (!stillAscending) {
        next = { ...next, [s]: { ...next[s], bezosAscension: false } };
        log.push("Bezos returns from space.");
      }
    }
  });

  next = resolveDeaths(next, side, log);
  return { gs: recalculateAuras(next), log };
}

function resolveOnEnemySpellCast(gs, casterSide, log = []) {
  const enemySide = getEnemySide(casterSide);
  return triggerMinionHook(gs, "on_enemy_spell_cast", enemySide, casterSide, log);
}

const SPELL_EFFECT_MAP = {
  viral_clip: [{ type: "draw_cards", amount: 2 }],
  ragebait: [{ type: "deal_damage", amount: 3, targetIdFrom: "target_or_enemy_hero" }, { type: "enemy_draw_cards", amount: 1 }],
  doomscroll: [{ type: "look_at_top_choose_one", count: 5 }],
  energy_drink: [{ type: "buff_minion", attackDelta: 2, healthDelta: 0, duration: "turn", targetIdFrom: "input_target" }, { type: "grant_immediate_attack", targetIdFrom: "input_target", targetMode: "any" }],
  uav_recon: [{ type: "copy_random_card_from_hand" }, { type: "deal_damage_all", targetGroup: "all_enemies", amount: 1 }],
  cia_infiltration: [{ type: "steal_random_card_from_hand" }],
  signal_intercept: [{ type: "copy_random_card_from_hand" }, { type: "draw_cards", amount: 1 }],
  fbi_raid: [{ type: "destroy_minion_at_most_attack", targetIdFrom: "input_target", limit: 3 }],
  shadow_government_laptop: [{ type: "steal_random_card_from_hand" }, { type: "draw_cards", amount: 1 }],
  shock_and_awe: [{ type: "deal_damage_all", targetGroup: "all_enemies", amount: 2 }, { type: "summon_token", count: 3, token: { id: "troop_token", name: "Troop", atk: 2, hp: 1, class: "usa", keywords: [] } }],
  operation_paperclip_2_0: [{ type: "take_control", targetIdFrom: "input_target", duration: "permanent" }],
  red_button: [{ type: "damage_hero_with_board_condition", baseDamage: 6, bonusDamage: 10, enemyMustHaveNoMinions: true }],
  the_nuke: [{ type: "destroy_all_minions_damage_both_heroes", amount: 10 }],
  neural_link: [{ type: "copy_random_card_from_hand" }],
  autopilot_swarm: [{ type: "summon_token", count: 4, token: { id: "rush_bot", name: "Bot", atk: 1, hp: 1, class: "tech", keywords: ["rush"] } }],
  satellite_grid: [{ type: "deal_aoe_draw_per_kill", targetGroup: "all_enemies", amount: 1 }],
  launch_window: [{ type: "buff_minion", attackDelta: 3, healthDelta: 0, duration: "turn", targetIdFrom: "input_target" }, { type: "grant_immediate_attack", targetIdFrom: "input_target", targetMode: "any" }],
  x_rebrand_control: [{ type: "take_control", targetIdFrom: "input_target", duration: "turn", keepOnKill: true }],
  liquidation_acquisition: [{ type: "take_control", targetIdFrom: "input_target", duration: "permanent" }],
  hyperloop_burst: [{ type: "random_multi_attack", targetIdFrom: "input_target", hits: 3 }],
  mars_colony_protocol: [{ type: "summon_random_class_minions_from_deck", className: "tech", count: 5 }],
};

export function applySpell(effect, targetId, gs, side, sourceCard = null) {
  const log = [];
  const enemy = side === "player" ? "ai" : "player";

  // Bureaucratic Delay: enemy applied a flag to caster's side. Fizzle or double.
  let bureaucraticDouble = false;
  if (gs[side].bureaucraticFlag && !sourceCard?._bureaucraticEcho) {
    const flag = gs[side].bureaucraticFlag;
    gs = { ...gs, [side]: { ...gs[side], bureaucraticFlag: null } };
    if (flag === "fizzle") {
      log.push("Bureaucratic Delay: spell FIZZLED.");
      return { gs, log };
    }
    if (flag === "double") bureaucraticDouble = true;
  }

  // Total System Glitch (Biden ult): retarget every targeted spell to a random valid character.
  if ((gs.totalSystemGlitchTurns || 0) > 0 && targetId) {
    const allTargets = [
      "hero_player",
      "hero_ai",
      ...gs.player.board.map(m => m.uid),
      ...gs.ai.board.map(m => m.uid),
    ];
    if (allTargets.length) {
      const reroll = allTargets[Math.floor(Math.random() * allTargets.length)];
      if (reroll !== targetId) {
        log.push(`⚡ GLITCH! Retargeted to ${reroll === "hero_player" ? "Player Hero" : reroll === "hero_ai" ? "Enemy Hero" : "random minion"}.`);
        targetId = reroll;
      }
    }
  }

  // Elusive guard: spells from the opposing side cannot target an elusive minion.
  // Friendly buffs are still allowed — only block when the target belongs to the enemy.
  if (targetId && typeof targetId === "string" && targetId !== "hero" && !targetId.startsWith("hero_")) {
    const enemyBoard = gs[enemy]?.board || [];
    const enemyTarget = enemyBoard.find(m => m.uid === targetId);
    if (enemyTarget && (enemyTarget.keywords?.includes("elusive") || enemyTarget.keywords?.includes("stealth"))) {
      return { gs, log: ["Elusive — can't be targeted by spells."] };
    }
  }

  function dmg(id, n) {
    gs = dealDamage(gs, id, n, side);
    if (id === "hero_player") log.push("player_hero_hit");
    else if (id === "hero_ai") log.push("ai_hero_hit");
    else log.push("minion_hit");
  }

  const structuredType = sourceCard?.effectType;
  if (structuredType) {
    const p = sourceCard.effectParams || {};
    if (structuredType === "damage_target") {
      if (!targetId) log.push("Unsupported: damage_target requires target.");
      else gs = dealDamage(gs, targetId, p.amount || 0, side);
    } else if (structuredType === "damage_all_enemy_minions") {
      gs = dealDamageToAll(gs, "enemy_minions", p.amount || 0, side);
    } else if (structuredType === "damage_all_enemies") {
      gs = dealDamageToAll(gs, "all_enemies", p.amount || 0, side);
    } else if (structuredType === "draw_cards") {
      gs = drawCards(gs, side, p.amount || 1);
    } else if (structuredType === "summon_token") {
      gs = summonToken(gs, side, p.token || {}, p.count || 1);
    } else if (structuredType === "buff_friendly_minion") {
      if (!targetId) log.push("Unsupported: buff_friendly_minion requires target.");
      else gs = buffMinion(gs, targetId, p.attackDelta || 0, p.healthDelta || 0, p.duration || "permanent", side);
    } else if (structuredType === "destroy_target") {
      if (!targetId) log.push("Unsupported: destroy_target requires target.");
      else gs = destroyMinion(gs, targetId, side);
    } else {
      log.push(`Unsupported effectType: ${structuredType}`);
    }
    gs = resolveOnEnemySpellCast(gs, side, log);
    gs = resolveDeaths(gs, side, log);
    return { gs, log };
  }

  const effectKey = sourceCard?.effectId || effect;
  const mapped = SPELL_EFFECT_MAP[effectKey];
  if (mapped) {
    for (const action of mapped) {
      gs = runTriggerAction(gs, { ...action, inputTargetId: targetId }, side, side, targetId, log);
    }
  } else if (effect === "damage4") {
    dmg(targetId, 4);
  } else if (effect === "damage3split") {
    const targets = ["hero_" + enemy, ...gs[enemy].board.map(m => m.uid)];
    for (let i = 0; i < 3; i++) if (targets.length) dmg(pickRandom(targets), 1);
    log.push("NFT crash!");
  } else if (effect === "heal8") {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 8) } };
    log.push("Healed 8 HP!");
  } else if (effect === "destroy") {
    gs = destroyMinion(gs, targetId, side);
    log.push("Cancelled!");
  } else if (effect === "polymorph") {
    ["player", "ai"].forEach(s => {
      if (gs[s].board.find(m => m.uid === targetId)) {
        gs = updateMinion(gs, s, targetId, m => normalizeMinionStats({ ...m, baseAtk: 1, hp: 1, maxHp: 1, name: "Boomer", keywords: [], desc: "Ok boomer." }));
        log.push("Transformed to Boomer!");
      }
    });
  } else if (effect === "buff33") {
    gs = buffMinion(gs, targetId, 3, 3, "permanent", side);
    log.push("+3/+3 Slay!");
  } else if (effect === "vibe_check") {
    gs = damageHero(gs, "player", 3);
    gs = damageHero(gs, "ai", 3);
    gs = dealDamageToAll(gs, "all_minions", 3, side);
    log.push("Vibe check! -3 all!");
  } else if (effect === "flamestrike") {
    gs = dealDamageToAll(gs, "all_enemies", 4, side);
    log.push("It's giving 4 to all enemies!");
  } else if (effect === "fake_news") {
    ["player", "ai"].forEach(s => {
      if (gs[s].board.find(m => m.uid === targetId)) {
        gs = updateMinion(gs, s, targetId, m => normalizeMinionStats({ ...m, baseAtk: Math.max(0, (m.baseAtk ?? m.atk) - 3) }));
        log.push("Silenced by fake news!");
      }
    });
  } else if (effect === "tariff") {
    gs = dealDamageToAll(gs, "enemy_minions", 2, side);
    log.push("Tariff hits all enemies for 2!");
  } else if (effect === "buff22") {
    gs = buffMinion(gs, targetId, 2, 2, "permanent", side);
    log.push("+2/+2 Doge pump!");
  } else if (effect === "x_rebrand") {
    ["player", "ai"].forEach(s => {
      if (gs[s].board.find(m => m.uid === targetId)) {
        gs = updateMinion(gs, s, targetId, m => normalizeMinionStats({ ...m, name: "X", baseAtk: (m.baseAtk ?? m.atk) + 1, hp: m.hp + 1, maxHp: m.maxHp + 1 }));
        log.push("Rebranded to X!");
      }
    });
  } else if (effect === "layoffs") {
    ["player", "ai"].forEach(s => {
      gs = { ...gs, [s]: { ...gs[s], board: gs[s].board.map(m => (m.atk <= 2 ? { ...m, hp: 0 } : m)) } };
    });
    gs = resolveDeaths(gs, side);
    log.push("Low performers cut!");
  } else if (effect === "summon_gymbros") {
    gs = summonToken(gs, side, { id: "gymbro", name: "Gymbro", cost: 3, atk: 3, hp: 3, type: "minion", rarity: "common", keywords: [], class: "neutral", effect: "" }, 3);
    log.push("Three Gymbros!");
  } else if (effect === "mrbeast_check") {
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 5 } };
    gs = drawCards(gs, side, 1);
    log.push("+5 Armor. Drew a card.");
  } else if (effect === "ten_k_giveaway") {
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 10 } };
    gs = drawCards(gs, side, 2);
    log.push("+10 Armor. Drew 2. Chat rewarded.");
  } else if (effect === "hundred_days") {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 20) } };
    gs = drawCards(gs, side, 3);
    log.push("Restored 20 HP. Drew 3.");
  } else if (effect === "squid_rlgl") {
    ["player", "ai"].forEach(s => {
      gs = { ...gs, [s]: { ...gs[s], board: gs[s].board.map(m => (m.atk <= 4 ? { ...m, hp: 0 } : m)) } };
    });
    gs = resolveDeaths(gs, side);
    log.push("Red light. Green light. Nobody's fast enough.");
  } else if (effect === "last_to_leave") {
    const weakest = gs[enemy].board.slice().sort((a, b) => (a.atk + a.hp) - (b.atk + b.hp))[0];
    if (weakest) gs = destroyMinion(gs, weakest.uid, side);
    if (targetId) gs = buffMinion(gs, targetId, 5, 5, "permanent", side);
    log.push("Weakest enemy eliminated. +5/+5 to survivor.");
  } else if (effect === "philanthropy_arc") {
    gs = summonToken(gs, side, { id: "giant_check", name: "Giant Check", cost: 7, atk: 10, hp: 10, type: "minion", rarity: "legendary", keywords: ["taunt"], class: "Viral" }, 1);
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 10) } };
    log.push("Giant Check summoned. +10 HP.");
  } else if (effect === "subscribe_spell") {
    if (gs[enemy].deck.length > 0 && gs[side].hand.length < 10) {
      const picked = pickRandom(gs[enemy].deck);
      if (picked) {
        gs = { ...gs, [side]: { ...gs[side], hand: [...gs[side].hand, { ...picked, uid: mkUid() }] } };
        log.push("Subscribed! Copied a card from enemy deck.");
      }
    }
  } else if (effect === "bitch_lasagna") {
    gs = damageHero(gs, enemy, 8);
    gs = dealDamageToAll(gs, "enemy_minions", 8, side);
    gs = drawCards(gs, side, 6);
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 30) } };
    gs = summonToken(gs, enemy, { id: "tseries_tower", name: "T-Series Content Tower", cost: 8, atk: 2, hp: 40, type: "minion", rarity: "legendary", keywords: ["taunt", "elusive"], class: "Viral" }, 1);
    log.push("T-series ain't nothing but a 🍝");
  } else if (effect === "cigar_night") {
    gs = damageHero(gs, side, 10);
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, board: p.board.map(m => normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 8, hp: m.hp + 8, maxHp: (m.maxHp ?? m.hp) + 8 })) } };
    gs = drawCards(gs, side, 1);
    log.push("Cigar Night! +8/+8 to all friendly. -10 HP to hero.");
  } else if (effect === "celebrity_security") {
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 10 } };
    gs = summonToken(gs, side, { id: "security_team", name: "A-Level Security Team", cost: 4, atk: 4, hp: 8, type: "minion", rarity: "rare", keywords: ["taunt", "cant_attack_hero"], class: "Viral" }, 4);
    log.push("+10 Armor. 4 Security summoned. Can't attack hero.");
  } else if (effect === "draw2") {
    gs = drawCards(gs, side, 2);
    log.push("Drew 2 cards.");
  } else if (effect === "damage_all_minions_2") {
    gs = dealDamageToAll(gs, "all_minions", 2, side);
    log.push("2 damage to all minions.");
  } else if (effect === "barrels_3x2_random") {
    for (let i = 0; i < 3; i += 1) {
      const targets = [`hero_${enemy}`, ...gs[enemy].board.map(m => m.uid)];
      const tid = pickRandom(targets);
      if (tid) gs = dealDamage(gs, tid, 2, side);
    }
    log.push("BARRELS!!! 3x 2 damage random.");
  } else if (effect === "pump_all_11") {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, board: p.board.map(m => normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 1, hp: m.hp + 1, maxHp: (m.maxHp ?? m.hp) + 1 })) } };
    log.push("All friendly minions +1/+1.");
  } else if (effect === "temp_atk2") {
    if (targetId) gs = buffMinion(gs, targetId, 2, 0, "turn", side);
    log.push("+2 Attack this turn.");
  } else if (effect === "temp_atk3_permanent") {
    if (targetId) gs = buffMinion(gs, targetId, 3, 0, "permanent", side);
    log.push("+3 Attack.");
  } else if (effect === "discard_self_draw3") {
    const p = gs[side];
    if (p.hand.length > 0) {
      const discard = pickRandom(p.hand);
      gs = { ...gs, [side]: { ...p, hand: p.hand.filter(c => c.uid !== discard.uid) } };
      gs = recordDiscard(gs, side, discard, "Discard");
    }
    gs = drawCards(gs, side, 3);
    log.push("Discarded 1. Drew 3.");
  } else if (effect === "welcome_real_world") {
    gs = drawCards(gs, side, 2);
    log.push("Welcome to the Real World. Drew 2.");
  } else if (effect === "damage2_draw1") {
    if (targetId) gs = dealDamage(gs, targetId, 2, side);
    gs = drawCards(gs, side, 1);
    log.push("2 damage. Drew 1.");
  } else if (effect === "damage2_any") {
    if (targetId) gs = dealDamage(gs, targetId, 2, side);
    log.push("2 damage.");
  } else if (effect === "copy_enemy_hand_card") {
    gs = copyRandomCardFromHand(gs, enemy, side);
    log.push("Copied enemy card.");
  } else if (effect === "destroy_and_lock_ult2") {
    if (targetId) gs = destroyMinion(gs, targetId, side);
    gs = { ...gs, [enemy]: { ...gs[enemy], ultimateLockedTurns: (gs[enemy].ultimateLockedTurns || 0) + 2 } };
    log.push("Destroyed + enemy Ultimate locked for 2 turns.");
  } else if (effect === "buff_plus_taunt") {
    if (targetId) {
      ["player", "ai"].forEach(s => {
        if (gs[s].board.find(m => m.uid === targetId)) {
          gs = updateMinion(gs, s, targetId, m => normalizeMinionStats({ ...m, hp: m.hp + 3, maxHp: (m.maxHp ?? m.hp) + 3, keywords: m.keywords?.includes("taunt") ? m.keywords : [...(m.keywords || []), "taunt"] }));
        }
      });
    }
    log.push("+3 HP + Taunt.");
  } else if (effect === "armor8_next_spell_discount2") {
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 8 } };
    log.push("+8 Armor.");
  } else if (effect === "draw3_viral_discount1_turn") {
    const before = gs[side].hand.length;
    gs = drawCards(gs, side, 3);
    const afterHand = gs[side].hand;
    // Discount ONLY the freshly drawn cards (those appended after `before`), mark so end-of-turn restores cost.
    const discountedHand = afterHand.map((c, idx) => {
      if (idx < before) return c;
      if (c._hustlerDiscounted) return c;
      const orig = c.cost || 0;
      return { ...c, _hustlerOrigCost: orig, cost: Math.max(0, orig - 1), _hustlerDiscounted: true };
    });
    gs = { ...gs, [side]: { ...gs[side], hand: discountedHand } };
    log.push("Drew 3 Viral cards (-1 cost this turn).");
  } else if (effect === "romanian_compound_rework") {
    const gate = { id: "romanian_gate_token", name: "Compound Gate", cost: 5, atk: 2, hp: 8, type: "minion", rarity: "rare", keywords: ["taunt"], class: "Viral", token: true, emoji: "🚪", desc: "Taunt." };
    gs = summonToken(gs, side, gate, 1);
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 5 } };
    gs = drawCards(gs, side, 1);
    log.push("+5 Armor. 2/8 Gate deployed (Taunt). Drew 1.");
  } else if (effect === "peek_enemy_deck_3_draw1") {
    const preview = gs[enemy].deck.slice(0, 3).map(c => c.id);
    gs = { ...gs, visibility: { ...(gs.visibility || {}), enemyDeckPeek: preview } };
    gs = drawCards(gs, side, 1);
    log.push("Peeked top 3 of enemy deck. Drew 1.");
  } else if (effect === "prism_protocol") {
    gs = revealHand(gs, enemy, "turn");
    gs = copyRandomCardFromHand(gs, enemy, side);
    log.push("Revealed enemy hand. Copied a random card.");
  } else if (effect === "sacrifice_draw2") {
    if (targetId) gs = destroyMinion(gs, targetId, side);
    gs = drawCards(gs, side, 2);
    log.push("Sacrificed. Drew 2.");
  } else if (effect === "hawaii_bunker") {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 10), armor: (p.armor || 0) + 5 } };
    gs = drawCards(gs, side, 1);
    log.push("+10 HP, +5 Armor. Drew 1.");
  } else if (effect === "algo_tweak") {
    const eh = gs[enemy].hand;
    if (eh.length > 0) {
      const d1 = pickRandom(eh);
      let remaining = eh.filter(c => c.uid !== d1.uid);
      const d2 = remaining.length ? pickRandom(remaining) : null;
      remaining = d2 ? remaining.filter(c => c.uid !== d2.uid) : remaining;
      gs = { ...gs, [enemy]: { ...gs[enemy], hand: remaining } };
      if (d1) gs = recordDiscard(gs, enemy, d1, "Algo Tweak");
      if (d2) gs = recordDiscard(gs, enemy, d2, "Algo Tweak");
    }
    // Apply -2 cost to every card currently in caster's hand (but not the played algo_tweak — already removed).
    // First card played consumes the effect: on play, remaining discounted cards are restored.
    const discountedHand = gs[side].hand.map(c => {
      if (c._algoDiscounted) return c;
      const orig = c.cost || 0;
      return { ...c, _algoOrigCost: orig, cost: Math.max(0, orig - 2), _algoDiscounted: true };
    });
    gs = { ...gs, [side]: { ...gs[side], hand: discountedHand, algoTweakActive: true } };
    log.push("Enemy discarded 2. Your hand -2 cost (next card played consumes).");
  } else if (effect === "grant_dshield_stealth") {
    if (targetId) {
      ["player", "ai"].forEach(s => {
        if (gs[s].board.find(m => m.uid === targetId)) {
          gs = updateMinion(gs, s, targetId, m => {
            const kw = Array.isArray(m.keywords) ? [...m.keywords] : [];
            if (!kw.includes("divine_shield")) kw.push("divine_shield");
            if (!kw.includes("elusive")) kw.push("elusive");
            return normalizeMinionStats({ ...m, keywords: kw });
          });
        }
      });
    }
    log.push("Divine Shield + Stealth.");
  } else if (effect === "silence_freeze") {
    if (targetId) gs = silenceMinion(gs, targetId, side);
    log.push("Silenced. Can't attack next turn.");
  } else if (effect === "bounce_cost_plus3") {
    if (targetId) gs = bounceMinionToHand(gs, targetId, 3, side);
    log.push("Bounced. Costs (3) more.");
  } else if (effect === "beast_games") {
    const casts = (gs[side].beastGamesCasts || 0) + 1;
    if (casts < 2) {
      gs = { ...gs, [side]: { ...gs[side], beastGamesCasts: casts } };
      log.push(`Beast Games cast ${casts}/2. Cast again to trigger.`);
    } else {
      gs = triggerBeastGamesRestart(gs);
      log.push("BEAST GAMES ACTIVATED. Match restarted.");
    }
  } else if (effect === "judicial_reform") {
    if (targetId) gs = silenceMinion(gs, targetId, side);
    gs = drawCards(gs, side, 1);
    log.push("Judicial Reform: silenced + drew 1.");
  } else if (effect === "knesset_speech") {
    if (targetId) {
      gs = buffMinion(gs, targetId, 2, 2, "permanent", side);
      ["player", "ai"].forEach(s => {
        if (gs[s].board.find(m => m.uid === targetId)) {
          gs = updateMinion(gs, s, targetId, m => {
            const kw = Array.isArray(m.keywords) ? [...m.keywords] : [];
            if (!kw.includes("elusive")) kw.push("elusive");
            return normalizeMinionStats({ ...m, keywords: kw });
          });
        }
      });
    }
    log.push("Knesset yap sesh: +2/+2 + Elusive.");
  } else if (effect === "bibi_indictment") {
    if (targetId) {
      const tgt = gs[enemy].board.find(m => m.uid === targetId);
      if (tgt && (tgt.atk ?? 0) <= 3) {
        gs = destroyMinion(gs, targetId, side);
        log.push("Indictment: destroyed.");
      } else {
        log.push("Target Attack too high.");
      }
    }
  } else if (effect === "iron_dome_shield") {
    gs = {
      ...gs,
      [side]: {
        ...gs[side],
        armor: (gs[side].armor || 0) + 5,
        heroShieldTurns: Math.max(gs[side].heroShieldTurns || 0, 1),
      },
    };
    log.push("Iron Dome up! Hero shielded + 5 Armor.");
  } else if (effect === "mandatory_service_spell") {
    const before = gs[side].board.length;
    const boost = gs[side].board.length >= 3;
    const conscript = {
      id: "conscript_token",
      name: "Conscript",
      cost: 1,
      atk: 1,
      hp: 2,
      type: "minion",
      rarity: "common",
      keywords: [],
      class: "Israel",
      token: true,
    };
    gs = summonToken(gs, side, conscript, 3);
    if (boost) {
      const summoned = gs[side].board.slice(before);
      for (const m of summoned) {
        gs = buffMinion(gs, m.uid, 1, 1, "permanent", side);
      }
      log.push("3 Conscripts +1/+1 (you had 3+ minions).");
    } else {
      log.push("3 Conscripts drafted.");
    }
  } else if (effect === "f35_strike") {
    const dmgAmount = 6;
    if (targetId) {
      const tgt = gs[enemy].board.find(m => m.uid === targetId);
      if (tgt) {
        const overflow = Math.max(0, dmgAmount - tgt.hp);
        gs = dealDamage(gs, targetId, dmgAmount, side);
        if (overflow > 0) {
          gs = damageHero(gs, enemy, overflow);
          log.push(`F-35 Strike: ${dmgAmount} to minion, ${overflow} overflow to hero.`);
        } else {
          log.push(`F-35 Strike: ${dmgAmount} damage.`);
        }
      }
    }
  } else if (effect === "exploding_pager") {
    let hits = 0;
    const hitUids = new Set();
    while (hits < 3) {
      const pool = gs[enemy].board.filter(m => !hitUids.has(m.uid));
      if (!pool.length) break;
      const pick = pickRandom(pool);
      const prevBoardLen = gs[enemy].board.length;
      hitUids.add(pick.uid);
      gs = dealDamage(gs, pick.uid, 3, side);
      hits += 1;
      const nowLen = gs[enemy].board.length;
      if (nowLen >= prevBoardLen) break;
    }
    log.push(`Pager chain: ${hits} hit(s).`);
  } else if (effect === "honey_trap") {
    if (targetId) {
      gs = takeControlOfMinion(gs, targetId, side, "turn", side, { keepOnKill: false });
      const controlled = gs[side].board.find(m => m.uid === targetId);
      if (controlled) {
        gs = updateMinion(gs, side, targetId, m => ({
          ...m,
          summoningSick: false,
          canAttack: true,
          attacksRemaining: Math.max(m.attacksRemaining || 0, 1),
        }));
        const atk = controlled.atk || 0;
        gs = damageHero(gs, enemy, atk);
        log.push(`Honey trap: they hit their own hero for ${atk}.`);
      }
    }
  } else if (effect === "false_flag_op") {
    const eh = gs[enemy].hand;
    let remaining = eh;
    for (let i = 0; i < 2; i += 1) {
      if (!remaining.length) break;
      const d = pickRandom(remaining);
      remaining = remaining.filter(c => c.uid !== d.uid);
    }
    gs = { ...gs, [enemy]: { ...gs[enemy], hand: remaining } };
    gs = drawCards(gs, side, 1);
    log.push("False flag: enemy dumped 2. You drew 1.");
  } else if (effect === "cia_blacksite") {
    const pool = gs[enemy].hand;
    if (pool.length) {
      gs = openDiscover(gs, { side, pool, action: "destroy_from_enemy_hand", sourceLabel: "Blacksite", count: Math.min(3, pool.length) });
      log.push("Blacksite: Discover 3 enemy hand — destroy 1.");
    } else log.push("Enemy hand empty.");
  } else if (effect === "cia_extraordinary_rendition") {
    if (gs[side].hand.length >= 10) {
      log.push("Hand full — steal refused.");
    } else if (!gs[enemy].hand.length) {
      log.push("Enemy hand empty.");
    } else {
      const picked = pickRandom(gs[enemy].hand);
      gs = {
        ...gs,
        [side]: { ...gs[side], hand: [...gs[side].hand, picked] },
        [enemy]: { ...gs[enemy], hand: gs[enemy].hand.filter(c => c.uid !== picked.uid) },
      };
      log.push(`Extraordinary Rendition: stole ${picked.name}.`);
    }
  } else if (effect === "cia_wiretap") {
    gs = revealHand(gs, enemy, "turn");
    const vis = gs.visibility || {};
    gs = { ...gs, visibility: { ...vis, aiHandRevealedTurns: 3, aiHandRevealed: true } };
    gs = drawCards(gs, side, 1);
    log.push("Wiretap: enemy hand revealed 3 turns. Drew 1.");
  } else if (effect === "cia_asset_recruitment") {
    const pool = gs[enemy].deck.slice(0, Math.min(3, gs[enemy].deck.length));
    if (pool.length) {
      gs = openDiscover(gs, { side, pool, action: "copy_from_enemy_deck_to_hand", sourceLabel: "Asset Recruitment", count: pool.length });
      log.push(`Asset Recruitment: Discover top ${pool.length} enemy deck — copy 1.`);
    } else log.push("Enemy deck empty.");
  } else if (effect === "cia_drone_strike") {
    const enemyBoard = gs[enemy].board.map(m => m.uid);
    for (const uid of enemyBoard) gs = dealDamage(gs, uid, 4, side);
    log.push("Drone Strike: 4 damage to all enemy minions.");
  } else if (effect === "cia_psyop") {
    gs = revealHand(gs, enemy, "turn");
    const eh = gs[enemy].hand;
    if (eh.length) {
      const d = pickRandom(eh);
      gs = { ...gs, [enemy]: { ...gs[enemy], hand: eh.filter(c => c.uid !== d.uid) } };
      gs = recordDiscard(gs, enemy, d, "Psyop");
      log.push(`Psyop: revealed enemy hand. They discarded ${d.name}.`);
    } else {
      log.push("Psyop: enemy hand revealed, but nothing to discard.");
    }
  } else if (effect === "cia_classified_memo") {
    const preview = gs[enemy].deck.slice(0, 3).map(c => c.id);
    gs = { ...gs, visibility: { ...(gs.visibility || {}), enemyDeckPeek: preview } };
    gs = drawCards(gs, side, 1);
    log.push("Classified Memo: peeked top 3 enemy deck. Drew 1.");
  } else if (effect === "cia_uav_recon") {
    const pool = gs[enemy].hand;
    if (pool.length) {
      gs = openDiscover(gs, { side, pool, action: "copy_from_enemy_hand_to_hand", sourceLabel: "UAV Recon", count: Math.min(3, pool.length) });
      log.push(`UAV Recon: Discover ${Math.min(3, pool.length)} from enemy hand — copy 1.`);
    } else log.push("UAV Recon: enemy hand empty.");
  } else if (effect === "mk_ultra_test") {
    if (!targetId || typeof targetId !== "string" || targetId === "hero" || targetId.startsWith("hero_")) {
      log.push("MK-Ultra Test: pick an enemy minion.");
    } else {
      const target = gs[enemy].board.find(m => m.uid === targetId);
      if (!target) {
        log.push("MK-Ultra Test: target gone.");
      } else if ((target.atk ?? 0) > 3) {
        log.push("MK-Ultra Test: target has more than 3 Attack — refused.");
      } else if (gs[side].board.length >= 7) {
        log.push("MK-Ultra Test: your board is full.");
      } else {
        gs = takeControlOfMinion(gs, targetId, side, "turn", side, { keepOnKill: false });
        log.push(`MK-Ultra Test: brain-pilled ${target.name} for the turn.`);
      }
    }
  } else if (effect === "skibidi_bomb") {
    gs = dealDamageToAll(gs, "enemy_minions", 3, side);
    log.push("Skibidi Bomb: 3 damage to all enemy minions.");
  } else if (effect === "customer_data") {
    gs = revealHand(gs, enemy, "turn");
    gs = drawCards(gs, side, 1);
    log.push("Customer Data: revealed enemy hand. Drew 1.");
  } else if (effect === "subscription_trap") {
    gs = { ...gs, [enemy]: { ...gs[enemy], pendingManaNextTurn: (gs[enemy].pendingManaNextTurn || 0) - 2 } };
    log.push("Subscription Trap: -2 enemy Aura next turn.");
  } else if (effect === "clone_product") {
    if (gs[enemy].board.length > 0 && gs[side].hand.length < 10) {
      const picked = pickRandom(gs[enemy].board);
      const clone = {
        id: picked.id,
        name: picked.name,
        cost: Math.max(0, (picked.cost || 0) - 1),
        atk: picked.baseAtk ?? picked.atk ?? 0,
        hp: picked.maxHp ?? picked.hp ?? 1,
        type: "minion",
        rarity: picked.rarity || "common",
        class: picked.class || "neutral",
        keywords: Array.isArray(picked.keywords) ? [...picked.keywords] : [],
        desc: picked.desc || "",
        emoji: picked.emoji || "",
        uid: mkUid(),
      };
      gs = { ...gs, [side]: { ...gs[side], hand: [...gs[side].hand, clone] } };
      log.push(`Clone Product: copied ${picked.name} (-1 cost).`);
    } else {
      log.push("Clone Product: no enemy minion or hand full.");
    }
  } else if (effect === "aws_outage") {
    const enemyMinions = gs[enemy].board.slice();
    for (const m of enemyMinions) gs = silenceMinion(gs, m.uid, side);
    log.push("AWS Outage: silenced all enemy minions.");
  } else if (effect === "press_conference") {
    const roll = Math.floor(Math.random() * 4);
    if (roll === 0) {
      const p = gs[side];
      gs = { ...gs, [side]: { ...p, board: p.board.map(m => normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 2, hp: m.hp + 2, maxHp: (m.maxHp ?? m.hp) + 2 })) } };
      log.push("Press Conference: friendlies +2/+2!");
    } else if (roll === 1) {
      gs = dealDamageToAll(gs, "enemy_minions", 2, side);
      log.push("Press Conference: enemies hit for 2.");
    } else if (roll === 2) {
      gs = summonToken(gs, side, { id: "press_token", name: "Reporter", atk: 3, hp: 3, type: "minion", rarity: "common", class: "USA!", emoji: "🎤", keywords: [] }, 1);
      log.push("Press Conference: 3/3 Reporter summoned!");
    } else {
      log.push("Press Conference: …no comment.");
    }
  } else if (effect === "bureaucratic_delay") {
    const flip = Math.random() < 0.5;
    gs = { ...gs, [enemy]: { ...gs[enemy], bureaucraticFlag: flip ? "fizzle" : "double" } };
    log.push(flip ? "Bureaucratic Delay: enemy's next card fizzles." : "Bureaucratic Delay: enemy's next card double-triggers.");
  } else if (effect === "behind_scenes") {
    gs = { ...gs, [side]: { ...gs[side], pendingHiddenEffect: { fireOn: enemy } } };
    log.push("Behind The Scenes: hidden effect armed…");
  } else if (effect === "lobbyists") {
    const sidePicked = Math.random() < 0.5 ? side : enemy;
    const p = gs[sidePicked];
    gs = { ...gs, [sidePicked]: { ...p, board: p.board.map(m => normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 1, hp: m.hp + 1, maxHp: (m.maxHp ?? m.hp) + 1 })) } };
    log.push(`Lobbyists: ${sidePicked === side ? "your" : "enemy"} minions +1/+1.`);
  } else if (effect === "policy_change") {
    ["player", "ai"].forEach(s => {
      gs = {
        ...gs,
        [s]: {
          ...gs[s],
          board: gs[s].board.map(m => {
            const a = m.baseAtk ?? m.atk ?? 0;
            const h = m.hp ?? 0;
            return normalizeMinionStats({
              ...m,
              _policySwap: { origAtk: a, origHp: h, origMax: m.maxHp ?? h },
              baseAtk: h,
              hp: a,
              maxHp: a,
            });
          }),
        },
      };
    });
    gs = { ...gs, policySwapActiveOn: enemy };
    log.push("Policy Change: ATK/HP swapped on all minions this turn.");
  } else if (effect === "classified_document") {
    for (let i = 0; i < 2; i++) {
      const pool = Math.random() < 0.5 ? gs[side].deck : gs[enemy].deck;
      if (pool.length && gs[side].hand.length < 10) {
        const picked = pickRandom(pool);
        gs = { ...gs, [side]: { ...gs[side], hand: [...gs[side].hand, { ...picked, uid: mkUid() }] } };
      }
    }
    log.push("Classified Document: 2 random cards added.");
  } else if (effect === "teleprompter_malfunction") {
    if (Math.random() < 0.5) {
      const last = gs[side].lastSpellCast;
      if (last) {
        const r = applySpell(last.effect, null, gs, side, last);
        gs = r.gs;
        log.push("Teleprompter: last spell triggered again!");
        log.push(...r.log);
      } else {
        log.push("Teleprompter: no last spell to repeat.");
      }
    } else {
      gs = damageHero(gs, side, 3);
      log.push("Teleprompter malfunctioned: -3 to your hero.");
    }
  } else if (effect === "sleep_mode") {
    const all = [...gs.player.board, ...gs.ai.board];
    if (all.length) {
      const t = pickRandom(all);
      gs = silenceMinion(gs, t.uid, side);
      log.push(`Sleep Mode: ${t.name} put to sleep.`);
    } else {
      log.push("Sleep Mode: no targets.");
    }
  } else if (effect === "old_school_politics") {
    const lib = getLib();
    const spells = lib.filter(c => c.type === "spell" && !c.token);
    for (let i = 0; i < 2; i++) {
      if (gs[side].hand.length >= 10) break;
      const picked = pickRandom(spells);
      if (!picked) break;
      const card = { ...picked, uid: mkUid(), cost: Math.max(0, (picked.cost || 0) - 1) };
      gs = { ...gs, [side]: { ...gs[side], hand: [...gs[side].hand, card] } };
    }
    log.push("Old School Politics: 2 spells added (-1 cost).");
  } else if (effect === "eli_cohen_arc") {
    if (gs[enemy].board.length < 7) {
      const eli = createMinionEntity({
        id: "eli_cohen_token",
        name: "Eli Cohen",
        cost: 0,
        atk: 4,
        hp: 8,
        type: "minion",
        rarity: "legendary",
        keywords: ["eli_cohen_steal", "cant_attack"],
        class: "Israel",
        token: true,
        desc: "Can't Attack. End of turn: operator steals a card from this side's hand.",
        effectConfig: { end_of_turn: [{ type: "eli_cohen_steal" }] },
      });
      eli.operatorSide = side;
      gs = { ...gs, [enemy]: { ...gs[enemy], board: [...gs[enemy].board, eli] } };
      gs = recalculateAuras(gs);
      log.push("Eli Cohen planted on enemy board. Asset active.");
    } else {
      log.push("Enemy board full — Eli couldn't get in.");
    }
  }

  gs = resolveOnEnemySpellCast(gs, side, log);
  gs = resolveDeaths(gs, side, log);

  // Track for Teleprompter Malfunction.
  if (sourceCard) {
    gs = { ...gs, [side]: { ...gs[side], lastSpellCast: { effect: sourceCard.effectId || sourceCard.effect || effect, ...sourceCard, _bureaucraticEcho: true } } };
  }

  // Bureaucratic double: re-run once with echo flag to bypass re-trigger.
  if (bureaucraticDouble && sourceCard) {
    log.push("Bureaucratic Delay: spell DOUBLED.");
    const echoCard = { ...sourceCard, _bureaucraticEcho: true };
    const r = applySpell(effect, targetId, gs, side, echoCard);
    return { gs: r.gs, log: [...log, ...r.log] };
  }

  return { gs, log };
}

export function playBattlecry(card, gs, side) {
  const log = [];
  const kw = card.keywords || [];
  const enemy = side === "player" ? "ai" : "player";

  if (kw.includes("draw")) {
    gs = drawCards(gs, side, 1);
    log.push("Drew a card!");
  }
  if (kw.includes("ping")) {
    const targets = gs[enemy].board;
    const tid = targets.length > 0 ? pickRandom(targets).uid : "hero_" + enemy;
    const r = applySpell("damage4", tid, gs, side);
    gs = r.gs;
    log.push(...r.log);
  }
  if (kw.includes("heal")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 3) } };
    log.push("+3 HP!");
  }
  if (kw.includes("aoe_heal")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 2), board: p.board.map(m => ({ ...m, hp: Math.min(m.maxHp || m.hp, m.hp + 2) })) } };
    log.push("All friendlies +2 HP!");
  }
  if (kw.includes("buff_all")) {
    const p = gs[side];
    gs = {
      ...gs,
      [side]: {
        ...p,
        board: p.board.map(m => (m.uid !== card.uid ? normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 1, hp: m.hp + 1, maxHp: m.maxHp + 1 }) : m)),
      },
    };
    log.push("All minions +1/+1!");
  }
  if (kw.includes("maga_buff")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, board: p.board.map(m => (m.uid !== card.uid ? normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 2 }) : m)) } };
    log.push("MAGA Rally! All friendlies +2 attack!");
  }
  if (kw.includes("heal5")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 5) } };
    log.push("+5 HP from the Golden Tower!");
  }
  if (kw.includes("draw2")) {
    gs = drawCards(gs, side, 2);
    log.push("Drew 2 cards!");
  }
  if (kw.includes("armor3")) {
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 3 } };
    log.push("+3 Armor.");
  }
  if (kw.includes("mrbeast_boss")) {
    gs = { ...gs, [side]: { ...gs[side], armor: (gs[side].armor || 0) + 20 } };
    gs = drawCards(gs, side, 2);
    log.push("Jimmy drops the check. +20 Armor, drew 2.");
  }
  if (kw.includes("summon_chandler")) {
    gs = summonToken(gs, side, { id: "chandler_token", name: "Chandler", cost: 3, atk: 2, hp: 4, type: "minion", rarity: "rare", keywords: [], class: "Viral" }, 1);
    log.push("Another Chandler appears.");
  }
  if (kw.includes("summon_sub_counter")) {
    gs = summonToken(gs, side, { id: "sub_counter", name: "Subscribe Counter", cost: 1, atk: 1, hp: 1, type: "minion", rarity: "common", keywords: [], class: "Viral" }, 1);
    log.push("Subscribe Counter summoned.");
  }
  if (kw.includes("summon_fans2")) {
    gs = summonToken(gs, side, { id: "fan_token_tate", name: "Manly G Fan", cost: 1, atk: 1, hp: 1, type: "minion", rarity: "common", keywords: [], class: "Viral" }, 2);
    log.push("Two Manly G Fans.");
  }
  if (kw.includes("summon_edgar")) {
    gs = summonToken(gs, side, { id: "edgar_token", name: "Edgar", cost: 1, atk: 1, hp: 2, type: "minion", rarity: "common", keywords: [], class: "Viral" }, 1);
    log.push("EDGAR!");
  }
  if (kw.includes("grant_charge_all_turn")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, board: p.board.map(m => ({ ...m, summoningSick: false, canAttack: true, attacksRemaining: Math.max(m.attacksRemaining || 0, 1), keywords: m.keywords?.includes("charge") ? m.keywords : [...(m.keywords || []), "charge"] })) } };
    log.push("All your minions have Charge this turn.");
  }
  if (kw.includes("self_damage2")) {
    gs = damageHero(gs, side, 2);
    log.push("-2 HP to own hero.");
  }
  if (kw.includes("collab_pump22")) {
    if (gs[side].board.filter(m => m.uid !== card.uid).length >= 3) {
      gs = updateMinion(gs, side, card.uid, m => normalizeMinionStats({ ...m, baseAtk: (m.baseAtk ?? m.atk) + 2, hp: m.hp + 2, maxHp: (m.maxHp ?? m.hp) + 2 }));
      log.push("Collab! +2/+2.");
    }
  }
  if (kw.includes("pump_all_atk1_turn")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, board: p.board.map(m => normalizeMinionStats({ ...m, tempAttackBonus: (m.tempAttackBonus || 0) + 1, tempAttackExpiresOn: side })) } };
    log.push("All friendly +1 Attack this turn.");
  }
  if (kw.includes("copy_enemy_card") || kw.includes("copy_enemy_hand_card")) {
    gs = copyRandomCardFromHand(gs, enemy, side);
    log.push("Copied a card from enemy hand.");
  }
  if (kw.includes("draw_viral") || kw.includes("draw_viral_discount1")) {
    const deck = gs[side].deck;
    const viralIdx = deck.findIndex(c => c.class === "Viral");
    if (viralIdx >= 0 && gs[side].hand.length < 10) {
      const picked = deck[viralIdx];
      const newDeck = deck.filter((_, i) => i !== viralIdx);
      const drawn = kw.includes("draw_viral_discount1")
        ? { ...picked, cost: Math.max(0, (picked.cost || 0) - 1) }
        : picked;
      gs = { ...gs, [side]: { ...gs[side], deck: newDeck, hand: [...gs[side].hand, drawn] } };
      log.push(kw.includes("draw_viral_discount1") ? "Drew a Viral card (-1 cost)." : "Drew a Viral card.");
    } else {
      gs = drawCards(gs, side, 1);
      log.push("Drew a card.");
    }
  }
  if (kw.includes("plus1_aura_turn")) {
    gs = { ...gs, [side]: { ...gs[side], tempAuraBonus: (gs[side].tempAuraBonus || 0) + 1, mana: Math.min(10, (gs[side].mana || 0) + 1) } };
    log.push("+1 Aura this turn.");
  }
  if (kw.includes("reveal_enemy_card")) {
    const eh = gs[enemy].hand;
    if (eh.length > 0) {
      const picked = pickRandom(eh);
      const revealed = (gs.visibility?.revealedEnemyCardUids || []);
      gs = { ...gs, visibility: { ...(gs.visibility || {}), revealedEnemyCardUids: [...revealed, picked.uid] } };
      log.push(`Revealed: ${picked.name}.`);
    }
  }
  if (kw.includes("damage2_any")) {
    const targets = ["hero_" + enemy, ...gs[enemy].board.map(m => m.uid)];
    const tid = pickRandom(targets);
    if (tid) gs = dealDamage(gs, tid, 2, side);
    log.push("2 damage.");
  }
  if (kw.includes("likud_discount_aura")) {
    const p = gs[side];
    gs = {
      ...gs,
      [side]: {
        ...p,
        hand: p.hand.map(c => (c.type === "minion" && c.uid !== card.uid ? { ...c, cost: Math.max(0, (c.cost || 0) - 1) } : c)),
      },
    };
    log.push("Likud Majority: your minions cost (1) less.");
  }
  if (kw.includes("sara_copy_discount")) {
    const beforeHand = gs[side].hand;
    gs = copyRandomCardFromHand(gs, enemy, side);
    const afterHand = gs[side].hand;
    if (afterHand.length > beforeHand.length) {
      const added = afterHand[afterHand.length - 1];
      gs = {
        ...gs,
        [side]: {
          ...gs[side],
          hand: gs[side].hand.map(c => c.uid === added.uid ? { ...c, cost: Math.max(0, (c.cost || 0) - 2) } : c),
        },
      };
    }
    log.push("Sara copied an enemy card (-2 cost).");
  }
  if (kw.includes("golani_summon_soldier")) {
    const soldier = { id: "soldier_token", name: "Soldier", cost: 1, atk: 1, hp: 2, type: "minion", rarity: "common", keywords: ["rush"], class: "Israel", token: true };
    gs = summonToken(gs, side, soldier, 1);
    log.push("1/2 Soldier deployed with Rush.");
  }
  if (kw.includes("unit_8200_reveal")) {
    gs = revealHand(gs, enemy, "turn");
    gs = drawCards(gs, side, 1);
    log.push("Unit 8200: enemy hand revealed. Drew 1.");
  }
  if (kw.includes("sayanim_peek_destroy")) {
    const deck = gs[enemy].deck;
    if (deck.length > 0) {
      const top = deck.slice(0, Math.min(3, deck.length));
      gs = openDiscover(gs, { side, pool: top, action: "destroy_from_enemy_deck", sourceLabel: "Sayanim Agent", count: top.length });
      log.push(`Sayanim: Discover top ${top.length} enemy deck — destroy 1.`);
    } else {
      log.push("Enemy deck empty — nothing to peek.");
    }
  }
  if (kw.includes("cia_blacksite_discover")) {
    const pool = gs[enemy].hand;
    if (pool.length) {
      gs = openDiscover(gs, { side, pool, action: "destroy_from_enemy_hand", sourceLabel: "Blacksite", count: Math.min(3, pool.length) });
      log.push(`Blacksite: Discover 3 enemy hand — destroy 1.`);
    } else log.push("Enemy hand empty.");
  }
  if (kw.includes("cia_double_agent_discover")) {
    const pool = gs[enemy].deck.slice(0, Math.min(3, gs[enemy].deck.length));
    if (pool.length) {
      gs = openDiscover(gs, { side, pool, action: "steal_from_enemy_deck_to_hand", sourceLabel: "Double Agent", count: pool.length });
      log.push(`Double Agent: Discover top ${pool.length} enemy deck — steal 1.`);
    } else log.push("Enemy deck empty.");
  }
  if (kw.includes("cia_black_budget_steal_top")) {
    const deck = gs[enemy].deck;
    if (deck.length && gs[side].hand.length < 10) {
      const top = deck[0];
      gs = {
        ...gs,
        [side]: { ...gs[side], hand: [...gs[side].hand, top] },
        [enemy]: { ...gs[enemy], deck: deck.slice(1) },
      };
      log.push(`Black Budget Analyst: stole ${top.name} from enemy deck.`);
    } else if (!deck.length) log.push("Enemy deck empty.");
    else log.push("Hand full — steal refused.");
  }
  if (kw.includes("cia_dead_drop_deathrattle")) {
    // marker only; the deathrattle is resolved via effectConfig.on_death
  }
  if (kw.includes("blue_origin_summon")) {
    gs = summonToken(gs, side, { id: "blue_origin_booster", name: "Booster", atk: 2, hp: 2, type: "minion", rarity: "common", class: "Tech", emoji: "🚀", keywords: ["rush"] }, 1);
    log.push("Booster deployed (Rush).");
  }
  if (kw.includes("heal4_hero")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 4) } };
    log.push("+4 HP.");
  }
  if (kw.includes("bezos_take_control")) {
    const candidates = gs[enemy].board.filter(m => (m.atk ?? 0) <= 4);
    if (candidates.length && gs[side].board.length < 7) {
      const t = pickRandom(candidates);
      gs = takeControlOfMinion(gs, t.uid, side, "permanent", side, { keepOnKill: true });
      log.push(`Acquired ${t.name}. Smile.`);
    } else {
      log.push("Bezos: no acquisition target.");
    }
  }
  if (kw.includes("jill_heal")) {
    const p = gs[side];
    gs = { ...gs, [side]: { ...p, hp: Math.min(p.maxHp, p.hp + 4) } };
    gs = drawCards(gs, side, 1);
    log.push("Jill: +4 HP, drew 1.");
  }

  const triggerActions = getTriggerActions(card, "battlecry");
  for (const action of triggerActions) {
    gs = runTriggerAction(gs, action, side, side, card.uid, log);
  }

  gs = resolveDeaths(gs, side, log);
  return { gs, log };
}

export function doAttack(atkUid, atkSide, targetId, gs) {
  const log = [];
  const defSide = atkSide === "player" ? "ai" : "player";
  const att = gs[atkSide].board.find(m => m.uid === atkUid);
  if (!att || att.atk === 0) return { gs, log: ["Can't attack!"] };

  // Wrong Direction: this minion's attack retargets to a random valid character.
  if (att.keywords?.includes("wrong_direction")) {
    const all = [
      "hero",
      ...gs[defSide].board.map(m => m.uid),
      ...gs[atkSide].board.filter(m => m.uid !== atkUid).map(m => ({ self: true, uid: m.uid })),
    ];
    const pick = all[Math.floor(Math.random() * all.length)];
    if (typeof pick === "object" && pick.self) {
      // friendly fire: directly damage own minion
      gs = updateMinion(gs, atkSide, pick.uid, m => ({ ...m, hp: m.hp - att.atk }));
      gs = updateMinion(gs, atkSide, atkUid, m => ({ ...m, attacksRemaining: 0, canAttack: false }));
      log.push(`${att.name} attacked friendly ${pick.uid}!`);
      gs = resolveDeaths(gs, atkSide, log);
      return { gs: recalculateAuras(gs), log };
    }
    targetId = pick;
  }

  if (att.keywords?.includes("cant_attack")) return { gs, log: ["This minion can't attack."] };
  if (att.summoningSick && !att.keywords?.includes("charge") && !att.keywords?.includes("rush")) return { gs, log: ["Summoning sickness!"] };
  if (att.canAttack === false || (att.attacksRemaining ?? 0) <= 0) return { gs, log: ["Already attacked!"] };

  const hasTaunt = gs[defSide].board.some(m => m.keywords?.includes("taunt"));
  const defMin = gs[defSide].board.find(m => m.uid === targetId);

  if (hasTaunt && targetId === "hero") return { gs, log: ["Taunt is blocking!"] };
  if (hasTaunt && defMin && !defMin.keywords?.includes("taunt")) return { gs, log: ["Must attack Taunt!"] };
  // Elusive only blocks spells — attacks can still hit elusive minions.
  if (targetId === "hero" && att.rushOnlyThisTurn && !att.keywords?.includes("charge")) return { gs, log: ["Rush minions can't hit heroes this turn!"] };
  if (targetId === "hero" && att.keywords?.includes("cant_attack_hero")) return { gs, log: ["This minion can't attack heroes!"] };

  const remaining = (att.attacksRemaining ?? 1) - 1;

  if (targetId === "hero") {
    gs = damageHero(gs, defSide, att.atk);
    gs = updateMinion(gs, atkSide, atkUid, m => ({ ...m, attacksRemaining: remaining, canAttack: remaining > 0 }));
    log.push(att.name + " hits hero for " + att.atk + "!");
    log.push("hero_hit");
    return { gs: recalculateAuras(gs), log };
  }

  const def = gs[defSide].board.find(m => m.uid === targetId);
  if (!def) return { gs, log: ["Target gone!"] };

  log.push(att.name + " vs " + def.name);
  gs = updateMinion(gs, defSide, targetId, m => ({ ...m, hp: m.hp - att.atk }));
  gs = updateMinion(gs, atkSide, atkUid, m => ({ ...m, hp: m.hp - def.atk, attacksRemaining: remaining, canAttack: remaining > 0 }));
  const killedDefender = def.hp - att.atk <= 0;
  if (killedDefender && att.temporaryControl && att.keepOnKillControl) {
    gs = updateMinion(gs, atkSide, atkUid, m => ({ ...m, temporaryControl: false, returnControlOnTurnEnd: null, keepOnKillControl: false }));
  }
  gs = resolveDeaths(gs, atkSide, log);

  if (def.hp - att.atk <= 0) log.push(def.name + " died.");
  if (att.hp - def.atk <= 0) log.push(att.name + " died.");
  return { gs: recalculateAuras(gs), log };
}

export function runCombatDebugChecks() {
  const base = {
    player: { hp: 30, maxHp: 30, mana: 0, maxMana: 0, hand: [], deck: [], board: [] },
    ai: { hp: 30, maxHp: 30, mana: 0, maxMana: 0, hand: [], deck: [], board: [] },
  };

  let gs = summonToken(base, "player", { id: "t", name: "T", atk: 1, hp: 1, keywords: [] }, 2);
  if (gs.player.board.length !== 2) return false;

  gs = { ...gs, player: { ...gs.player, deck: [{ id: "c1", uid: "c1" }, { id: "c2", uid: "c2" }] } };
  gs = drawCards(gs, "player", 2);
  if (gs.player.hand.length !== 2) return false;

  const b = gs.player.board[0];
  gs = buffMinion(gs, b.uid, 2, 0, "turn", "player");
  const buffed = gs.player.board.find(m => m.uid === b.uid);
  if (!buffed || buffed.atk < 3) return false;

  const deathrattleMinion = createMinionEntity({ id: "dr", name: "DR", atk: 1, hp: 1, keywords: [], effectConfig: { on_death: { type: "summon_token", token: { id: "x", name: "X", atk: 1, hp: 1, keywords: [] } } } });
  gs = { ...gs, player: { ...gs.player, board: [...gs.player.board, deathrattleMinion] } };
  gs = destroyMinion(gs, deathrattleMinion.uid, "ai");
  if (!gs.player.board.some(m => m.id === "x")) return false;

  const mine = createMinionEntity({ id: "mine", name: "Mine", atk: 2, hp: 2, keywords: [] });
  const theirs = createMinionEntity({ id: "theirs", name: "Theirs", atk: 2, hp: 2, keywords: [] });
  gs = { ...gs, player: { ...gs.player, board: [mine] }, ai: { ...gs.ai, board: [theirs] } };
  gs = takeControlOfMinion(gs, theirs.uid, "player", "turn", "player");
  gs = resolveEndOfTurn(gs, "player").gs;
  if (!gs.ai.board.some(m => m.uid === theirs.uid)) return false;

  const aura = createMinionEntity({ id: "aura", name: "Aura", atk: 2, hp: 2, keywords: ["aura_other_friendly_attack_1"] });
  const ally = createMinionEntity({ id: "ally", name: "Ally", atk: 2, hp: 2, keywords: [] });
  gs = recalculateAuras({ ...gs, player: { ...gs.player, board: [aura, ally] } });
  if ((gs.player.board.find(m => m.uid === ally.uid)?.atk || 0) !== 3) return false;
  gs = destroyMinion(gs, aura.uid, "ai");
  if ((gs.player.board.find(m => m.uid === ally.uid)?.atk || 0) !== 2) return false;

  gs = destroyAllMinionsAndDamageBothHeroes(gs, 5, "player");
  if (gs.player.board.length || gs.ai.board.length) return false;
  if (gs.player.hp > 25 || gs.ai.hp > 25) return false;
  return true;
}
