// ── HERO DEFINITIONS ─────────────────────────────────────────────────────────
// Place local images under public/assets/... and reference with:
// /assets/cards/... , /assets/heroes/... , /assets/card-backs/...
// Each hero has: id, name, class, emoji, portrait?, cardBack?, bio, themeColor, deckIds (20 cards)
export const HEROES = [
  {
    id: "trump",
    name: "Donald Trump",
    class: "USA!",
    emoji: "🇺🇸",
    portrait: "/assets/heroes/trump.png",
    cardBack: "/assets/card-backs/usa-back.png",
    bio: "Make this hand great again. Plays big, talks bigger.",
    themeColor: "#cc2222",
    glowColor: "rgba(204,34,34,0.55)",
    // 12 class-specific + 8 neutral
    deckIds: [
      "the_wall","the_wall","executive_order","executive_order","fake_news","fake_news",
      "maga_rally","maga_rally","tariff","tariff","golden_tower","golden_tower",
      "gym_rat","crypto_bro","npc","npc","ratio","touch_grass","nft","karen",
    ],
  },
  {
    id: "cia",
    name: "CIA",
    class: "USA!",
    emoji: "🕵️",
    cardBack: "/assets/card-backs/usa-back.png",
    bio: "Black-budget ops, classified memes, and absolutely nothing under Antarctica.",
    themeColor: "#6dc6d6",
    glowColor: "rgba(109,198,214,0.5)",
    deckIds: [
      "signal_intercept","signal_intercept","mk_ultra_intern","mk_ultra_intern","black_budget_drone","black_budget_drone",
      "area_51_whistleblower","area_51_whistleblower","seal_team_six","seal_team_six","shadow_government_laptop","operation_paperclip_2_0",
      "uav_recon_a","uav_recon_b","cia_infiltration","fbi_raid","npc","ratio","touch_grass","streamer",
    ],
  },
  {
    id: "elon",
    name: "Elon Musk",
    class: "Elon",
    emoji: "🚀",
    portrait: "/assets/heroes/elon.png",
    cardBack: "/assets/card-backs/elon-back.png",
    bio: "Move fast. Break things. Fire everyone. Post at 3am.",
    themeColor: "#1a8adc",
    glowColor: "rgba(26,138,220,0.55)",
    // 12 class-specific + 8 neutral
    deckIds: [
      "doge","doge","neuralink","neuralink","starship","starship",
      "x_rebrand","x_rebrand","layoffs","layoffs","mars_colony","mars_colony",
      "sigma","streamer","doomer","doomer","vibe_check","lowkey","rizz","founder",
    ],
  },
];

export const DECK_SIZE_TARGET = 35;

// Keyed registry for easy O(1) lookup and extensibility
export const HERO_REGISTRY = Object.fromEntries(HEROES.map(h => [h.id, h]));

