import { drawCard } from "./gameState.js";
import { applySpell, playBattlecry, doAttack, createMinionEntity, destroyAllMinions, damageHero, takeControlOfMinion, stealCardFromHandByUid } from "./combat.js";

function getUnlockedCharges(maxMana) {
  let n = 0;
  if ((maxMana || 0) >= 5) n += 1;
  if ((maxMana || 0) >= 10) n += 1;
  return n;
}

function resolveAiUltimate(gs, heroId) {
  const log = [];
  let ng = gs;
  if (heroId === "trump") {
    ng = destroyAllMinions(ng, "ai");
    ng = damageHero(ng, "player", 15);
    ng = damageHero(ng, "ai", 10);
    log.push("🔥 AI unleashes The Japan Special!", "All minions destroyed. Your hero -15, AI hero -10.");
  } else if (heroId === "cia") {
    const targets = [...ng.player.board].sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp)).slice(0, 2);
    for (const m of targets) {
      ng = takeControlOfMinion(ng, m.uid, "ai", "permanent", "ai", { keepOnKill: false });
    }
    if (ng.player.hand.length > 0 && ng.ai.hand.length < 10) {
      const pick = ng.player.hand[Math.floor(Math.random() * ng.player.hand.length)];
      ng = stealCardFromHandByUid(ng, "ai", "player", pick.uid);
    }
    log.push("🛰️ AI activates Deep State Download!", `Took control of ${targets.length} minion(s) and stole a card.`);
  } else if (heroId === "elon") {
    const summon = (def) => {
      if (ng.ai.board.length >= 7) return;
      ng = { ...ng, ai: { ...ng.ai, board: [...ng.ai.board, createMinionEntity(def)] } };
    };
    ng = {
      ...ng,
      ai: {
        ...ng.ai,
        mana: Math.min(10, (ng.ai.mana || 0) + 5),
        tempAuraBonus: (ng.ai.tempAuraBonus || 0) + 5,
        armor: (ng.ai.armor || 0) + 10,
      },
    };
    summon({ id: "starshield_colossus", name: "Starshield Colossus", type: "minion", cost: 0, rarity: "legendary", class: "Tech", atk: 4, hp: 12, emoji: "🛡️", keywords: ["taunt"], desc: "Taunt" });
    summon({ id: "aegis_protocol_titan", name: "Aegis Protocol Titan", type: "minion", cost: 0, rarity: "legendary", class: "Tech", atk: 8, hp: 8, emoji: "🤖", keywords: [], desc: "Titanic warframe." });
    summon({ id: "falcon_sentinel_mk_x", name: "Falcon Sentinel Mk-X", type: "minion", cost: 0, rarity: "legendary", class: "Tech", atk: 2, hp: 6, emoji: "🚀", keywords: ["taunt"], desc: "Taunt" });
    summon({
      id: "orbital_guardian_unit",
      name: "Orbital Guardian Unit",
      type: "minion",
      cost: 0,
      rarity: "legendary",
      class: "Tech",
      atk: 2,
      hp: 8,
      emoji: "🛰️",
      keywords: ["deathrattle"],
      desc: "End of your turn: draw 1 and deal 4 to a random enemy minion. Deathrattle: deal 8 to all friendly minions.",
      effectConfig: {
        end_of_turn: [
          { type: "draw_cards", amount: 1 },
          { type: "deal_damage_random_enemy_minion", amount: 4 },
        ],
        on_death: { type: "deal_damage_all", targetGroup: "friendly_minions", amount: 8 },
      },
    });
    log.push("⚙️ AI fires Future Tech!", "+5 Aura, +10 Armor, 4 elite units deployed.");
  }
  ng = {
    ...ng,
    ai: {
      ...ng.ai,
      ultimateUses: (ng.ai.ultimateUses || 0) + 1,
      ultimateUsedThisTurn: true,
    },
  };
  return { gs: ng, log };
}

const BUFF_EFFECT_IDS = new Set([
  "energy_drink",
  "launch_window",
  "sigma_edit",
]);
const BUFF_EFFECT_STRINGS = new Set(["buff33", "buff22"]);

function isBuffSpell(card) {
  if (!card) return false;
  if (card.effectType === "buff_friendly_minion") return true;
  if (card.effectId && BUFF_EFFECT_IDS.has(card.effectId)) return true;
  if (typeof card.effect === "string" && BUFF_EFFECT_STRINGS.has(card.effect)) return true;
  return false;
}

function strongestMinion(board) {
  if (!board?.length) return null;
  return [...board].sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0];
}

function highestThreat(board) {
  if (!board?.length) return null;
  const taunts = board.filter(m => m.keywords?.includes("taunt"));
  const pool = taunts.length ? taunts : board;
  return [...pool].sort((a, b) => b.atk - a.atk)[0];
}

