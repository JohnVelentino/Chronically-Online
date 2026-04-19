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
    portrait: "/assets/heroes/cia.png",
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
    class: "Tech",
    emoji: "🚀",
    portrait: "/assets/heroes/elon.png",
    cardBack: "/assets/card-backs/elon-back.png",
    bio: "Move fast. Break things. Fire everyone. Post at 3am.",
    themeColor: "#00e6c8",
    glowColor: "rgba(0,230,200,0.55)",
    // 12 class-specific + 8 neutral
    deckIds: [
      "doge","doge","neuralink","neuralink","starship","starship",
      "x_rebrand","x_rebrand","layoffs","layoffs","mars_colony","mars_colony",
      "sigma","streamer","doomer","doomer","vibe_check","lowkey","rizz","founder",
    ],
  },
  {
    id: "zuck",
    name: "Mark Zuckerberg",
    class: "Tech",
    emoji: "🦎",
    portrait: "/assets/heroes/zuck.png",
    cardBack: "/assets/card-backs/zuck-back.png",
    bio: "Friends list harvested. Privacy policy updated. Blinking is optional.",
    themeColor: "#4ac29a",
    glowColor: "rgba(74,194,154,0.55)",
    deckIds: [
      "data_harvest","data_harvest","prism_protocol","prism_protocol","lizard_form","lizard_form",
      "beyond_meat","beyond_meat","hawaiian_compound","mma_cage_match","algorithm_tweak","algorithm_tweak",
      "blue_checkmark","shadow_ban","senate_hearing","rayban_meta","npc","npc","ratio","lowkey",
    ],
  },
  {
    id: "tate",
    name: "Andrew Tate",
    class: "Viral",
    emoji: "👊",
    portrait: "/assets/heroes/tate.png",
    cardBack: "/assets/card-backs/tate-back.png",
    bio: "Top G. What color is your Bugatti? Escape the matrix, brokie.",
    themeColor: "#d4af37",
    glowColor: "rgba(212,175,55,0.6)",
    deckIds: [
      "welcome_real_world","welcome_real_world","real_world_uni","real_world_uni","escape_matrix","escape_matrix",
      "hustlers_u","hustlers_u","cold_plunge_4am","cold_plunge_4am","top_g_mindset","andrews_cigar",
      "red_pill","sparring_cobratate","romanian_compound","marcell","bailey_bolton","luc","alex_tate","smallex",
    ],
  },
  {
    id: "pewdiepie",
    name: "PewDiePie",
    class: "Viral",
    emoji: "🎮",
    portrait: "/assets/heroes/pewdiepie.png",
    cardBack: "/assets/card-backs/pewdiepie-back.png",
    bio: "Bro Army, assemble. 9-year-olds rise up. T-Series can catch these hands.",
    themeColor: "#2f64ff",
    glowColor: "rgba(47,100,255,0.6)",
    deckIds: [
      "edgar","edgar","maya","maya","piggeh","piggeh",
      "barrels","barrels","brofist","brofist","nine_yo_recruit","nine_yo_recruit",
      "chair_review","floor_is_lava","jack_collab","stephano","tseries_ad_break","mr_chair","pewds_gym","minecraft_pickaxe",
    ],
  },
  {
    id: "mrbeast",
    name: "MrBeast",
    class: "Viral",
    emoji: "🎯",
    portrait: "/assets/heroes/mrbeast.png",
    cardBack: "/assets/card-backs/mrbeast-back.png",
    bio: "Philanthropy arc locked in. Subscribe or get squid-gamed, no cap.",
    themeColor: "#2ecc71",
    glowColor: "rgba(46,204,113,0.6)",
    deckIds: [
      "chandler","chandler","karl_jacobs","karl_jacobs","chris_tyson","chris_tyson",
      "jimmy_himself","squid_rlgl","squid_rlgl","last_to_leave","hundred_days","philanthropy_arc",
      "mrbeast_check","ten_k_giveaway","subscribe_spell","npc","ratio","touch_grass","streamer","influencer",
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
  { id:"doge",            name:"Doge Coin",         cost:1,              type:"spell",  desc:"Give a friendly minion +2/+2.",             emoji:"🐕", rarity:"common",    effect:"buff22", targetType:"minion", class:"Tech" },
  { id:"neuralink",       name:"Neuralink",         cost:3, atk:2, hp:3,  type:"minion", desc:"Battlecry: Draw 2 cards.",                 emoji:"🧠", rarity:"epic",      keywords:["battlecry","draw2"],      class:"Tech" },
  { id:"starship",        name:"Starship",          cost:5, atk:6, hp:3,  type:"minion", desc:"Charge. May explode on landing.",          emoji:"🚀", rarity:"rare",      keywords:["charge"],                 class:"Tech" },
  { id:"x_rebrand",       name:"X Rebrand",         cost:2,              type:"spell",  desc:"Rename a minion 'X'. Give it +1/+1.",       emoji:"𝕏",  rarity:"rare",      effect:"x_rebrand", targetType:"minion", class:"Tech" },
  { id:"layoffs",         name:"Layoffs",           cost:4,              type:"spell",  desc:"Destroy ALL minions with 2 or less attack.",emoji:"📋", rarity:"epic",      effect:"layoffs", targetType:"none",   class:"Tech" },
  { id:"mars_colony",     name:"Mars Colony",       cost:7, atk:4, hp:10, type:"minion", desc:"Taunt. Elusive. It's on another planet.",  emoji:"🔴", rarity:"legendary", keywords:["taunt","elusive"],        class:"Tech" },

  // ── Zuck / Tech class ──────────────────────────────────────────────────────
  { id:"data_harvest",     name:"Data Harvest",          cost:2,              type:"spell",  desc:"Look at top 3 cards of enemy deck. Draw 1 card.",                                  emoji:"📡", rarity:"common",    effect:"peek_enemy_deck_3_draw1", targetType:"none",   flavor:"your data is not for sale. it is for lease.", class:"Tech" },
  { id:"prism_protocol",   name:"Prism Protocol",        cost:3,              type:"spell",  desc:"Reveal enemy hand. Copy a random enemy card into your hand.",                       emoji:"🔺", rarity:"rare",      effect:"prism_protocol",          targetType:"none",   flavor:"we do not listen. we just happen to know.",   class:"Tech" },
  { id:"lizard_form",      name:"Lizard Form",           cost:4, atk:3, hp:6, type:"minion", desc:"Elusive. Battlecry: Gain 3 Armor.",                                                 emoji:"🦎", rarity:"epic",      keywords:["elusive","battlecry","armor3"],                                        flavor:"he blinks sideways sometimes.",              class:"Tech" },
  { id:"beyond_meat",      name:"Beyond Meat Sacrifice", cost:1,              type:"spell",  desc:"Destroy a friendly minion. Draw 2 cards.",                                          emoji:"🥩", rarity:"common",    effect:"sacrifice_draw2",         targetType:"minion_friendly", flavor:"plant based. soul free.",                    class:"Tech" },
  { id:"hawaiian_compound",name:"Hawaiian Compound",     cost:5,              type:"spell",  desc:"Restore 10 HP. Gain 5 Armor. Draw a card.",                                         emoji:"🏝️", rarity:"epic",      effect:"hawaii_bunker",           targetType:"none",   flavor:"private island. private internet. private apocalypse.", class:"Tech" },
  { id:"mma_cage_match",   name:"MMA Cage Match",        cost:6, atk:7, hp:7, type:"minion", desc:"Rush. The algorithm wants this fight.",                                             emoji:"🥋", rarity:"rare",      keywords:["rush"],                                                                flavor:"he trained for this. mostly on twitter.",     class:"Tech" },
  { id:"algorithm_tweak",  name:"Algorithm Tweak",       cost:3,              type:"spell",  desc:"Enemy discards 2 random cards. Your next card costs (2) less.",                     emoji:"⚙️", rarity:"rare",      effect:"algo_tweak",              targetType:"none",   flavor:"small update. completely unrelated to everything. trust us.", class:"Tech" },
  { id:"blue_checkmark",   name:"Verified Blue Check",   cost:2,              type:"spell",  desc:"Give a friendly minion Divine Shield and Stealth.",                                 emoji:"✅", rarity:"common",    effect:"grant_dshield_stealth",   targetType:"minion_friendly", flavor:"eight dollars of trust.",                     class:"Tech" },
  { id:"shadow_ban",       name:"Shadow Ban",            cost:4,              type:"spell",  desc:"Silence an enemy minion. It cannot attack next turn.",                               emoji:"🌑", rarity:"rare",      effect:"silence_freeze",          targetType:"minion", flavor:"you're still posting. nobody is still watching.", class:"Tech" },
  { id:"senate_hearing",   name:"Senate Hearing",        cost:4,              type:"spell",  desc:"Return an enemy minion to its owner's hand. It costs (3) more.",                    emoji:"🏛️", rarity:"epic",      effect:"bounce_cost_plus3",       targetType:"minion", flavor:"senator, we run ads.",                        class:"Tech" },
  { id:"rayban_meta",      name:"Ray-Ban Meta Glasses",  cost:3, atk:2, hp:4, type:"minion", desc:"Battlecry: Permanently reveal 1 random card in enemy hand.",                        emoji:"🕶️", rarity:"epic",      keywords:["battlecry","reveal_enemy_card"],                                       flavor:"he sees you. that's the whole product.",      class:"Tech" },

  // ── Tate / Viral class ─────────────────────────────────────────────────────
  { id:"welcome_real_world", name:"Welcome to the Real World", cost:2,              type:"spell",  desc:"Draw 2 cards. Give them +1 Attack if they are Viral.",                              emoji:"🌍", rarity:"common",    effect:"welcome_real_world",     targetType:"none",   flavor:"step one. admit you were npc.",                          class:"Viral" },
  { id:"real_world_uni",     name:"Real World University",     cost:4, atk:3, hp:5, type:"minion", desc:"Battlecry: Draw a Viral card. It costs (1) less.",                                  emoji:"🏛️", rarity:"rare",      keywords:["battlecry","draw_viral_discount1"],                                        flavor:"tuition paid in principles.",                            class:"Viral" },
  { id:"escape_matrix",      name:"Escape The Matrix",         cost:5,              type:"spell",  desc:"Destroy an enemy minion. Disable enemy Ultimate for 2 turns.",                       emoji:"🕶️", rarity:"epic",      effect:"destroy_and_lock_ult2",  targetType:"minion", flavor:"red pill. no refunds.",                                  class:"Viral" },
  { id:"hustlers_u",         name:"Hustlers University",       cost:3,              type:"spell",  desc:"Draw 3 Viral cards. They cost (1) less this turn.",                                  emoji:"🎓", rarity:"rare",      effect:"draw3_viral_discount1_turn", targetType:"none", flavor:"49 a month. results not guaranteed. mindset guaranteed.", class:"Viral" },
  { id:"cold_plunge_4am",    name:"4AM Cold Plunge",           cost:2,              type:"spell",  desc:"Give a minion +3 HP and Taunt.",                                                     emoji:"🧊", rarity:"common",    effect:"buff_plus_taunt",        targetType:"minion_friendly", flavor:"pain is just weakness on vacation.",                     class:"Viral" },
  { id:"top_g_mindset",      name:"Top G Mindset",             cost:4,              type:"spell",  desc:"Your hero gains 8 Armor. Your next spell costs (2) less.",                          emoji:"🧠", rarity:"rare",      effect:"armor8_next_spell_discount2", targetType:"none", flavor:"discipline is freedom. broke is a choice.",               class:"Viral" },
  { id:"andrews_cigar",      name:"Andrew's Cigar",            cost:1,              type:"spell",  desc:"Deal 2 damage to any target. Draw a card.",                                          emoji:"🚬", rarity:"common",    effect:"damage2_draw1",          targetType:"any",    flavor:"fire starts conversations.",                             class:"Viral" },
  { id:"red_pill",           name:"The Red Pill",              cost:3,              type:"spell",  desc:"Copy a random card from enemy hand into your hand.",                                 emoji:"💊", rarity:"rare",      effect:"copy_enemy_hand_card",   targetType:"none",   flavor:"see everything. become undefeated.",                     class:"Viral" },
  { id:"sparring_cobratate", name:"Sparring Partner Cobratate",cost:4, atk:6, hp:4, type:"minion", desc:"Charge. Battlecry: deal 2 damage to your hero.",                                     emoji:"🥊", rarity:"epic",      keywords:["charge","battlecry","self_damage2"],                                       flavor:"practice bleeds so the match does not.",                  class:"Viral" },
  { id:"romanian_compound",  name:"Romanian Compound",         cost:6,              type:"spell",  desc:"Gain +2 Aura this turn. Refresh your Ultimate charge.",                              emoji:"🏰", rarity:"legendary", effect:"refresh_ult_plus_aura2", targetType:"none",   flavor:"garage full. guest list shorter than the cigars.",       class:"Viral" },
  { id:"marcell",            name:"Marcell",                   cost:5, atk:5, hp:5, type:"minion", desc:"Taunt. Battlecry: Summon two 1/1 Manly G Fans.",                                    emoji:"🕴️", rarity:"legendary", keywords:["taunt","battlecry","summon_fans2"],                                       flavor:"the brother you call before you call 911.",              class:"Viral" },
  { id:"bailey_bolton",      name:"Bailey Bolton",             cost:4, atk:3, hp:5, type:"minion", desc:"Battlecry: Gain 3 Armor. Draw a Viral card.",                                       emoji:"🎯", rarity:"legendary", keywords:["battlecry","armor3","draw_viral"],                                         flavor:"real world coach. texts back instantly.",                 class:"Viral" },
  { id:"luc",                name:"Luc",                       cost:3, atk:5, hp:2, type:"minion", desc:"Charge. Battlecry: deal 2 damage to any target.",                                   emoji:"👊", rarity:"legendary", keywords:["charge","battlecry","damage2_any"],                                        flavor:"the french one. still hits harder than you.",             class:"Viral" },
  { id:"alex_tate",          name:"Alex",                      cost:4, atk:4, hp:4, type:"minion", desc:"Battlecry: Copy a random card from enemy hand.",                                    emoji:"🧠", rarity:"legendary", keywords:["battlecry","copy_enemy_card"],                                             flavor:"the professor. reads the matrix like manga.",             class:"Viral" },
  { id:"smallex",            name:"Smallex",                   cost:2, atk:2, hp:3, type:"minion", desc:"Battlecry: Gain +1 Aura this turn only.",                                           emoji:"⚡", rarity:"legendary", keywords:["battlecry","plus1_aura_turn"],                                             flavor:"small but the electric bill is huge.",                    class:"Viral" },

  // ── PewDiePie / Viral class ─────────────────────────────────────────────────
  { id:"edgar",              name:"Edgar the Pug",             cost:1, atk:1, hp:2, type:"minion", desc:"Battlecry: Summon another 1/2 Edgar.",                                              emoji:"🐶", rarity:"rare",      keywords:["battlecry","summon_edgar"],                                               flavor:"EDGAR. no edgar.",                                       class:"Viral" },
  { id:"maya",               name:"Maya the Shiba",            cost:1, atk:1, hp:1, type:"minion", desc:"Deathrattle: Summon a 1/1 Maya.",                                                   emoji:"🐕", rarity:"common",    keywords:["deathrattle","summon_maya"],                                               flavor:"good girl. immortal girl.",                              class:"Viral" },
  { id:"piggeh",             name:"Piggeh",                    cost:2, atk:3, hp:2, type:"minion", desc:"Battlecry: Make an inappropriate joke. (+1 Attack to all friendly minions this turn.)", emoji:"🐷", rarity:"rare",      keywords:["battlecry","pump_all_atk1_turn"],                                          flavor:"he is coming out of the closet. literally.",             class:"Viral" },
  { id:"barrels",            name:"BARRELS!!!",                cost:1,              type:"spell",  desc:"Deal 2 damage to a random enemy 3 times.",                                           emoji:"🛢️", rarity:"common",    effect:"barrels_3x2_random",     targetType:"none",   flavor:"the one and only enemy of this channel.",                class:"Viral" },
  { id:"brofist",            name:"Brofist",                   cost:0,              type:"spell",  desc:"Give a friendly minion +2 Attack this turn.",                                        emoji:"👊", rarity:"common",    effect:"temp_atk2",              targetType:"minion_friendly", flavor:"as a token of our friendship.",                          class:"Viral" },
  { id:"nine_yo_recruit",    name:"Nine Year Old Recruit",     cost:1, atk:2, hp:1, type:"minion", desc:"A basic Bro Army unit. Viral.",                                                      emoji:"🪖", rarity:"common",    keywords:[],                                                                          flavor:"subscribe or get stepped on.",                            class:"Viral" },
  { id:"chair_review",       name:"Chair Review",              cost:2,              type:"spell",  desc:"Draw 2 cards.",                                                                      emoji:"🪑", rarity:"common",    effect:"draw2",                  targetType:"none",   flavor:"ten ten would sit again.",                               class:"Viral" },
  { id:"floor_is_lava",      name:"Floor Is Lava",             cost:3,              type:"spell",  desc:"Deal 2 damage to all minions.",                                                      emoji:"🌋", rarity:"rare",      effect:"damage_all_minions_2",   targetType:"none",   flavor:"happy wheels flashbacks.",                               class:"Viral" },
  { id:"jack_collab",        name:"Jack Septiceye Collab",     cost:4, atk:4, hp:4, type:"minion", desc:"Battlecry: If you control 3+ other minions, gain +2/+2.",                            emoji:"🟢", rarity:"epic",      keywords:["battlecry","collab_pump22"],                                               flavor:"top of the morning.",                                    class:"Viral" },
  { id:"stephano",           name:"Stephano",                  cost:5, atk:4, hp:6, type:"minion", desc:"Your other minions have +1/+1.",                                                     emoji:"🐴", rarity:"legendary", keywords:["aura_other_friendly_plus11"],                                              flavor:"il est un cheval. il sait des choses.",                   class:"Viral" },
  { id:"tseries_ad_break",   name:"T-Series Ad Break",         cost:3,              type:"spell",  desc:"Discard a random card from your hand. Draw 3 cards.",                                emoji:"📺", rarity:"rare",      effect:"discard_self_draw3",     targetType:"none",   flavor:"unskippable. unforgivable.",                             class:"Viral" },
  { id:"mr_chair",           name:"Mr. Chair",                 cost:2, atk:2, hp:4, type:"minion", desc:"Taunt. A loyal piece of furniture.",                                                 emoji:"🪑", rarity:"rare",      keywords:["taunt"],                                                                   flavor:"he has been through things with you.",                    class:"Viral" },
  { id:"pewds_gym",          name:"Pewds Gym Arc",             cost:3,              type:"spell",  desc:"Give all friendly minions +1/+1.",                                                   emoji:"💪", rarity:"rare",      effect:"pump_all_11",            targetType:"none",   flavor:"the meat arc.",                                          class:"Viral" },
  { id:"minecraft_pickaxe",  name:"Diamond Pickaxe",           cost:2,              type:"spell",  desc:"Give a friendly minion +3 Attack.",                                                  emoji:"⛏️", rarity:"common",    effect:"temp_atk3_permanent",    targetType:"minion_friendly", flavor:"finally, diamond.",                                     class:"Viral" },

  // ── MrBeast / Viral class ───────────────────────────────────────────────────
  { id:"chandler",           name:"Chandler",                  cost:3, atk:2, hp:4, type:"minion", desc:"Battlecry: Summon another 2/4 Chandler.",                                            emoji:"🧑‍🍳", rarity:"rare",      keywords:["battlecry","summon_chandler"],                                             flavor:"certified dishwasher arc fr.",                            class:"Viral" },
  { id:"karl_jacobs",        name:"Karl Jacobs",               cost:4, atk:3, hp:5, type:"minion", desc:"Battlecry: Draw 2 cards.",                                                           emoji:"🧢", rarity:"rare",      keywords:["battlecry","draw2"],                                                      flavor:"karl-like behavior. unreal.",                             class:"Viral" },
  { id:"chris_tyson",        name:"Chris Tyson",               cost:3, atk:3, hp:4, type:"minion", desc:"Taunt. Battlecry: Gain 3 Armor.",                                                    emoji:"💇", rarity:"epic",      keywords:["taunt","battlecry","armor3"],                                              flavor:"serving looks AND tanking hits bestie.",                  class:"Viral" },
  { id:"jimmy_himself",      name:"Jimmy Himself",             cost:7, atk:7, hp:7, type:"minion", desc:"Battlecry: Gain 20 Armor and draw 2 cards.",                                         emoji:"🎯", rarity:"legendary", keywords:["battlecry","mrbeast_boss"],                                                flavor:"subscribe or it's a flop. literally.",                    class:"Viral" },
  { id:"squid_rlgl",         name:"Red Light Green Light",     cost:4,              type:"spell",  desc:"Destroy ALL minions with 4 or less Attack.",                                         emoji:"🚦", rarity:"rare",      effect:"squid_rlgl",             targetType:"none",   flavor:"move and ur OUT OUT.",                                    class:"Viral" },
  { id:"last_to_leave",      name:"Last To Leave The Circle",  cost:5,              type:"spell",  desc:"Destroy the weakest enemy minion. Give a friendly minion +5/+5.",                    emoji:"⭕", rarity:"epic",      effect:"last_to_leave",          targetType:"minion_friendly", flavor:"one wins. everyone else touches grass.",                 class:"Viral" },
  { id:"hundred_days",       name:"100 Days Stranded",         cost:6,              type:"spell",  desc:"Restore 20 HP. Draw 3 cards.",                                                       emoji:"🏝️", rarity:"epic",      effect:"hundred_days",           targetType:"none",   flavor:"survival arc officially unlocked.",                       class:"Viral" },
  { id:"philanthropy_arc",   name:"Philanthropy Arc",          cost:7,              type:"spell",  desc:"Summon a 10/10 Giant Check with Taunt. Restore 10 HP.",                              emoji:"💸", rarity:"legendary", effect:"philanthropy_arc",       targetType:"none",   flavor:"doing what we can, king behavior.",                       class:"Viral" },
  { id:"mrbeast_check",      name:"The MrBeast Check",         cost:1,              type:"spell",  desc:"Gain 5 Armor. Draw a card.",                                                         emoji:"🪧", rarity:"common",    effect:"mrbeast_check",          targetType:"none",   flavor:"just wrote down a number. a BIG number.",                 class:"Viral" },
  { id:"ten_k_giveaway",     name:"$10,000 Giveaway",          cost:3,              type:"spell",  desc:"Gain 10 Armor. Draw 2 cards.",                                                       emoji:"💰", rarity:"rare",      effect:"ten_k_giveaway",         targetType:"none",   flavor:"chat reward fr fr. drop the tag.",                        class:"Viral" },
  { id:"subscribe_spell",    name:"Subscribe!",                cost:2,              type:"spell",  desc:"Copy a random card from enemy deck into your hand.",                                 emoji:"🔔", rarity:"rare",      effect:"subscribe_spell",        targetType:"none",   flavor:"notifications on. ratio'd into the algorithm.",           class:"Viral" },
  { id:"nolan",              name:"Nolan",                     cost:2, atk:2, hp:3, type:"minion", desc:"Battlecry: Summon a 1/1 Subscribe Counter.",                                         emoji:"🎬", rarity:"common",    keywords:["battlecry","summon_sub_counter"],                                          flavor:"new guy energy. locked in though.",                       class:"Viral" },

  // ── Generated / summoned tokens (not drafted directly) ─────────────────────
  { id:"fan_token_tate",     name:"Manly G Fan",               cost:1, atk:1, hp:1, type:"minion", desc:"Viral. A Fan of the Top G.",                                                         emoji:"💪", rarity:"common",    keywords:[],                                                                          flavor:"one of the bros.",                                       class:"Viral", token:true },
  { id:"fan_token_pewds",    name:"Bro Army Fan",              cost:1, atk:1, hp:1, type:"minion", desc:"Viral. 9-year-old army reporting.",                                                  emoji:"🪖", rarity:"common",    keywords:[],                                                                          flavor:"subscribed. notifications on.",                          class:"Viral", token:true },
  { id:"war_room_member",    name:"War Room Member",           cost:8, atk:8, hp:8, type:"minion", desc:"Charge. Viral. Top G Protocol cohort.",                                              emoji:"🕴️", rarity:"legendary", keywords:["charge"],                                                                  flavor:"eyes up. phone down. grind on.",                          class:"Viral", token:true },
  { id:"nine_yo_army",       name:"9yo Army Member",           cost:2, atk:2, hp:2, type:"minion", desc:"Charge. Viral. For the Bros.",                                                       emoji:"🪖", rarity:"common",    keywords:["charge"],                                                                  flavor:"drafted at recess.",                                     class:"Viral", token:true },
  { id:"tseries_tower",      name:"T-Series Content Tower",    cost:8, atk:2, hp:40,type:"minion", desc:"Taunt. Elusive. The algorithm blessed this one.",                                    emoji:"🗼", rarity:"legendary", keywords:["taunt","elusive"],                                                         flavor:"it keeps uploading.",                                    class:"Viral", token:true },
  { id:"bitch_lasagna",      name:"Bitch Lasagna",             cost:5,              type:"spell",  desc:"Deal 8 damage to all enemies. Draw 6. Restore 30 HP. Summon a 2/40 T-Series with Taunt+Elusive FOR OPPONENT.", emoji:"🍝", rarity:"legendary", effect:"bitch_lasagna",          targetType:"none",   flavor:"t-series ain't nothing but a",                            class:"Viral", token:true },
  { id:"security_team",      name:"A-Level Security Team",     cost:4, atk:4, hp:8, type:"minion", desc:"Taunt. Cannot attack enemy hero.",                                                   emoji:"🕶️", rarity:"rare",      keywords:["taunt","cant_attack_hero"],                                                flavor:"sorry sir, you're not on the list.",                     class:"Viral", token:true },
  { id:"avatar_2x2",         name:"Metaverse Avatar",          cost:2, atk:2, hp:2, type:"minion", desc:"Cannot attack heroes. Very low-poly.",                                               emoji:"👤", rarity:"common",    keywords:["cant_attack_hero"],                                                        flavor:"the eyes were the hard part.",                           class:"Tech", token:true },

  // ── MrBeast / ult tokens ────────────────────────────────────────────────────
  { id:"contestant",         name:"Contestant",                cost:3, atk:3, hp:3, type:"minion", desc:"A Squid Game Charity contestant. Only one survives.",                                 emoji:"🎮", rarity:"common",    keywords:[],                                                                          flavor:"number pinned. fate unpinned.",                          class:"Viral", token:true },
  { id:"survivor",           name:"Survivor",                  cost:3, atk:13, hp:13, type:"minion", desc:"Charge. The last one standing. Winner winner.",                                     emoji:"🏆", rarity:"legendary", keywords:["charge"],                                                                  flavor:"456 billion dollars vibes.",                              class:"Viral", token:true },
  { id:"giant_check",        name:"Giant Check",               cost:7, atk:10, hp:10, type:"minion", desc:"Taunt. Philanthropy incarnate.",                                                   emoji:"💵", rarity:"legendary", keywords:["taunt"],                                                                   flavor:"amount: ridiculous. memo: subscribe.",                    class:"Viral", token:true },
  { id:"sub_counter",        name:"Subscribe Counter",         cost:1, atk:1, hp:1, type:"minion", desc:"Viral. Going up only.",                                                              emoji:"📈", rarity:"common",    keywords:[],                                                                          flavor:"plus one. plus one. plus one.",                           class:"Viral", token:true },
  { id:"chandler_token",     name:"Chandler",                  cost:3, atk:2, hp:4, type:"minion", desc:"Chandler clone. No battlecry.",                                                      emoji:"🧑‍🍳", rarity:"rare",      keywords:[],                                                                          flavor:"dishes still dirty but he tried.",                        class:"Viral", token:true },
  { id:"beast_games",        name:"Beast Games",               cost:10,             type:"spell",  desc:"Cast twice to trigger. Restart the match: each hero starts with 10 mana, 9-card hand, 5-card deck, no Ultimate charges.", emoji:"🎪", rarity:"legendary", effect:"beast_games",            targetType:"none",   flavor:"season finale. reset the board bro.",                    class:"Viral", token:true },

  // ── Tate Discover-3 options (ult picks) ─────────────────────────────────────
  { id:"cigar_night",        name:"Cigar Night",               cost:10,             type:"spell",  desc:"Your hero takes 10 damage. Give all friendly minions +8/+8. Draw a card.",            emoji:"🚬", rarity:"legendary", effect:"cigar_night",            targetType:"none",   flavor:"the smoke clears… only alphas remain.",                  class:"Viral", token:true },
  { id:"bugatti_chiron",     name:"Bugatti Chiron Pur Sport",  cost:8, atk:8, hp:10,type:"minion", desc:"Charge. Battlecry: All your minions have Charge this turn.",                         emoji:"🏎️", rarity:"legendary", keywords:["charge","battlecry","grant_charge_all_turn"],                              flavor:"what color is your bugatti?...",                          class:"Viral", token:true },
  { id:"security_team_spell",name:"A-Level Celebrity Security",cost:6,              type:"spell",  desc:"Gain 10 Armor. Summon four 4/8 Security Team with Taunt. (Cannot attack enemy hero.)", emoji:"🕶️", rarity:"legendary", effect:"celebrity_security",     targetType:"none",   flavor:"sir, the red carpet. and the body bag. both rolled out.", class:"Viral", token:true },
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
  { id: "uav_recon_a", name: "UAV Recon", cost: 2, type: "spell", effect: "Copy a random card from the enemy hand. Deal 1 damage to all enemies.", rarity: "common", class: "usa", keywords: [] },
  { id: "uav_recon_b", name: "UAV Recon", cost: 2, type: "spell", effect: "Copy a random card from the enemy hand. Deal 1 damage to all enemies.", rarity: "common", class: "usa", keywords: [] },
  { id: "cia_infiltration", name: "CIA Infiltration", cost: 5, type: "spell", effect: "Steal a random card from the enemy hand.", rarity: "epic", class: "usa", keywords: [] },
  { id: "fbi_raid", name: "FBI Raid", cost: 3, type: "spell", effect: "Destroy a minion with 3 or less Attack.", rarity: "rare", class: "usa", keywords: [] },
  { id: "patriot_battery", name: "Patriot Battery", cost: 4, type: "minion", attack: 2, health: 5, effect: "Taunt. Whenever the enemy casts a spell, deal 2 damage to the enemy hero.", rarity: "epic", class: "usa", keywords: ["taunt"] },
  { id: "shock_and_awe", name: "Shock and Awe", cost: 7, type: "spell", effect: "Deal 2 damage to all enemies. Summon 3 x 2/1 Troops.", rarity: "epic", class: "usa", keywords: [] },
  { id: "air_superiority", name: "Air Superiority", cost: 6, type: "minion", attack: 5, health: 4, effect: "Your other minions have +1 Attack.", rarity: "rare", class: "usa", keywords: [] },
  { id: "red_button", name: "Red Button", cost: 8, type: "spell", effect: "Deal 6 damage to the enemy hero. If they control no minions, deal 10 instead.", rarity: "legendary", class: "usa", keywords: [] },
  { id: "the_nuke", name: "The Nuke", cost: 10, type: "spell", effect: "Destroy all minions. Deal 10 damage to both heroes.", rarity: "legendary", class: "usa", keywords: [] },
  { id: "signal_intercept", name: "Signal Intercept", cost: 3, type: "spell", effect: "Copy a random card from the enemy hand. Draw a card.", rarity: "common", class: "usa", keywords: [] },
  { id: "mk_ultra_intern", name: "MK-Ultra Intern", cost: 2, type: "minion", attack: 2, health: 3, effect: "Battlecry: Copy a random card from the enemy hand.", rarity: "common", class: "usa", keywords: ["battlecry"], effectConfig: { battlecry: { type: "copy_random_card_from_hand" } } },
  { id: "black_budget_drone", name: "Black Budget Drone", cost: 4, type: "minion", attack: 3, health: 5, effect: "End of your turn: Copy a random card from the enemy hand.", rarity: "rare", class: "usa", keywords: [], effectConfig: { end_of_turn: { type: "copy_random_card_from_hand" } } },
  { id: "area_51_whistleblower", name: "Area 51 Whistleblower", cost: 3, type: "minion", attack: 3, health: 2, effect: "Battlecry: Copy a random card from the enemy hand.", rarity: "rare", class: "usa", keywords: ["battlecry"], effectConfig: { battlecry: { type: "copy_random_card_from_hand" } } },
  { id: "seal_team_six", name: "SEAL Team Six", cost: 5, type: "minion", attack: 4, health: 4, effect: "Rush. Battlecry: Copy a random card from the enemy hand.", rarity: "epic", class: "usa", keywords: ["rush", "battlecry"], effectConfig: { battlecry: { type: "copy_random_card_from_hand" } } },
  { id: "shadow_government_laptop", name: "Shadow Government Laptop", cost: 5, type: "spell", effect: "Steal a random card from the enemy hand. Draw a card.", rarity: "epic", class: "usa", keywords: [] },
  { id: "operation_paperclip_2_0", name: "Operation Paperclip 2.0", cost: 6, type: "spell", effect: "Take control of an enemy minion.", rarity: "legendary", class: "usa", keywords: [] },

  { id: "optimus_prototype_a", name: "Optimus Prototype", cost: 2, type: "minion", attack: 2, health: 3, effect: "Battlecry: give a friendly minion +1/+1.", rarity: "common", class: "tech", keywords: ["battlecry"] },
  { id: "optimus_prototype_b", name: "Optimus Prototype", cost: 2, type: "minion", attack: 2, health: 3, effect: "Battlecry: give a friendly minion +1/+1.", rarity: "common", class: "tech", keywords: ["battlecry"] },
  { id: "tesla_convoy_a", name: "Tesla Convoy", cost: 3, type: "minion", attack: 3, health: 3, effect: "Rush. Deathrattle: summon a 1/1 Autopilot Bot.", rarity: "common", class: "tech", keywords: ["rush", "deathrattle"] },
  { id: "tesla_convoy_b", name: "Tesla Convoy", cost: 3, type: "minion", attack: 3, health: 3, effect: "Rush. Deathrattle: summon a 1/1 Autopilot Bot.", rarity: "common", class: "tech", keywords: ["rush", "deathrattle"] },
  { id: "falcon_booster_a", name: "Falcon Booster", cost: 4, type: "minion", attack: 4, health: 3, effect: "Battlecry: deal 3 damage to the enemy hero.", rarity: "rare", class: "tech", keywords: ["battlecry"] },
  { id: "falcon_booster_b", name: "Falcon Booster", cost: 4, type: "minion", attack: 4, health: 3, effect: "Battlecry: deal 3 damage to the enemy hero.", rarity: "rare", class: "tech", keywords: ["battlecry"] },
  { id: "starship_test_a", name: "Starship Test", cost: 5, type: "minion", attack: 4, health: 5, effect: "Battlecry: draw 2 cards.", rarity: "rare", class: "tech", keywords: ["battlecry"] },
  { id: "starship_test_b", name: "Starship Test", cost: 5, type: "minion", attack: 4, health: 5, effect: "Battlecry: draw 2 cards.", rarity: "rare", class: "tech", keywords: ["battlecry"] },
  { id: "gigafactory_a", name: "Gigafactory", cost: 3, type: "minion", attack: 1, health: 4, effect: "At the end of your turn, summon a 2/1 Bot.", rarity: "epic", class: "tech", keywords: [] },
  { id: "gigafactory_b", name: "Gigafactory", cost: 3, type: "minion", attack: 1, health: 4, effect: "At the end of your turn, summon a 2/1 Bot.", rarity: "epic", class: "tech", keywords: [] },
  { id: "neural_link_a", name: "Neural Link", cost: 3, type: "spell", effect: "Copy a random card from the enemy hand into your hand.", rarity: "rare", class: "tech", keywords: [] },
  { id: "neural_link_b", name: "Neural Link", cost: 3, type: "spell", effect: "Copy a random card from the enemy hand into your hand.", rarity: "rare", class: "tech", keywords: [] },
  { id: "autopilot_swarm", name: "Autopilot Swarm", cost: 5, type: "spell", effect: "Summon 4 x 1/1 Bots with Rush.", rarity: "epic", class: "tech", keywords: [] },
  { id: "satellite_grid", name: "Satellite Grid", cost: 4, type: "spell", effect: "Deal 1 damage to all enemies. Draw a card for each enemy destroyed.", rarity: "rare", class: "tech", keywords: [] },
  { id: "launch_window", name: "Launch Window", cost: 2, type: "spell", effect: "Give a friendly minion +3 Attack this turn. It attacks immediately.", rarity: "common", class: "tech", keywords: [] },
  { id: "x_rebrand_elon_epic", name: "X Rebrand", cost: 6, type: "spell", effect: "Take control of an enemy minion until end of turn. If it kills a unit this turn, keep it permanently.", rarity: "epic", class: "tech", keywords: [] },
  { id: "liquidation_acquisition", name: "Liquidation Acquisition", cost: 7, type: "spell", effect: "Permanently take control of an enemy minion.", rarity: "legendary", class: "tech", keywords: [] },
  { id: "hyperloop_burst", name: "Hyperloop Burst", cost: 4, type: "spell", effect: "A friendly minion attacks a random enemy 3 times.", rarity: "rare", class: "tech", keywords: [] },
  { id: "iron_rain_drone", name: "Iron Rain Drone", cost: 6, type: "minion", attack: 3, health: 4, effect: "At the end of your turn, deal 1 damage to all enemy minions.", rarity: "epic", class: "tech", keywords: [] },
  { id: "mars_colony_protocol", name: "Mars Colony Protocol", cost: 9, type: "spell", effect: "Summon 5 random Tech-class minions from your deck.", rarity: "legendary", class: "tech", keywords: [] },
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
  tesla_convoy_a: { effectId: "tesla_convoy", effectConfig: { on_death: { type: "summon_token", token: { id: "autopilot_bot", name: "Autopilot Bot", atk: 1, hp: 1, class: "tech", keywords: [] } } } },
  tesla_convoy_b: { effectId: "tesla_convoy", effectConfig: { on_death: { type: "summon_token", token: { id: "autopilot_bot", name: "Autopilot Bot", atk: 1, hp: 1, class: "tech", keywords: [] } } } },
  falcon_booster_a: { effectId: "falcon_booster", effectConfig: { battlecry: { type: "damage_hero", target: "enemy", amount: 3 } } },
  falcon_booster_b: { effectId: "falcon_booster", effectConfig: { battlecry: { type: "damage_hero", target: "enemy", amount: 3 } } },
  starship_test_a: { effectId: "starship_test", effectConfig: { battlecry: { type: "draw_cards", amount: 2 } } },
  starship_test_b: { effectId: "starship_test", effectConfig: { battlecry: { type: "draw_cards", amount: 2 } } },
  gigafactory_a: { effectId: "gigafactory", effectConfig: { end_of_turn: { type: "summon_token", token: { id: "bot_21", name: "Bot", atk: 2, hp: 1, class: "tech", keywords: [] } } } },
  gigafactory_b: { effectId: "gigafactory", effectConfig: { end_of_turn: { type: "summon_token", token: { id: "bot_21", name: "Bot", atk: 2, hp: 1, class: "tech", keywords: [] } } } },
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

// ── localStorage persistence keys ────────────────────────────────────────────
const LS_CUSTOM_CARDS = "co_customCards";
const LS_CARD_OVERRIDES = "co_cardOverrides";
const LS_DELETED_IDS = "co_deletedIds";
const LS_HERO_DECK_PREFIX = "co_heroDeck:"; // per-hero: co_heroDeck:<heroId> → JSON array of card ids

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_CARDS);
    if (raw) CUSTOM_CARDS = JSON.parse(raw);
  } catch {}
  try {
    const raw = localStorage.getItem(LS_CARD_OVERRIDES);
    if (raw) LIBRARY_CARD_OVERRIDES = JSON.parse(raw);
  } catch {}
  try {
    const raw = localStorage.getItem(LS_DELETED_IDS);
    if (raw) LIBRARY_DELETED_IDS = new Set(JSON.parse(raw));
  } catch {}
}