// ── CLASS CARD DATA ───────────────────────────────────────────────────────────
export const CLASS_CARDS = [
  // ── Trump / USA! class ──────────────────────────────────────────────────────
  { id:"the_wall",        name:"The Wall",          cost:4, atk:0, hp:8,  type:"minion", desc:"Taunt. Nobody gets through.",                emoji:"🧱", rarity:"rare",      keywords:["taunt"],               class:"USA!" },
  { id:"executive_order", name:"Executive Order",   cost:3,              type:"spell",  desc:"Destroy a minion. Signed.",                  emoji:"✍️", rarity:"epic",      effect:"destroy", targetType:"minion", class:"USA!" },
  { id:"fake_news",       name:"Fake News",         cost:2,              type:"spell",  desc:"Give a minion -3/-0 this turn.",             emoji:"📰", rarity:"common",    effect:"fake_news", targetType:"minion", class:"USA!" },
  { id:"maga_rally",      name:"MAGA Rally",        cost:5, atk:0, hp:1,  type:"minion", desc:"Battlecry: Give all friendlies +2/+0.",     emoji:"🎺", rarity:"epic",      keywords:["battlecry","maga_buff"],  class:"USA!" },
  { id:"tariff",          name:"Tariff",            cost:1,              type:"spell",  desc:"Deal 2 damage to all enemy minions.",        emoji:"💸", rarity:"common",    effect:"tariff",  targetType:"none",   class:"USA!" },
  { id:"golden_tower",    name:"Golden Tower",      cost:6, atk:5, hp:6,  type:"minion", desc:"Taunt. Battlecry: Restore 5 HP.",           emoji:"🏰", rarity:"legendary", keywords:["taunt","battlecry","heal5"], class:"USA!" },

  // ── Elon / Elon class ───────────────────────────────────────────────────────
  { id:"doge",            name:"Doge Coin",         cost:1,              type:"spell",  desc:"Give a friendly minion +2/+2.",             emoji:"🐕", rarity:"common",    effect:"buff22", targetType:"minion", class:"Elon" },
  { id:"neuralink",       name:"Neuralink",         cost:3, atk:2, hp:3,  type:"minion", desc:"Battlecry: Draw 2 cards.",                 emoji:"🧠", rarity:"epic",      keywords:["battlecry","draw2"],      class:"Elon" },
  { id:"starship",        name:"Starship",          cost:5, atk:6, hp:3,  type:"minion", desc:"Charge. May explode on landing.",          emoji:"🚀", rarity:"rare",      keywords:["charge"],                 class:"Elon" },
  { id:"x_rebrand",       name:"X Rebrand",         cost:2,              type:"spell",  desc:"Rename a minion 'X'. Give it +1/+1.",       emoji:"𝕏",  rarity:"rare",      effect:"x_rebrand", targetType:"minion", class:"Elon" },
  { id:"layoffs",         name:"Layoffs",           cost:4,              type:"spell",  desc:"Destroy ALL minions with 2 or less attack.",emoji:"📋", rarity:"epic",      effect:"layoffs", targetType:"none",   class:"Elon" },
  { id:"mars_colony",     name:"Mars Colony",       cost:7, atk:4, hp:10, type:"minion", desc:"Taunt. Elusive. It's on another planet.",  emoji:"🔴", rarity:"legendary", keywords:["taunt","elusive"],        class:"Elon" },
];

