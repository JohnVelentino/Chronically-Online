export function getUltimateMeta(hero) {
  const heroId = typeof hero === "string" ? hero : hero?.id;
  if (heroId === "trump") return {
    id: "trump",
    name: "The Japan Special",
    cost: 0,
    emoji: "🇯🇵",
    themeColor: "#cc2222",
    desc: "Destroy all Minions on the board, Deal 15 Damage to the enemy Hero and 10 Damage to Own Hero.",
  };
  if (heroId === "cia") return {
    id: "cia",
    name: "Deep State Download",
    cost: 0,
    emoji: "🛰️",
    themeColor: "#6dc6d6",
    desc: "Take control of up to 2 enemy minions and steal 1 card from their hand.",
  };
  if (heroId === "elon") return {
    id: "elon",
    name: "Future Tech",
    cost: 0,
    emoji: "🚀",
    themeColor: "#00e6c8",
    desc: "Summon a 8/8, a 4/12 Taunt, a 2/6 Taunt and a 2/8 Space Army. +5 Aura this turn, +10 Armor forever.",
  };
  if (heroId === "tate") return {
    id: "tate",
    name: "Top G Protocol",
    cost: 0,
    emoji: "👊",
    themeColor: "#d4af37",
    desc: "Summon three 8/8 War Room Members with Charge. Discover 1 of 3: Cigar Night, Bugatti Chiron Pur Sport, or A-Level Celebrity Security.",
  };
  if (heroId === "pewdiepie") return {
    id: "pewdiepie",
    name: "Meme Review",
    cost: 0,
    emoji: "🎮",
    themeColor: "#2f64ff",
    desc: "Steal 10 random cards from enemy deck. Summon six 2/2 9yo Army with Charge. Add Bitch Lasagna to your hand.",
  };
  if (heroId === "zuck") return {
    id: "zuck",
    name: "The Zuck",
    cost: 0,
    emoji: "🤖",
    themeColor: "#4ac29a",
    desc: "Copy every enemy minion onto your board. Enemy cards cost (1) more next turn. Cards in your hand cost (1) less — permanently.",
  };
  if (heroId === "mrbeast") return {
    id: "mrbeast",
    name: "Squid Game Charity",
    cost: 0,
    emoji: "🎯",
    themeColor: "#2ecc71",
    desc: "Destroy all minions. Summon 7 Contestants (4 yours / 3 enemy). One Survivor gains +10/+10 and Charge. Both heroes +20 Armor. You gain 5 Aura this turn. Add Beast Games to hand.",
  };
  return { id: "generic", name: "Ultimate", cost: 0, emoji: "⚡", themeColor: "#ffcc33", desc: "A powerful hero-specific ability." };
}
