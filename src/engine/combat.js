import { mkUid, drawCard } from "./gameState.js";

function getEnemySide(side) {
  return side === "player" ? "ai" : "player";
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

function applyHeroDamageWithArmor(hero, amount) {
  const armor = Math.max(0, hero.armor || 0);
  const blocked = Math.min(armor, amount);
  const overflow = Math.max(0, amount - blocked);
  return { ...hero, armor: armor - blocked, hp: hero.hp - overflow };
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
    if (!dead.length) return recalculateAuras(next);
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
    next = { ...next, player: applyHeroDamageWithArmor(next.player, amount) };
  } else if (targetId === "hero_ai") {
    next = { ...next, ai: applyHeroDamageWithArmor(next.ai, amount) };
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
    next = {
      ...next,
      [enemySide]: {
        ...next[enemySide],
        ...applyHeroDamageWithArmor(next[enemySide], amount),
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

export function damageHero(gs, heroSide, amount) {
  return {
    ...gs,
    [heroSide]: applyHeroDamageWithArmor(gs[heroSide], amount),
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
      board: gs[side].board.map(m => ({
        ...normalizeMinionStats(m),
        summoningSick: false,
        canAttack: true,
        attacksRemaining: m.attacksRemaining && m.attacksRemaining > 1 ? m.attacksRemaining : 1,
        rushOnlyThisTurn: false,
      })),
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

  const visibility = next.visibility || {};
  const cleared = { ...visibility };
  ["playerHandRevealed", "aiHandRevealed"].forEach(key => {
    if (visibility[`${key}Until`] === `end_of_${side}_turn`) {
      cleared[key] = false;
      cleared[`${key}Until`] = null;
    }
  });
  next = { ...next, visibility: cleared };

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
  uav_recon: [{ type: "reveal_hand", duration: "turn" }, { type: "deal_damage_all", targetGroup: "all_enemies", amount: 1 }],
  cia_infiltration: [{ type: "steal_random_card_from_hand" }],
  signal_intercept: [{ type: "reveal_hand", duration: "turn" }, { type: "draw_cards", amount: 1 }],
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
  }

  gs = resolveOnEnemySpellCast(gs, side, log);
  gs = resolveDeaths(gs, side, log);
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
    log.push("Neuralink! Drew 2 cards!");
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
  if (att.summoningSick && !att.keywords?.includes("charge") && !att.keywords?.includes("rush")) return { gs, log: ["Summoning sickness!"] };
  if (att.canAttack === false || (att.attacksRemaining ?? 0) <= 0) return { gs, log: ["Already attacked!"] };

  const hasTaunt = gs[defSide].board.some(m => m.keywords?.includes("taunt"));
  const defMin = gs[defSide].board.find(m => m.uid === targetId);

  if (hasTaunt && targetId === "hero") return { gs, log: ["Taunt is blocking!"] };
  if (hasTaunt && defMin && !defMin.keywords?.includes("taunt")) return { gs, log: ["Must attack Taunt!"] };
  if (defMin?.keywords?.includes("elusive") || defMin?.keywords?.includes("stealth")) return { gs, log: ["Can't target that!"] };
  if (targetId === "hero" && att.rushOnlyThisTurn && !att.keywords?.includes("charge")) return { gs, log: ["Rush minions can't hit heroes this turn!"] };

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