// ── CARD DATA ────────────────────────────────────────────────────────────────
export const DEFAULT_CARDS = [
  { id:"gym_rat",     name:"Gym Rat",          cost:2, atk:3, hp:2, type:"minion", desc:"No days off. Hits hard.",              emoji:"💪", rarity:"common",    class:"neutral", keywords:[] },
  { id:"crypto_bro",  name:"Crypto Bro",        cost:3, atk:2, hp:4, type:"minion", desc:"Taunt. 'This is fine.'",               emoji:"📈", rarity:"rare",      class:"neutral", keywords:["taunt"] },
  { id:"influencer",  name:"The Influencer",    cost:4, atk:3, hp:3, type:"minion", desc:"Battlecry: Draw a card.",              emoji:"📸", rarity:"epic",      class:"neutral", keywords:["battlecry","draw"] },
  { id:"egirl",       name:"E-Girl",             cost:1, atk:1, hp:3, type:"minion", desc:"Taunt. She will not be ignored.",      emoji:"🎀", rarity:"common",    class:"neutral", keywords:["taunt"] },
  { id:"npc",         name:"NPC",                cost:1, atk:2, hp:1, type:"minion", desc:"Stays on script.",                    emoji:"🤖", rarity:"common",    class:"neutral", keywords:[] },
  { id:"sigma",       name:"Sigma Male",         cost:5, atk:5, hp:5, type:"minion", desc:"Can't be targeted by spells.",        emoji:"😤", rarity:"legendary", class:"neutral", keywords:["elusive"] },
  { id:"pick_me",     name:"Pick Me Girl",       cost:2, atk:1, hp:4, type:"minion", desc:"Taunt. Not like other cards.",        emoji:"🥺", rarity:"common",    class:"neutral", keywords:["taunt"] },
  { id:"streamer",    name:"Twitch Streamer",    cost:3, atk:4, hp:2, type:"minion", desc:"Battlecry: Ping random enemy 2 dmg.", emoji:"🎮", rarity:"rare",      class:"neutral", keywords:["battlecry","ping"] },
  { id:"barista",     name:"Artisan Barista",    cost:2, atk:2, hp:2, type:"minion", desc:"Battlecry: Restore 3 HP to hero.",    emoji:"☕", rarity:"common",    class:"neutral", keywords:["battlecry","heal"] },
  { id:"therapist",   name:"My Therapist",       cost:4, atk:0, hp:6, type:"minion", desc:"Taunt. Battlecry: Heal friendlies 2.",emoji:"🛋️", rarity:"epic",     class:"neutral", keywords:["taunt","battlecry","aoe_heal"] },
  { id:"doomer",      name:"Doomer Boy",         cost:3, atk:3, hp:3, type:"minion", desc:"Charge. It's already over.",          emoji:"😮‍💨", rarity:"rare",   class:"neutral", keywords:["charge"] },
  { id:"karen",       name:"Karen",              cost:6, atk:4, hp:7, type:"minion", desc:"Taunt. Demands the manager.",         emoji:"💅", rarity:"epic",      class:"neutral", keywords:["taunt"] },
  { id:"founder",     name:"19yo Founder",       cost:7, atk:7, hp:5, type:"minion", desc:"Battlecry: All other minions +1/+1.", emoji:"🚀", rarity:"legendary", class:"neutral", keywords:["battlecry","buff_all"] },
  { id:"ratio",       name:"Ratio",              cost:2, type:"spell", desc:"Deal 4 damage to a minion.",         emoji:"💀", rarity:"rare",      class:"neutral", effect:"damage4",        targetType:"minion" },
  { id:"touch_grass", name:"Touch Grass",        cost:3, type:"spell", desc:"Restore 8 HP to your hero.",         emoji:"🌿", rarity:"common",    class:"neutral", effect:"heal8",          targetType:"none" },
  { id:"cancel",      name:"Cancel Culture",     cost:4, type:"spell", desc:"Destroy a minion. It's cancelled.",  emoji:"🚫", rarity:"epic",      class:"neutral", effect:"destroy",        targetType:"minion" },
  { id:"nft",         name:"Buy This NFT",       cost:1, type:"spell", desc:"3 damage split randomly.",           emoji:"🖼️", rarity:"common",    class:"neutral", effect:"damage3split",   targetType:"none" },
  { id:"vibe_check",  name:"Vibe Check",         cost:5, type:"spell", desc:"Deal 3 damage to ALL characters.",   emoji:"✅", rarity:"epic",      class:"neutral", effect:"vibe_check",     targetType:"none" },
  { id:"lowkey",      name:"Lowkey Slay",        cost:4, type:"spell", desc:"Give a friendly minion +3/+3.",      emoji:"✨", rarity:"rare",      class:"neutral", effect:"buff33",         targetType:"minion" },
  { id:"its_giving",  name:"It's Giving",        cost:6, type:"spell", desc:"Deal 4 damage to all enemies.",      emoji:"👑", rarity:"legendary", class:"neutral", effect:"flamestrike",    targetType:"none" },
  { id:"slay",        name:"Understood the Assignment", cost:3, type:"spell", desc:"Transform minion to 1/1 Boomer.", emoji:"🧓", rarity:"rare", class:"neutral", effect:"polymorph",   targetType:"minion" },
  { id:"rizz",        name:"Infinite Rizz",      cost:7, type:"spell", desc:"Summon three 3/3 Gymbros.",          emoji:"🏋️", rarity:"legendary", class:"neutral", effect:"summon_gymbros", targetType:"none" },
];