function persistAll() {
  try {
    localStorage.setItem(LS_CUSTOM_CARDS, JSON.stringify(CUSTOM_CARDS));
    localStorage.setItem(LS_CARD_OVERRIDES, JSON.stringify(LIBRARY_CARD_OVERRIDES));
    localStorage.setItem(LS_DELETED_IDS, JSON.stringify([...LIBRARY_DELETED_IDS]));
  } catch {}
}

export function getHeroDeckIds(heroId) {
  if (!heroId) return [];
  try {
    const raw = localStorage.getItem(`${LS_HERO_DECK_PREFIX}${heroId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  const hero = HEROES.find(h => h.id === heroId);
  return hero?.deckIds ? [...hero.deckIds] : [];
}

export function setHeroDeckIds(heroId, ids) {
  if (!heroId) return;
  try { localStorage.setItem(`${LS_HERO_DECK_PREFIX}${heroId}`, JSON.stringify(ids)); } catch {}
}

export function resetHeroDeckIds(heroId) {
  if (!heroId) return;
  try { localStorage.removeItem(`${LS_HERO_DECK_PREFIX}${heroId}`); } catch {}
}

export function getHeroPortraitOverride(heroId) {
  if (!heroId) return null;
  try { return localStorage.getItem(`heroPortrait:${heroId}`) || null; } catch { return null; }
}

export function setHeroPortraitOverride(heroId, dataUrl) {
  if (!heroId) return;
  try { localStorage.setItem(`heroPortrait:${heroId}`, dataUrl); } catch {}
}

export function resetHeroPortraitOverride(heroId) {
  if (!heroId) return;
  try { localStorage.removeItem(`heroPortrait:${heroId}`); } catch {}
}

export let CUSTOM_CARDS = [];
export let LIBRARY_CARD_OVERRIDES = {};
export let LIBRARY_DELETED_IDS = new Set();

// Load on module init
loadPersisted();

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
  persistAll();
  return CUSTOM_CARDS;
}
export function removeCustomCard(id) {
  CUSTOM_CARDS = CUSTOM_CARDS.filter(card => card.id !== id);
  persistAll();
  return CUSTOM_CARDS;
}
export function getCustomCards() {
  return [...CUSTOM_CARDS];
}
export function upsertCustomCard(card) {
  CUSTOM_CARDS = [...CUSTOM_CARDS.filter(c => c.id !== card.id), card];
  persistAll();
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
  persistAll();
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
  persistAll();
  return getLib();
}

export function resetAllCardEdits() {
  CUSTOM_CARDS = [];
  LIBRARY_CARD_OVERRIDES = {};
  LIBRARY_DELETED_IDS = new Set();
  persistAll();
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
