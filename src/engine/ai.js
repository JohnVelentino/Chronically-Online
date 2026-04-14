import { drawCard } from "./gameState.js";
import { applySpell, playBattlecry, doAttack, createMinionEntity } from "./combat.js";

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
    const minT = aff.filter(c => c.type === "spell" && c.targetType === "minion" && gs.player.board.length > 0);
    const mins = aff.filter(c => c.type === "minion" && gs.ai.board.length < 7);

    if (noT.length) {
      const s = noT[0];
      gs = { ...gs, ai: { ...gs.ai, hand: gs.ai.hand.filter(c => c.uid !== s.uid), mana: gs.ai.mana - s.cost } };
      const r = applySpell(s.effectId || s.effect, null, gs, "ai", s);
      gs = r.gs;
      steps.push({ type: "play_card", card: s, verb: "plays", gs, log: ["AI plays " + s.name, ...r.log] });
    } else if (minT.length) {
      const s = minT[0]; const tgt = gs.player.board[0];
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