export const EXPANSION_CARDS = [
  { id: "locked_in", name: "Locked In", cost: 1, type: "minion", attack: 2, health: 1, effect: "Battlecry: gain +1 AP next turn.", rarity: "common", class: "neutral", keywords: ["battlecry"] },
  { id: "npc_crowd", name: "NPC Crowd", cost: 2, type: "minion", attack: 1, health: 1, effect: "Battlecry: summon 2 x 1/1 NPCs.", rarity: "common", class: "neutral", keywords: ["battlecry"] },
  { id: "viral_clip", name: "Viral Clip", cost: 2, type: "spell", effect: "Draw 2 cards.", rarity: "common", class: "neutral", keywords: [] },
  { id: "ragebait", name: "Ragebait", cost: 3, type: "spell", effect: "Deal 3 damage. Enemy draws 1 card.", rarity: "common", class: "neutral", keywords: [] },
  { id: "main_character_syndrome", name: "Main Character Syndrome", cost: 3, type: "minion", attack: 3, health: 2, effect: "Cannot be targeted by spells.", rarity: "common", class: "neutral", keywords: ["stealth"] },
  { id: "doomscroll", name: "Doomscroll", cost: 4, type: "spell", effect: "Look at the top 5 cards of your deck. Choose 1 to keep.", rarity: "common", class: "neutral", keywords: [] },
  { id: "energy_drink", name: "Energy Drink", cost: 1, type: "spell", effect: "Give a friendly minion +2 Attack this turn. It attacks immediately.", rarity: "common", class: "neutral", keywords: [] },
  { id: "sigma_edit", name: "Sigma Edit", cost: 3, type: "minion", attack: 2, health: 3, effect: "At the end of your turn, gain +1/+1.", rarity: "common", class: "neutral", keywords: [] },
  { id: "clout_surge", name: "Clout Surge", cost: 4, type: "spell", effect: "Give all your minions +1/+1.", rarity: "common", class: "neutral", keywords: [] },
  { id: "side_hustle", name: "Side Hustle", cost: 5, type: "minion", attack: 4, health: 4, effect: "Battlecry: if you control 3 or more minions, draw a card.", rarity: "common", class: "neutral", keywords: ["battlecry"] },

  { id: "marine_squad_a", name: "Marine Squad", cost: 2, type: "minion", attack: 2, health: 2, effect: "Battlecry: summon a 1/1 Recruit.", rarity: "common", class: "usa", keywords: ["battlecry"] },
  { id: "marine_squad_b", name: "Marine Squad", cost: 2, type: "minion", attack: 2, health: 2, effect: "Battlecry: summon a 1/1 Recruit.", rarity: "common", class: "usa", keywords: ["battlecry"] },
  { id: "abrams_tank_a", name: "Abrams Tank", cost: 4, type: "minion", attack: 3, health: 6, effect: "Taunt.", rarity: "common", class: "usa", keywords: ["taunt"] },
  { id: "abrams_tank_b", name: "Abrams Tank", cost: 4, type: "minion", attack: 3, health: 6, effect: "Taunt.", rarity: "common", class: "usa", keywords: ["taunt"] },
  { id: "black_hawk_escort_a", name: "Black Hawk Escort", cost: 3, type: "minion", attack: 3, health: 3, effect: "Rush.", rarity: "common", class: "usa", keywords: ["rush"] },
  { id: "black_hawk_escort_b", name: "Black Hawk Escort", cost: 3, type: "minion", attack: 3, health: 3, effect: "Rush.", rarity: "common", class: "usa", keywords: ["rush"] },
  { id: "fighter_patrol_a", name: "Fighter Patrol", cost: 5, type: "minion", attack: 5, health: 3, effect: "Charge. Can attack twice this turn.", rarity: "rare", class: "usa", keywords: ["charge"] },
  { id: "fighter_patrol_b", name: "Fighter Patrol", cost: 5, type: "minion", attack: 5, health: 3, effect: "Charge. Can attack twice this turn.", rarity: "rare", class: "usa", keywords: ["charge"] },
  { id: "stealth_bomber", name: "Stealth Bomber", cost: 6, type: "minion", attack: 4, health: 5, effect: "Battlecry: deal 2 damage to all enemies.", rarity: "rare", class: "usa", keywords: ["battlecry"] },
  { id: "pentagon_briefing_a", name: "Pentagon Briefing", cost: 4, type: "spell", effect: "Draw 3 cards.", rarity: "rare", class: "usa", keywords: [] },
  { id: "pentagon_briefing_b", name: "Pentagon Briefing", cost: 4, type: "spell", effect: "Draw 3 cards.", rarity: "rare", class: "usa", keywords: [] },
  { id: "uav_recon_a", name: "UAV Recon", cost: 2, type: "spell", effect: "Reveal the enemy hand for 1 turn. Deal 1 damage to all enemies.", rarity: "common", class: "usa", keywords: [] },
  { id: "uav_recon_b", name: "UAV Recon", cost: 2, type: "spell", effect: "Reveal the enemy hand for 1 turn. Deal 1 damage to all enemies.", rarity: "common", class: "usa", keywords: [] },
  { id: "cia_infiltration", name: "CIA Infiltration", cost: 5, type: "spell", effect: "Steal a random card from the enemy hand.", rarity: "epic", class: "usa", keywords: [] },
  { id: "fbi_raid", name: "FBI Raid", cost: 3, type: "spell", effect: "Destroy a minion with 3 or less Attack.", rarity: "rare", class: "usa", keywords: [] },
  { id: "patriot_battery", name: "Patriot Battery", cost: 4, type: "minion", attack: 2, health: 5, effect: "Taunt. Whenever the enemy casts a spell, deal 2 damage to the enemy hero.", rarity: "epic", class: "usa", keywords: ["taunt"] },
  { id: "shock_and_awe", name: "Shock and Awe", cost: 7, type: "spell", effect: "Deal 2 damage to all enemies. Summon 3 x 2/1 Troops.", rarity: "epic", class: "usa", keywords: [] },
  { id: "air_superiority", name: "Air Superiority", cost: 6, type: "minion", attack: 5, health: 4, effect: "Your other minions have +1 Attack.", rarity: "rare", class: "usa", keywords: [] },
  { id: "red_button", name: "Red Button", cost: 8, type: "spell", effect: "Deal 6 damage to the enemy hero. If they control no minions, deal 10 instead.", rarity: "legendary", class: "usa", keywords: [] },
  { id: "the_nuke", name: "The Nuke", cost: 10, type: "spell", effect: "Destroy all minions. Deal 10 damage to both heroes.", rarity: "legendary", class: "usa", keywords: [] },
  { id: "signal_intercept", name: "Signal Intercept", cost: 3, type: "spell", effect: "Reveal the enemy hand this turn. Draw a card.", rarity: "common", class: "usa", keywords: [] },
  { id: "mk_ultra_intern", name: "MK-Ultra Intern", cost: 2, type: "minion", attack: 2, health: 3, effect: "Battlecry: Copy a random card from the enemy hand.", rarity: "common", class: "usa", keywords: ["battlecry"], effectConfig: { battlecry: { type: "copy_random_card_from_hand" } } },
  { id: "black_budget_drone", name: "Black Budget Drone", cost: 4, type: "minion", attack: 3, health: 5, effect: "End of your turn: Copy a random card from the enemy hand.", rarity: "rare", class: "usa", keywords: [], effectConfig: { end_of_turn: { type: "copy_random_card_from_hand" } } },
  { id: "area_51_whistleblower", name: "Area 51 Whistleblower", cost: 3, type: "minion", attack: 3, health: 2, effect: "Battlecry: Reveal the enemy hand this turn.", rarity: "rare", class: "usa", keywords: ["battlecry"], effectConfig: { battlecry: { type: "reveal_hand", duration: "turn" } } },
  { id: "seal_team_six", name: "SEAL Team Six", cost: 5, type: "minion", attack: 4, health: 4, effect: "Rush. Battlecry: Reveal the enemy hand this turn.", rarity: "epic", class: "usa", keywords: ["rush", "battlecry"], effectConfig: { battlecry: { type: "reveal_hand", duration: "turn" } } },
  { id: "shadow_government_laptop", name: "Shadow Government Laptop", cost: 5, type: "spell", effect: "Steal a random card from the enemy hand. Draw a card.", rarity: "epic", class: "usa", keywords: [] },
  { id: "operation_paperclip_2_0", name: "Operation Paperclip 2.0", cost: 6, type: "spell", effect: "Take control of an enemy minion.", rarity: "legendary", class: "usa", keywords: [] },

  { id: "optimus_prototype_a", name: "Optimus Prototype", cost: 2, type: "minion", attack: 2, health: 3, effect: "Battlecry: give a friendly minion +1/+1.", rarity: "common", class: "elon", keywords: ["battlecry"] },
  { id: "optimus_prototype_b", name: "Optimus Prototype", cost: 2, type: "minion", attack: 2, health: 3, effect: "Battlecry: give a friendly minion +1/+1.", rarity: "common", class: "elon", keywords: ["battlecry"] },
  { id: "tesla_convoy_a", name: "Tesla Convoy", cost: 3, type: "minion", attack: 3, health: 3, effect: "Rush. Deathrattle: summon a 1/1 Autopilot Bot.", rarity: "common", class: "elon", keywords: ["rush", "deathrattle"] },
  { id: "tesla_convoy_b", name: "Tesla Convoy", cost: 3, type: "minion", attack: 3, health: 3, effect: "Rush. Deathrattle: summon a 1/1 Autopilot Bot.", rarity: "common", class: "elon", keywords: ["rush", "deathrattle"] },
  { id: "falcon_booster_a", name: "Falcon Booster", cost: 4, type: "minion", attack: 4, health: 3, effect: "Battlecry: deal 3 damage to the enemy hero.", rarity: "rare", class: "elon", keywords: ["battlecry"] },
  { id: "falcon_booster_b", name: "Falcon Booster", cost: 4, type: "minion", attack: 4, health: 3, effect: "Battlecry: deal 3 damage to the enemy hero.", rarity: "rare", class: "elon", keywords: ["battlecry"] },
  { id: "starship_test_a", name: "Starship Test", cost: 5, type: "minion", attack: 4, health: 5, effect: "Battlecry: draw 2 cards.", rarity: "rare", class: "elon", keywords: ["battlecry"] },
  { id: "starship_test_b", name: "Starship Test", cost: 5, type: "minion", attack: 4, health: 5, effect: "Battlecry: draw 2 cards.", rarity: "rare", class: "elon", keywords: ["battlecry"] },
  { id: "gigafactory_a", name: "Gigafactory", cost: 3, type: "minion", attack: 1, health: 4, effect: "At the end of your turn, summon a 2/1 Bot.", rarity: "epic", class: "elon", keywords: [] },
  { id: "gigafactory_b", name: "Gigafactory", cost: 3, type: "minion", attack: 1, health: 4, effect: "At the end of your turn, summon a 2/1 Bot.", rarity: "epic", class: "elon", keywords: [] },
  { id: "neural_link_a", name: "Neural Link", cost: 3, type: "spell", effect: "Copy a random card from the enemy hand into your hand.", rarity: "rare", class: "elon", keywords: [] },
  { id: "neural_link_b", name: "Neural Link", cost: 3, type: "spell", effect: "Copy a random card from the enemy hand into your hand.", rarity: "rare", class: "elon", keywords: [] },
  { id: "autopilot_swarm", name: "Autopilot Swarm", cost: 5, type: "spell", effect: "Summon 4 x 1/1 Bots with Rush.", rarity: "epic", class: "elon", keywords: [] },
  { id: "satellite_grid", name: "Satellite Grid", cost: 4, type: "spell", effect: "Deal 1 damage to all enemies. Draw a card for each enemy destroyed.", rarity: "rare", class: "elon", keywords: [] },
  { id: "launch_window", name: "Launch Window", cost: 2, type: "spell", effect: "Give a friendly minion +3 Attack this turn. It attacks immediately.", rarity: "common", class: "elon", keywords: [] },
  { id: "x_rebrand_elon_epic", name: "X Rebrand", cost: 6, type: "spell", effect: "Take control of an enemy minion until end of turn. If it kills a unit this turn, keep it permanently.", rarity: "epic", class: "elon", keywords: [] },
  { id: "liquidation_acquisition", name: "Liquidation Acquisition", cost: 7, type: "spell", effect: "Permanently take control of an enemy minion.", rarity: "legendary", class: "elon", keywords: [] },
  { id: "hyperloop_burst", name: "Hyperloop Burst", cost: 4, type: "spell", effect: "A friendly minion attacks a random enemy 3 times.", rarity: "rare", class: "elon", keywords: [] },
  { id: "iron_rain_drone", name: "Iron Rain Drone", cost: 6, type: "minion", attack: 3, health: 4, effect: "At the end of your turn, deal 1 damage to all enemy minions.", rarity: "epic", class: "elon", keywords: [] },
  { id: "mars_colony_protocol", name: "Mars Colony Protocol", cost: 9, type: "spell", effect: "Summon 5 random Elon-class minions from your deck.", rarity: "legendary", class: "elon", keywords: [] },
];

