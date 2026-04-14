import { DECK_SIZE_TARGET, getLib } from "../data/cards.js";

export function mkUid() { return Math.random().toString(36).slice(2); }

function shuffleCards(cards) {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function makeDeck() {
  const pool = getLib();
  return Array.from({ length: DECK_SIZE_TARGET }, () => ({ ...pool[Math.floor(Math.random() * pool.length)], uid: mkUid() }));
}

export function drawCard(player) {
  if (!player.deck.length) {
    const fatigue = 3;
    const armor = Math.max(0, player.armor || 0);
    const blocked = Math.min(armor, fatigue);
    const overflow = Math.max(0, fatigue - blocked);
    return {
      ...player,
      armor: armor - blocked,
      hp: player.hp - overflow,
      lastFatigueDamage: overflow,
      lastFatigueBlocked: blocked,
    };
  }
  const [card, ...rest] = player.deck;
  const hand = player.hand.length < 10 ? [...player.hand, card] : player.hand;
  return { ...player, hand, deck: rest, lastFatigueDamage: 0, lastFatigueBlocked: 0 };
}

export function makeDeckFrom(cardIds) {
  const pool = getLib();
  const source = Array.isArray(cardIds) ? cardIds.filter(Boolean) : [];
  const normalizedIds = source.length
    ? Array.from({ length: DECK_SIZE_TARGET }, (_, i) => source[i % source.length])
    : Array.from({ length: DECK_SIZE_TARGET }, () => pool[Math.floor(Math.random() * pool.length)]?.id).filter(Boolean);
  return normalizedIds.map(id => {
    const card = pool.find(c => c.id === id);
    return card ? { ...card, uid: mkUid() } : null;
  }).filter(Boolean);
}

export function initPlayer(name, isAI = false, customDeck = null) {
  const deck = shuffleCards(customDeck || makeDeck());
  return { name, isAI, hp: 40, maxHp: 40, armor: 0, mana: 0, maxMana: 0, deck: deck.slice(4), hand: deck.slice(0, 4), board: [], lastFatigueDamage: 0, lastFatigueBlocked: 0 };
}