// Returns individual action steps so CardGame can execute them one at a time with delays.
// Each step has: { type, card?, attackerUid?, defenderUid?, damage?, gs, log[] }
export function runAiTurnSteps(gs) {
  // Draw card + refresh mana (same as before, no visible step)
  gs = { ...gs, ai: { ...drawCard(gs.ai), mana: gs.ai.maxMana } };

  const steps = [];

  // ── Card play phase ──────────────────────────────────────────────────────────
  for (let t = 0; t < 20; t++) {
    const aff = gs.ai.hand.filter(c => c.cost <= gs.ai.mana);
    if (!aff.length) break;
    const noT  = aff.filter(c => c.type === "spell" && c.targetType === "none");
    const buffT = aff.filter(c => c.type === "spell" && c.targetType === "minion" && isBuffSpell(c) && gs.ai.board.length > 0);
    const dmgT = aff.filter(c => c.type === "spell" && c.targetType === "minion" && !isBuffSpell(c) && gs.player.board.length > 0);
    const mins = aff.filter(c => c.type === "minion" && gs.ai.board.length < 7);

    if (noT.length) {
      const s = noT[0];
      gs = { ...gs, ai: { ...gs.ai, hand: gs.ai.hand.filter(c => c.uid !== s.uid), mana: gs.ai.mana - s.cost } };
      const r = applySpell(s.effectId || s.effect, null, gs, "ai", s);
      gs = r.gs;
      steps.push({ type: "play_card", card: s, verb: "plays", gs, log: ["AI plays " + s.name, ...r.log] });
    } else if (buffT.length) {
      const s = buffT[0]; const tgt = strongestMinion(gs.ai.board);
      if (!tgt) break;
      gs = { ...gs, ai: { ...gs.ai, hand: gs.ai.hand.filter(c => c.uid !== s.uid), mana: gs.ai.mana - s.cost } };
      const r = applySpell(s.effectId || s.effect, tgt.uid, gs, "ai", s);
      gs = r.gs;
      steps.push({ type: "play_card", card: s, verb: "casts", gs, log: ["AI casts " + s.name + " on " + tgt.name, ...r.log] });
    } else if (dmgT.length) {
      const s = dmgT[0]; const tgt = highestThreat(gs.player.board);
      if (!tgt) break;
      gs = { ...gs, ai: { ...gs.ai, hand: gs.ai.hand.filter(c => c.uid !== s.uid), mana: gs.ai.mana - s.cost } };
      const r = applySpell(s.effectId || s.effect, tgt.uid, gs, "ai", s);
      gs = r.gs;
      steps.push({ type: "play_card", card: s, verb: "casts", gs, log: ["AI casts " + s.name, ...r.log] });
    } else if (mins.length) {
      mins.sort((a, b) => b.cost - a.cost);
      const card = mins[0];
      const minion = createMinionEntity(card);
      gs = { ...gs, ai: { ...gs.ai, hand: gs.ai.hand.filter(c => c.uid !== card.uid), mana: gs.ai.mana - card.cost, board: [...gs.ai.board, minion] } };
      const r = playBattlecry(minion, gs, "ai");
      gs = r.gs;
      steps.push({ type: "play_card", card, verb: "plays", gs, log: ["AI plays " + card.name, ...r.log] });
    } else break;
  }

  // ── Ultimate phase ───────────────────────────────────────────────────────────
  {
    const heroId = gs.ai.heroId;
    const unlocked = getUnlockedCharges(gs.ai.maxMana);
    const used = gs.ai.ultimateUses || 0;
    const available = Math.max(0, unlocked - used);
    const canUlt = heroId && available > 0 && !gs.ai.ultimateUsedThisTurn;
    if (canUlt) {
      const threat = gs.player.board.reduce((s, m) => s + (m.atk || 0), 0);
      const lowHp = (gs.ai.hp || 0) < 18;
      const finisher = (gs.player.hp || 0) <= 16 && heroId === "trump";
      const dumpLate = gs.ai.maxMana >= 9;
      const shouldUlt = lowHp || finisher || dumpLate || threat >= 6 || unlocked === 2;
      if (shouldUlt) {
        const r = resolveAiUltimate(gs, heroId);
        gs = r.gs;
        steps.push({ type: "ai_ultimate", heroId, gs, log: r.log });
      }
    }
  }

  // ── Attack phase ─────────────────────────────────────────────────────────────
  const attackers = gs.ai.board.slice(); // snapshot before any attacks modify the board
  for (const m of attackers) {
    const canAct = (m.keywords?.includes("charge") || m.keywords?.includes("rush") || !m.summoningSick) && m.canAttack !== false && (m.attacksRemaining ?? 1) > 0 && m.atk > 0;
    if (!canAct) continue;
    const taunts = gs.player.board.filter(x => x.keywords?.includes("taunt"));
    const valid  = gs.player.board.filter(x => !x.keywords?.includes("elusive"));
    const pool   = taunts.length ? taunts : valid;
    if (pool.length) {
      pool.sort((a, b) => b.atk - a.atk);
      const r = doAttack(m.uid, "ai", pool[0].uid, gs);
      gs = r.gs;
      steps.push({ type: "attack", attackerUid: m.uid, defenderUid: pool[0].uid, damage: m.atk, gs, log: r.log });
    } else if (!gs.player.board.some(x => x.keywords?.includes("taunt"))) {
      const r = doAttack(m.uid, "ai", "hero", gs);
      gs = r.gs;
      // "hero_player" matches getRefById in CardGame for damage number positioning
      steps.push({ type: "attack", attackerUid: m.uid, defenderUid: "hero_player", damage: m.atk, gs, log: r.log });
    }
  }

  return { steps, finalGs: gs };
}

// Legacy export kept so any other import doesn't break
export function runAiTurn(gs) {
  const { finalGs, steps } = runAiTurnSteps(gs);
  const log = ["AI thinking...", ...steps.flatMap(s => s.log)];
  return { gs: finalGs, log };
}