export const CARD_EFFECT_OVERRIDES = {
  locked_in: { effectId: "locked_in", effectConfig: { battlecry: { type: "gain_mana_next_turn", amount: 1 } } },
  npc_crowd: { effectId: "npc_crowd", effectConfig: { battlecry: { type: "summon_token", count: 2, token: { id: "npc_token", name: "NPC", atk: 1, hp: 1, class: "neutral", keywords: [] } } } },
  viral_clip: { effectId: "viral_clip", targetType: "none" },
  ragebait: { effectId: "ragebait", targetType: "any" },
  doomscroll: { effectId: "doomscroll", targetType: "none" },
  energy_drink: { effectId: "energy_drink", targetType: "minion" },
  sigma_edit: { effectId: "sigma_edit", effectConfig: { end_of_turn: { type: "buff_minion", attackDelta: 1, healthDelta: 1 } } },
  side_hustle: { effectId: "side_hustle", effectConfig: { battlecry: { type: "if_friendly_minions_at_least", count: 3, then: [{ type: "draw_cards", amount: 1 }] } } },
  fighter_patrol_a: { effectId: "fighter_patrol", effectConfig: { battlecry: { type: "grant_immediate_attack", attacks: 2, targetMode: "any" } } },
  fighter_patrol_b: { effectId: "fighter_patrol", effectConfig: { battlecry: { type: "grant_immediate_attack", attacks: 2, targetMode: "any" } } },
  stealth_bomber: { effectId: "stealth_bomber", effectConfig: { battlecry: { type: "deal_damage_all", targetGroup: "all_enemies", amount: 2 } } },
  uav_recon_a: { effectId: "uav_recon", targetType: "none" },
  uav_recon_b: { effectId: "uav_recon", targetType: "none" },
  cia_infiltration: { effectId: "cia_infiltration", targetType: "none" },
  fbi_raid: { effectId: "fbi_raid", targetType: "minion" },
  signal_intercept: { effectId: "signal_intercept", targetType: "none" },
  shadow_government_laptop: { effectId: "shadow_government_laptop", targetType: "none" },
  operation_paperclip_2_0: { effectId: "operation_paperclip_2_0", targetType: "minion" },
  patriot_battery: { effectId: "patriot_battery", effectConfig: { on_enemy_spell_cast: { type: "damage_hero", target: "enemy", amount: 2 } } },
  shock_and_awe: { effectId: "shock_and_awe", targetType: "none" },
  air_superiority: { effectId: "air_superiority", keywords: ["aura_other_friendly_attack_1"] },
  red_button: { effectId: "red_button", targetType: "none" },
  the_nuke: { effectId: "the_nuke", targetType: "none" },
  tesla_convoy_a: { effectId: "tesla_convoy", effectConfig: { on_death: { type: "summon_token", token: { id: "autopilot_bot", name: "Autopilot Bot", atk: 1, hp: 1, class: "elon", keywords: [] } } } },
  tesla_convoy_b: { effectId: "tesla_convoy", effectConfig: { on_death: { type: "summon_token", token: { id: "autopilot_bot", name: "Autopilot Bot", atk: 1, hp: 1, class: "elon", keywords: [] } } } },
  falcon_booster_a: { effectId: "falcon_booster", effectConfig: { battlecry: { type: "damage_hero", target: "enemy", amount: 3 } } },
  falcon_booster_b: { effectId: "falcon_booster", effectConfig: { battlecry: { type: "damage_hero", target: "enemy", amount: 3 } } },
  starship_test_a: { effectId: "starship_test", effectConfig: { battlecry: { type: "draw_cards", amount: 2 } } },
  starship_test_b: { effectId: "starship_test", effectConfig: { battlecry: { type: "draw_cards", amount: 2 } } },
  gigafactory_a: { effectId: "gigafactory", effectConfig: { end_of_turn: { type: "summon_token", token: { id: "bot_21", name: "Bot", atk: 2, hp: 1, class: "elon", keywords: [] } } } },
  gigafactory_b: { effectId: "gigafactory", effectConfig: { end_of_turn: { type: "summon_token", token: { id: "bot_21", name: "Bot", atk: 2, hp: 1, class: "elon", keywords: [] } } } },
  neural_link_a: { effectId: "neural_link", targetType: "none" },
  neural_link_b: { effectId: "neural_link", targetType: "none" },
  autopilot_swarm: { effectId: "autopilot_swarm", targetType: "none" },
  satellite_grid: { effectId: "satellite_grid", targetType: "none" },
  launch_window: { effectId: "launch_window", targetType: "minion" },
  x_rebrand_elon_epic: { effectId: "x_rebrand_control", targetType: "minion" },
  liquidation_acquisition: { effectId: "liquidation_acquisition", targetType: "minion" },
  hyperloop_burst: { effectId: "hyperloop_burst", targetType: "minion" },
  iron_rain_drone: { effectId: "iron_rain_drone", effectConfig: { end_of_turn: { type: "deal_damage_all", targetGroup: "enemy_minions", amount: 1 } } },
  mars_colony_protocol: { effectId: "mars_colony_protocol", targetType: "none" },
};

function withCardOverrides(card) {
  const override = CARD_EFFECT_OVERRIDES[card.id];
  if (!override) return card;
  const mergedKeywords = override.keywords ? Array.from(new Set([...(card.keywords || []), ...override.keywords])) : card.keywords;
  return { ...card, ...override, keywords: mergedKeywords };
}

function normalizeCardSchema(card) {
  const effectText = card.effectText || card.desc || card.effect || "";
  const targetingMode = card.targetingMode || card.targetType || "none";
  const triggers = card.triggers || card.effectConfig || {};
  const rarity = card.rarity || "common";
  const isLegendary = rarity === "legendary";
  const attack = card.attack ?? card.atk ?? 0;
  const health = card.health ?? card.hp ?? 0;
  const aura = card.aura ?? card.cost ?? 0;
  const artSrc = card.artSrc || card.art || card.image || "";
  const text = card.text || effectText;
  const rawClassTag = card.classTag || card.faction || card.class || "";
  const normalizedClassTag = String(rawClassTag || "").trim().replace(/[^a-zA-Z0-9 ]+/g, "");
  const isNeutralClassTag = !normalizedClassTag || normalizedClassTag.toLowerCase() === "neutral";
  return {
    ...card,
    rarity,
    aura,
    attack,
    health,
    text,
    artSrc,
    frameVariant: card.frameVariant || (isLegendary ? "inferno" : "default"),
    classTag: isNeutralClassTag ? "" : normalizedClassTag.toUpperCase(),
    art: artSrc,
    effectText,
    desc: card.desc || effectText,
    effectType: card.effectType || null,
    effectParams: card.effectParams || {},
    triggers,
    effectConfig: card.effectConfig || triggers,
    targetingMode,
    targetType: targetingMode, // keep compatibility with existing UI/AI checks
    cost: aura,
    atk: attack,
    hp: health,
  };
}

export let CUSTOM_CARDS = [];
export let LIBRARY_CARD_OVERRIDES = {};
export let LIBRARY_DELETED_IDS = new Set();

function withLibraryOverrides(card) {
  if (LIBRARY_DELETED_IDS.has(card.id)) return null;
  const override = LIBRARY_CARD_OVERRIDES[card.id];
  return override ? { ...card, ...override } : card;
}

export function getLib() {
  return [...DEFAULT_CARDS, ...CLASS_CARDS, ...EXPANSION_CARDS, ...CUSTOM_CARDS]
    .map(withCardOverrides)
    .map(withLibraryOverrides)
    .filter(Boolean)
    .map(normalizeCardSchema);
}
export function addCustomCard(card) {
  CUSTOM_CARDS = [...CUSTOM_CARDS, card];
  return CUSTOM_CARDS;
}
export function removeCustomCard(id) {
  CUSTOM_CARDS = CUSTOM_CARDS.filter(card => card.id !== id);
  return CUSTOM_CARDS;
}
export function getCustomCards() {
  return [...CUSTOM_CARDS];
}
export function upsertCustomCard(card) {
  CUSTOM_CARDS = [...CUSTOM_CARDS.filter(c => c.id !== card.id), card];
  return CUSTOM_CARDS;
}

export function upsertLibraryCard(card) {
  const isCustom = CUSTOM_CARDS.some(c => c.id === card.id);
  if (isCustom) {
    upsertCustomCard(card);
  } else {
    LIBRARY_CARD_OVERRIDES = { ...LIBRARY_CARD_OVERRIDES, [card.id]: card };
  }
  LIBRARY_DELETED_IDS.delete(card.id);
  return getLib();
}

export function deleteLibraryCard(id) {
  const isCustom = CUSTOM_CARDS.some(c => c.id === id);
  if (isCustom) {
    removeCustomCard(id);
  } else {
    const next = new Set(LIBRARY_DELETED_IDS);
    next.add(id);
    LIBRARY_DELETED_IDS = next;
  }
  return getLib();
}

// ── DECK MANAGEMENT ──────────────────────────────────────────────────────────
// Decks are managed via props/state in CardGame; this is just a helper.
export function buildDeckEntry(name, cardIds) {
  return { id: "d" + Date.now(), name: name || "My Deck", cardIds };
}

// ── RARITY CONFIG ─────────────────────────────────────────────────────────────
export const RC = {
  common:    { border: "#5a6070", glow: "rgba(90,96,112,0.4)",   label: "#9aa",  bg: "linear-gradient(160deg,#0d1520,#111a28)", gem: "#334" },
  rare:      { border: "#378ADD", glow: "rgba(55,138,221,0.5)",  label: "#85B7EB", bg: "linear-gradient(160deg,#081428,#0d1e3a)", gem: "#1a3a6a" },
  epic:      { border: "#9b59dd", glow: "rgba(155,89,221,0.5)",  label: "#CECBF6", bg: "linear-gradient(160deg,#100820,#180d30)", gem: "#2a1050" },
  legendary: { border: "#EF9F27", glow: "rgba(239,159,39,0.6)",  label: "#FAC775", bg: "linear-gradient(160deg,#181000,#26180a)", gem: "#3a2200" },
};
