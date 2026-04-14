import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { getLib, RC, HEROES } from "./data/cards.js";
import { getSFX } from "./audio/sfx.js";
import { drawCard, initPlayer, makeDeckFrom, mkUid } from "./engine/gameState.js";
import { applySpell, doAttack, playBattlecry, createMinionEntity, damageHero, destroyAllMinions, resolveEndOfTurn, revealHand, startTurn, stealCardFromHandByUid, takeControlOfMinion } from "./engine/combat.js";
import { runAiTurnSteps } from "./engine/ai.js";
import ArrowOverlay from "./components/ArrowOverlay.jsx";
import BoardMinion from "./components/BoardMinion.jsx";
import BoardAmbience from "./components/BoardAmbience.jsx";
import CardCreator from "./components/CardCreator.jsx";
import HandCard from "./components/HandCard.jsx";
import HeroPortrait from "./components/HeroPortrait.jsx";
import DamageNumber from "./components/DamageNumber.jsx";
import CardBack from "./components/CardBack.jsx";
import HeroSelect from "./components/HeroSelect.jsx";
import TemplateCardFace from "./components/TemplateCardFace.jsx";
import useDevConfig from "./dev/useDevConfig.js";

const ATTACK_IMPACT_DELAY_MS = 260;
const ATTACK_CLEANUP_BUFFER_MS = 140;
const ENEMY_REVEAL_DURATION_MS = 2500;
const ATTACK_VISUAL_HOLD_MS = 500;
const REVEAL_CARD_WIDTH_PX = 248;
const REVEAL_CARD_HEIGHT_PX = 352;
const LEFT_REVEAL_TOP_PX = 320;
const LEFT_REVEAL_LEFT_PX = 360;
const UI_SMOOTH_TRANSITION_MS = 180;
const BOARD_ZONE_MIN_H_PX = 262;
const BOARD_ZONE_GAP_PX = 14;
const BOARD_ZONE_PAD_X_PX = 22;
const BOARD_STAGE_SHIFT_UP_PX = 20;
const ULTIMATE_USE_MAX = 2;
const HERO_PORTRAIT_STORAGE_PREFIX = "heroPortrait:";

const BOARD_CARD_MIN_W = 88;
const BOARD_CARD_MAX_W = 132;
const BOARD_CARD_ASPECT = 176 / 132;
const BOARD_SIDE_PAD_PX = 24;
const BOARD_CARD_GAP_PX = 10;

function computeBoardCardSize(count, zoneWidth) {
  if (count <= 0) return { w: BOARD_CARD_MAX_W, h: Math.round(BOARD_CARD_MAX_W * BOARD_CARD_ASPECT) };
  const available = Math.max(0, zoneWidth - BOARD_SIDE_PAD_PX * 2);
  const raw = (available / count) - BOARD_CARD_GAP_PX;
  const w = Math.max(BOARD_CARD_MIN_W, Math.min(BOARD_CARD_MAX_W, Math.floor(raw)));
  return { w, h: Math.round(w * BOARD_CARD_ASPECT) };
}

function readDevSettings() {
  let playerPortrait = null, enemyPortrait = null;
  try {
    playerPortrait = localStorage.getItem("devHeroPortrait_player") || null;
    enemyPortrait  = localStorage.getItem("devHeroPortrait_enemy")  || null;
  } catch {}
  return { playerPortrait, enemyPortrait };
}

function getHeroPortraitFromStorage(hero) {
  if (!hero?.id) return hero?.portrait || null;
  try {
    const saved = localStorage.getItem(`${HERO_PORTRAIT_STORAGE_PREFIX}${hero.id}`);
    return saved || hero.portrait || null;
  } catch {
    return hero?.portrait || null;
  }
}

function getUltimateMeta(hero) {
  const heroId = typeof hero === "string" ? hero : hero?.id;
  if (heroId === "trump") return { id: "trump", name: "The Japan Special" };
  if (heroId === "cia") return { id: "cia", name: "Deep State Download" };
  if (heroId === "elon") return { id: "elon", name: "Future Tech" };
  return { id: "generic", name: "Ultimate" };
}

function getUnlockedUltimateCharges(maxMana) {
  let unlocked = 0;
  if ((maxMana || 0) >= 5) unlocked += 1;
  if ((maxMana || 0) >= 10) unlocked += 1;
  return unlocked;
}

export default function App() {
  const [gs, setGs] = useState(null);
  const [phase, setPhase] = useState("hero_select");
  const [selectedHero, setSelectedHero] = useState(null);
  const [log, setLog] = useState([]);
  const [selCard, setSelCard] = useState(null);
  const [selAtk, setSelAtk] = useState(null);
  const [tgtSpell, setTgtSpell] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [winner, setWinner] = useState(null);
  const [devOpen, setDevOpen] = useState(false);
  const [hovTarget, setHovTarget] = useState(null);
  const [attackVisual, setAttackVisual] = useState(null);
  const [hitStop, setHitStop] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [aiActionHighlight, setAiActionHighlight] = useState(false);
  const [aiPlayOverlay, setAiPlayOverlay] = useState(null);
  const [aiActions, setAiActions] = useState([]);
  const [aiPlayHistory, setAiPlayHistory] = useState([]);   // all cards enemy played this game
  const [hoveredHistoryCard, setHoveredHistoryCard] = useState(null);
  const [flyingCard, setFlyingCard] = useState(null);        // { card, id } — the flying-to-panel animation
  const aiStepTimers = useRef([]);
  const attackBusyRef = useRef(false);
  const [draggingCard, setDraggingCard] = useState(null);
  const [savedDecks, setSavedDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [spotlightCard, setSpotlightCard] = useState(null);
  const [spotlightOwner, setSpotlightOwner] = useState("");
  const spotlightTimer = useRef(null);
  const [deckPulse, setDeckPulse] = useState(false);
  const [pendingDrawCard, setPendingDrawCard] = useState(null);
  const [summonRunes, setSummonRunes] = useState([]);
  const [matchFadeActive, setMatchFadeActive] = useState(false);
  const [matchFadeOpaque, setMatchFadeOpaque] = useState(false);
  const [isOverPlayZone, setIsOverPlayZone] = useState(false);
  const [devSettings, setDevSettings] = useState(readDevSettings);
  const [ciaUltSelection, setCiaUltSelection] = useState(null);
  const devConfig = useDevConfig();
  const prevBoardUids = useRef({ player: [], ai: [] });

  const layoutCfg = devConfig?.layout || {};
  const visualCfg = devConfig?.visual || {};
  const enemyHeroLayout = layoutCfg.enemyHero || { x: 50, y: 8, size: 120 };
  const playerHeroLayout = layoutCfg.playerHero || { x: 50, y: 85, size: 120 };
  const enemyBattlefieldLayout = layoutCfg.enemyBattlefield || { y: 28, height: 22 };
  const playerBattlefieldLayout = layoutCfg.playerBattlefield || { y: 58, height: 22 };
  const enemyHandLayout = layoutCfg.enemyHand || { y: 4, fanAngle: 4 };
  const playerHandLayout = layoutCfg.playerHand || { y: 92, fanAngle: 6 };
  const endTurnBtnLayout = layoutCfg.endTurnBtn || { x: 92, y: 50 };
  const auraIndicatorLayout = layoutCfg.auraIndicator || { x: 92, y: 60 };
  const deckHandIndicatorLayout = layoutCfg.deckHandIndicator || { x: 92, y: 68 };

  const selAtkRef = useRef(null);
  const playerHeroRef = useRef(null);
  const enemyHeroRef = useRef(null);
  const minionRefs = useRef({});
  const playerBoardContainerRef = useRef(null);
  const enemyBoardContainerRef = useRef(null);
  const [playerBoardW, setPlayerBoardW] = useState(1200);
  const [enemyBoardW, setEnemyBoardW] = useState(1200);
  const pointerRafRef = useRef(null);

  function getMinionRef(uid) {
    if (!minionRefs.current[uid]) minionRefs.current[uid] = { current: null };
    return minionRefs.current[uid];
  }

  function pushLog(e) {
    setLog(p => [...p.slice(-50), ...e]);
  }

  function toast(m) {
    setToastMsg(m);
    setTimeout(() => setToastMsg(""), 2500);
  }

  function showSpotlight(card, owner) {
    if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    setSpotlightCard(card);
    setSpotlightOwner(owner);
    spotlightTimer.current = setTimeout(() => {
      setSpotlightCard(null);
      setSpotlightOwner("");
    }, 1500);
  }

  useEffect(() => {
    return () => {
      if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    };
  }, []);

  useEffect(() => {
    const lockScroll = phase !== "hero_select" && phase !== "menu";
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [phase]);

  useEffect(() => {
    function measure() {
      if (playerBoardContainerRef.current) setPlayerBoardW(playerBoardContainerRef.current.clientWidth);
      if (enemyBoardContainerRef.current) setEnemyBoardW(enemyBoardContainerRef.current.clientWidth);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (playerBoardContainerRef.current) ro.observe(playerBoardContainerRef.current);
    if (enemyBoardContainerRef.current) ro.observe(enemyBoardContainerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [phase]);

  function getRefById(id) {
    if (!id) return null;
    if (id === "hero_player") return playerHeroRef;
    if (id === "hero_ai") return enemyHeroRef;
    return getMinionRef(id);
  }

  function spawnDamageNumber(targetId, amount, type = "damage") {
    const ref = getRefById(targetId);
    if (!ref?.current) return;
    const rect = ref.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2 + scrollY;
    const color = type === "heal" ? "#5fd68a" : type === "buff" ? "#f9c66c" : "#ff6b6b";
    const sign = type === "heal" || type === "buff" ? "+" : "-";
    const id = mkUid();
    setDamageNumbers(prev => [...prev, { id, x, y, text: `${sign}${Math.abs(amount)}`, color }]);
    setTimeout(() => setDamageNumbers(prev => prev.filter(n => n.id !== id)), 950);
  }

  function registerSummonRune(uid) {
    setSummonRunes(prev => prev.includes(uid) ? prev : [...prev, uid]);
    setTimeout(() => setSummonRunes(prev => prev.filter(id => id !== uid)), 650);
  }

  function triggerAttackVisual(attacker, defender, amount) {
    const key = Date.now();
    setAttackVisual({ attacker, defender, key });
    spawnDamageNumber(defender, amount, "damage");
    setHitStop(true);
    setTimeout(() => setHitStop(false), 80);
    setTimeout(() => setAttackVisual(prev => (prev?.key === key ? null : prev)), ATTACK_VISUAL_HOLD_MS);
  }

  function resolveAttackWithPresentation({ attackerUid, attackerSide, targetId, defenderFxId, onResolved }) {
    if (!gs || attackBusyRef.current) return;
    const attacker = gs[attackerSide].board.find(m => m.uid === attackerUid);
    if (!attacker) return;
    attackBusyRef.current = true;
    triggerAttackVisual(attackerUid, defenderFxId, attacker.atk);
    setTimeout(() => {
      const r = doAttack(attackerUid, attackerSide, targetId, gs);
      onResolved(r);
      setTimeout(() => {
        attackBusyRef.current = false;
      }, ATTACK_CLEANUP_BUFFER_MS);
    }, ATTACK_IMPACT_DELAY_MS);
  }

  function addAiAction(emoji, text) {
    const id = mkUid();
    setAiActions(prev => [...prev, { id, emoji, text }].slice(-4));
    setTimeout(() => setAiActions(prev => prev.filter(a => a.id !== id)), 6000);
  }

  function checkWin(g) {
    if (g.player.hp <= 0) return "ai";
    if (g.ai.hp <= 0) return "player";
    return null;
  }

  function clearCiaUltimateSelection() {
    setCiaUltSelection(null);
  }

  function toggleCiaMinionSelection(uid) {
    if (!ciaUltSelection) return;
    setCiaUltSelection(prev => {
      if (!prev) return prev;
      const exists = prev.minionUids.includes(uid);
      if (exists) {
        return { ...prev, minionUids: prev.minionUids.filter(id => id !== uid) };
      }
      if (prev.minionUids.length >= prev.maxMinions) return prev;
      return { ...prev, minionUids: [...prev.minionUids, uid] };
    });
  }

  function toggleCiaHandSelection(uid) {
    if (!ciaUltSelection) return;
    setCiaUltSelection(prev => {
      if (!prev) return prev;
      const exists = prev.handUids.includes(uid);
      if (exists) {
        return { ...prev, handUids: prev.handUids.filter(id => id !== uid) };
      }
      if (prev.handUids.length >= prev.maxHandCards) return prev;
      return { ...prev, handUids: [...prev.handUids, uid] };
    });
  }

  function confirmCiaUltimate() {
    if (!gs || !ciaUltSelection || phase !== "player_turn") return;
    let ng = revealHand(gs, "ai", "turn");
    let controlledCount = 0;
    let stolenCount = 0;

    ciaUltSelection.minionUids.forEach(uid => {
      const before = ng.player.board.length;
      ng = takeControlOfMinion(ng, uid, "player", "permanent", "player");
      if (ng.player.board.length > before) controlledCount += 1;
    });

    ciaUltSelection.handUids.forEach(uid => {
      const before = ng.player.hand.length;
      ng = stealCardFromHandByUid(ng, "ai", "player", uid);
      if (ng.player.hand.length > before) stolenCount += 1;
    });

    ng = {
      ...ng,
      player: {
        ...ng.player,
        ultimateUses: (ng.player.ultimateUses || 0) + 1,
        ultimateUsedThisTurn: true,
      },
    };

    pushLog([
      "Classified files acquired.",
      `CIA seized ${controlledCount} minion${controlledCount === 1 ? "" : "s"} and stole ${stolenCount} card${stolenCount === 1 ? "" : "s"}.`,
    ]);

    clearCiaUltimateSelection();

    const w = checkWin(ng);
    if (w) {
      setWinner(w);
      setPhase("gameover");
      if (w === "player") getSFX().victory(); else getSFX().defeat();
    }
    setGs(ng);
  }

  function startGame(hero) {
    const heroDeck = hero ? makeDeckFrom(hero.deckIds) : (activeDeck?.cardIds?.length ? makeDeckFrom(activeDeck.cardIds) : null);
    const heroName = hero ? hero.name : "You";
    const heroEmoji = hero ? hero.emoji : "🧙";
    const heroPortrait = getHeroPortraitFromStorage(hero);
    const heroCardBack = hero?.cardBack || activeDeck?.cardBack || null;
    setSelectedHero(hero || null);
    // Pick a random AI hero (different from player if possible)
    const aiHeroCandidates = HEROES.filter(h => !hero || h.id !== hero.id);
    const aiHero = aiHeroCandidates[Math.floor(Math.random() * aiHeroCandidates.length)] || HEROES[0];
    const aiDeck = makeDeckFrom(aiHero.deckIds);
    setGs({
      player: { ...initPlayer(heroName, false, heroDeck), heroId: hero?.id || null, maxMana: 1, mana: 1, armor: 0, ultimateUses: 0, ultimateUsedThisTurn: false, emoji: heroEmoji, portrait: heroPortrait, cardBack: heroCardBack },
      ai: { ...initPlayer(aiHero.name, true, aiDeck), heroId: aiHero.id, maxMana: 0, mana: 0, armor: 0, ultimateUses: 0, ultimateUsedThisTurn: false, portrait: getHeroPortraitFromStorage(aiHero), cardBack: aiHero.cardBack || null, emoji: aiHero.emoji },
    });
    setPhase("player_turn");
    setLog(["🎮 Game on! No cap."]);
    setWinner(null);
    setSelCard(null);
    setSelAtk(null);
    setTgtSpell(null);
    setHovTarget(null);
    setAiPlayHistory([]);
    setHoveredHistoryCard(null);
    setFlyingCard(null);
    setIsOverPlayZone(false);
    clearCiaUltimateSelection();
  }

  function startGameWithFade(hero) {
    if (matchFadeActive) return;
    setMatchFadeActive(true);
    requestAnimationFrame(() => setMatchFadeOpaque(true));
    setTimeout(() => {
      startGame(hero);
      requestAnimationFrame(() => setMatchFadeOpaque(false));
      setTimeout(() => setMatchFadeActive(false), 260);
    }, 200);
  }

  function handleCardDragStart(card) {
    if (phase !== "player_turn") return;
    setDraggingCard(card);
    setSelCard(card);
    getSFX().cardSelect();
  }

  function handleCardDragEnd(card, point) {
    setDraggingCard(null);
    if (card.type !== "minion") return;
    if (isPointInPlayZone(point)) playSelectedCard(card, { inPlayZone: true });
  }

  function handlePlayerDraw(state, manaInfo) {
    const before = state.player;
    const drawnPlayer = drawCard(before);
    const drawn = drawnPlayer.hand.find(card => !before.hand.some(old => old.uid === card.uid));
    if (drawn) {
      setDeckPulse(true);
      setPendingDrawCard(drawn);
      setTimeout(() => setDeckPulse(false), 220);
      setTimeout(() => setPendingDrawCard(curr => (curr?.uid === drawn.uid ? null : curr)), 900);
    }
    const fatigueDamage = drawnPlayer.lastFatigueDamage || 0;
    const fatigueBlocked = drawnPlayer.lastFatigueBlocked || 0;
    if (before.deck.length === 0 && (fatigueDamage > 0 || fatigueBlocked > 0)) {
      if (fatigueBlocked > 0 && fatigueDamage > 0) pushLog([`Fatigue! 3 damage (${fatigueBlocked} blocked by armor, ${fatigueDamage} to HP).`]);
      else if (fatigueBlocked > 0) pushLog([`Fatigue! 3 damage fully absorbed by armor.`]);
      else pushLog([`Fatigue! Deck empty: took ${fatigueDamage} damage.`]);
      toast("Fatigue: your deck is empty.");
    }
    return { ...state, player: { ...drawnPlayer, maxMana: manaInfo.pMax, mana: manaInfo.pMax } };
  }

  useEffect(() => {
    if (!gs) return;
    ["player", "ai"].forEach(side => {
      const board = gs[side].board.map(card => card.uid);
      const prev = prevBoardUids.current[side] || [];
      board.forEach(uid => {
        if (!prev.includes(uid)) registerSummonRune(uid);
      });
      prevBoardUids.current[side] = board;
    });
  }, [gs]);

  function castSpell(card, targetId) {
    getSFX().spellCast();
    const nh = gs.player.hand.filter(c => c.uid !== card.uid);
    let ng = { ...gs, player: { ...gs.player, hand: nh, mana: gs.player.mana - card.cost } };
    const r = applySpell(card.effectId || card.effect, targetId, ng, "player", card);
    ng = r.gs;
    pushLog(["✨ " + card.name + "!", ...r.log]);
    showSpotlight(card, "player");
    const w = checkWin(ng);
    if (w) {
      setWinner(w);
      setPhase("gameover");
      if (w === "player") getSFX().victory();
      else getSFX().defeat();
    }
    setGs(ng);
    setTgtSpell(null);
    setSelCard(null);
    setSelAtk(null);
    setHovTarget(null);
  }

  function cancelInteractions(message = "Cancelled.") {
    setSelCard(null);
    setSelAtk(null);
    setTgtSpell(null);
    setHovTarget(null);
    setIsOverPlayZone(false);
    clearCiaUltimateSelection();
    selAtkRef.current = null;
    if (message) toast(message);
  }

  function isPointInPlayZone(point) {
    if (!point) return false;
    const heroRect = playerHeroRef.current?.getBoundingClientRect();
    if (!heroRect) return false;
    // Broad release zone: anything above (or on) the player's hero line counts as a valid play/cast attempt.
    return point.y <= heroRect.bottom;
  }

  function playSelectedCard(card, ctx = {}) {
    if (!card || phase !== "player_turn") return;
    const hasMana = card.cost <= gs.player.mana;
    const hasBoardSpace = gs.player.board.length < 7;
    console.debug("[playSelectedCard]", { card: card.name, type: card.type, inPlayZone: !!ctx.inPlayZone, hasMana, hasBoardSpace });
    if (!hasMana) {
      getSFX().error();
      toast("Not enough Aura Points fam 💀");
      console.debug("[playBlocked]", "not_enough_mana");
      return;
    }
    if (card.type === "spell") {
      if ((card.targetType || card.targetingMode) === "none") {
        castSpell(card, null);
      } else {
        setTgtSpell(card);
        setSelCard(null);
        setIsOverPlayZone(false);
        toast("Pick a target for " + card.name + " 🎯");
      }
      return;
    }
    if (!hasBoardSpace) {
      getSFX().error();
      toast("Board full no cap");
      console.debug("[playBlocked]", "board_full");
      return;
    }
    getSFX().cardPlay();
    const nh = gs.player.hand.filter(c => c.uid !== card.uid);
    const minion = createMinionEntity(card);
    let ng = { ...gs, player: { ...gs.player, hand: nh, mana: gs.player.mana - card.cost, board: [...gs.player.board, minion] } };
    const r = playBattlecry(minion, ng, "player");
    ng = r.gs;
    pushLog(["🃏 " + card.name + " enters!", ...r.log]);
    showSpotlight(minion, "player");
    setGs(ng);
    setSelCard(null);
    setIsOverPlayZone(false);
  }

  function onHandClick(card) {
    if (phase !== "player_turn") return;
    if (ciaUltSelection) {
      getSFX().error();
      toast("Finish the CIA ultimate first.");
      return;
    }
    if (tgtSpell || selAtk) {
      cancelInteractions();
      return;
    }
    if (card.cost > gs.player.mana) {
      getSFX().error();
      toast("Not enough Aura Points fam 💀");
      return;
    }
    setSelCard(card);
    getSFX().cardSelect();
  }

  function onMyMinionClick(uid) {
    console.debug("[onMyMinionClick]", { uid, phase, selAtk, hasTgtSpell: !!tgtSpell });
    if (phase !== "player_turn") { console.debug("[onMyMinionClick] blocked: not player_turn", phase); return; }
    if (ciaUltSelection) {
      getSFX().error();
      toast("CIA ultimate is waiting on enemy targets.");
      return;
    }
    if (tgtSpell) {
      if (tgtSpell.targetType === "minion" || tgtSpell.targetType === "any") castSpell(tgtSpell, uid);
      return;
    }
    if (selAtk === uid) {
      setSelAtk(null);
      setHovTarget(null);
      selAtkRef.current = null;
      return;
    }
    const m = gs.player.board.find(minion => minion.uid === uid);
    if (!m) { console.debug("[onMyMinionClick] minion not found on board", uid); return; }
    console.debug("[onMyMinionClick] minion state", { summoningSick: m.summoningSick, canAttack: m.canAttack, atk: m.atk, keywords: m.keywords });
    if (m.summoningSick && !m.keywords?.includes("charge")) {
      getSFX().error();
      toast("Summoning sickness fr 😴");
      return;
    }
    if (m.canAttack === false) {
      getSFX().error();
      toast("Already attacked!");
      return;
    }
    if (m.atk === 0) {
      getSFX().error();
      toast("0 attack, can't fight");
      return;
    }
    getSFX().targetSelect();
    selAtkRef.current = getMinionRef(uid);
    setSelAtk(uid);
    setSelCard(null);
    setTgtSpell(null);
    setHovTarget(null);
    toast("Pick a target 🎯");
  }

  function onEnemyMinionClick(uid) {
    if (ciaUltSelection) {
      getSFX().targetSelect();
      toggleCiaMinionSelection(uid);
      return;
    }
    if ((!selAtk && !tgtSpell) || attackBusyRef.current) return;
    if (tgtSpell) {
      if (tgtSpell.targetType === "minion" || tgtSpell.targetType === "any") castSpell(tgtSpell, uid);
      return;
    }
    const aiHasTaunt = gs.ai.board.some(m => m.keywords?.includes("taunt"));
    const target = gs.ai.board.find(m => m.uid === uid);
    if (aiHasTaunt && !target?.keywords?.includes("taunt")) {
      getSFX().error();
      toast("Taunt is blocking!");
      return;
    }
    getSFX().minionAttack();
    resolveAttackWithPresentation({
      attackerUid: selAtk,
      attackerSide: "player",
      targetId: uid,
      defenderFxId: uid,
      onResolved: (r) => {
        if (r.log.includes("hero_hit") || r.log.some(l => l.includes("died"))) getSFX().minionDeath();
        pushLog(r.log.filter(l => !["hero_hit", "ai_hero_hit", "player_hero_hit", "minion_hit"].includes(l)));
        const w = checkWin(r.gs);
        if (w) {
          setWinner(w);
          setPhase("gameover");
          if (w === "player") getSFX().victory();
          else getSFX().defeat();
        }
        setGs(r.gs);
        setSelAtk(null);
        setHovTarget(null);
        selAtkRef.current = null;
      },
    });
  }

  function onEnemyHeroClick() {
    if (ciaUltSelection) return;
    if ((!selAtk && !tgtSpell) || attackBusyRef.current) return;
    const aiHasTaunt = gs.ai.board.some(m => m.keywords?.includes("taunt"));
    if (aiHasTaunt) {
      getSFX().error();
      toast("Taunt blocks the hero!");
      return;
    }
    if (tgtSpell && tgtSpell.targetType === "any") {
      castSpell(tgtSpell, "hero_ai");
      return;
    }
    if (selAtk) {
      getSFX().heroHit();
      resolveAttackWithPresentation({
        attackerUid: selAtk,
        attackerSide: "player",
        targetId: "hero",
        defenderFxId: "hero_ai",
        onResolved: (r) => {
          pushLog(r.log.filter(l => !["hero_hit", "ai_hero_hit", "player_hero_hit", "minion_hit"].includes(l)));
          const w = checkWin(r.gs);
          if (w) {
            setWinner(w);
            setPhase("gameover");
            if (w === "player") getSFX().victory();
            else getSFX().defeat();
          }
          setGs(r.gs);
          setSelAtk(null);
          setHovTarget(null);
          selAtkRef.current = null;
        },
      });
    }
  }

  function onEnemyHandCardClick(uid) {
    if (!ciaUltSelection || ciaUltSelection.maxHandCards <= 0) return;
    getSFX().cardSelect();
    toggleCiaHandSelection(uid);
  }

  function useUltimate() {
    if (!gs || phase !== "player_turn") return;
    const player = gs.player;
    const unlockedCharges = getUnlockedUltimateCharges(player.maxMana);
    const usedCount = player.ultimateUses || 0;
    const available = Math.max(0, Math.min(ULTIMATE_USE_MAX, unlockedCharges) - usedCount);
    if (available <= 0 || player.ultimateUsedThisTurn) {
      getSFX().error();
      toast("Ultimate not ready yet.");
      return;
    }

    const meta = getUltimateMeta({ id: player.heroId });
    let ng = gs;

    if (meta.id === "trump") {
      ng = destroyAllMinions(ng, "player");
      ng = damageHero(ng, "ai", 15);
      ng = damageHero(ng, "player", 10);
      pushLog(["🔥 The Japan Special!", "All minions destroyed. Enemy hero -15, your hero -10."]);
    } else if (meta.id === "cia") {
      const maxHandCards = Math.max(0, Math.min(2, 10 - gs.player.hand.length));
      setSelCard(null);
      setSelAtk(null);
      setTgtSpell(null);
      setHovTarget(null);
      selAtkRef.current = null;
      setCiaUltSelection({
        minionUids: [],
        handUids: [],
        maxMinions: 2,
        maxHandCards,
      });
      toast(maxHandCards > 0 ? "CIA ultimate: pick up to 2 enemy minions and up to 2 enemy hand cards." : "CIA ultimate: hand is full, so only minion control is available.");
      return;
    } else if (meta.id === "elon") {
      const summon = (cardDef) => {
        if (ng.player.board.length >= 7) return;
        ng = {
          ...ng,
          player: {
            ...ng.player,
            board: [...ng.player.board, createMinionEntity(cardDef)],
          },
        };
      };

      // +5 aura is TEMPORARY: only available this turn, does not raise maxMana.
      ng = {
        ...ng,
        player: {
          ...ng.player,
          mana: Math.min(10, (ng.player.mana || 0) + 5),
          tempAuraBonus: (ng.player.tempAuraBonus || 0) + 5,
          armor: (ng.player.armor || 0) + 10,
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
      pushLog(["⚙️ Future Tech!", "+5 Aura, +10 Armor, and 4 elite units deployed."]);
    } else {
      toast("This hero has no ultimate configured.");
      return;
    }

    ng = {
      ...ng,
      player: {
        ...ng.player,
        ultimateUses: (ng.player.ultimateUses || 0) + 1,
        ultimateUsedThisTurn: true,
      },
    };

    const w = checkWin(ng);
    if (w) {
      setWinner(w);
      setPhase("gameover");
      if (w === "player") getSFX().victory(); else getSFX().defeat();
    }
    setGs(ng);
  }

  function endTurn() {
    if (phase !== "player_turn" || ciaUltSelection) return;
    getSFX().endTurn();
    setSelCard(null); setSelAtk(null); setTgtSpell(null);
    setHovTarget(null); selAtkRef.current = null;
    setPhase("ai_turn");
    pushLog(["— Turn ended —"]);

    // Clear any lingering timers from a previous AI turn
    aiStepTimers.current.forEach(clearTimeout);
    aiStepTimers.current = [];

    const STEP_DELAY   = 1200; // ms between each enemy action
    const FLY_DURATION =  600; // ms for card to fly to the history panel

    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms);
      aiStepTimers.current.push(id);
      return id;
    };

    const playerEndTurn = resolveEndOfTurn(gs, "player");
    const baseGs = playerEndTurn.gs;
    if (playerEndTurn.log?.length) pushLog(playerEndTurn.log);
    setGs(baseGs);

    schedule(() => {
      const aiMax = Math.min(10, (baseGs.ai.maxMana || 0) + 1 + (baseGs.ai.pendingManaNextTurn || 0));
      const aiTurnState = startTurn(baseGs, "ai");
      const startGs = {
        ...aiTurnState,
        ai: { ...aiTurnState.ai, maxMana: aiMax, mana: aiMax, pendingManaNextTurn: 0 },
      };

      const { steps, finalGs } = runAiTurnSteps(startGs);

      if (steps.length === 0) {
        // AI did nothing — no cards, no attacks
        addAiAction("💤", "Enemy ended turn");
        finishAiTurn(finalGs);
        return;
      }

      // Execute steps one at a time with STEP_DELAY gaps
      let cursor = 0;

      function runNextStep() {
        if (cursor >= steps.length) {
          // All steps done — hand back to player
          finishAiTurn(finalGs);
          return;
        }

        const step = steps[cursor];
        cursor++;

        if (step.type === "play_card") {
          const label = step.verb === "casts" ? "Enemy casts:" : "Enemy plays:";
          const flyId = mkUid();
          let revealHandled = false;

          const finishReveal = () => {
            if (revealHandled) return;
            revealHandled = true;
            setAiPlayOverlay(null);
            // Fly animation — card travels from center to the left panel
            setFlyingCard({ card: step.card, id: flyId });
            schedule(() => {
              setFlyingCard(null);
              // Add to persistent history
              setAiPlayHistory(prev => [...prev, { ...step.card, _hid: flyId, _summary: `Enemy ${step.verb} ${step.card.name}` }]);
            }, FLY_DURATION);

            // Apply game state after overlay dismissed
            setGs(step.gs);
            const stepLog = step.log.filter(l => !["hero_hit","ai_hero_hit","player_hero_hit","minion_hit"].includes(l));
            pushLog(stepLog);
            addAiAction(step.card.emoji || "🤖", `Enemy ${step.verb} ${step.card.name}`);
            setAiActionHighlight(true);
            schedule(() => setAiActionHighlight(false), 500);

            // Check win after each card
            const w = checkWin(step.gs);
            if (w) { resolveWin(w, step.gs); return; }

            // Wait before next step
            schedule(runNextStep, STEP_DELAY);
          };

          // 1. Show center overlay
          const revealTimer = schedule(finishReveal, ENEMY_REVEAL_DURATION_MS);
          setAiPlayOverlay({
            card: step.card,
            label,
            onSkip: () => {
              clearTimeout(revealTimer);
              finishReveal();
            },
          });

        } else if (step.type === "attack") {
          const attacker = gs.ai.board.find(m => m.uid === step.attackerUid) || startGs.ai.board.find(m => m.uid === step.attackerUid);
          if (attacker) triggerAttackVisual(step.attackerUid, step.defenderUid, attacker.atk);
          schedule(() => {
            setGs(step.gs);
            const stepLog = step.log.filter(l => !["hero_hit","ai_hero_hit","player_hero_hit","minion_hit"].includes(l));
            pushLog(stepLog);
            addAiAction("⚔️", stepLog[0] || "Enemy attacks!");
            setAiActionHighlight(true);
            schedule(() => setAiActionHighlight(false), 500);

            const w = checkWin(step.gs);
            if (w) { resolveWin(w, step.gs); return; }

            schedule(runNextStep, STEP_DELAY * 0.6);
          }, ATTACK_IMPACT_DELAY_MS);
        }
      }

      runNextStep();
    }, 600);

    function resolveWin(w, ng) {
      setWinner(w); setPhase("gameover"); setGs(ng);
      if (w === "player") getSFX().victory(); else getSFX().defeat();
    }

    function finishAiTurn(ng) {
      const w = checkWin(ng);
      if (w) { resolveWin(w, ng); return; }
      const endTurnResolved = resolveEndOfTurn(ng, "ai");
      let nextTurnGs = startTurn(endTurnResolved.gs, "player");
      if (endTurnResolved.log?.length) pushLog(endTurnResolved.log);
      const pMax = Math.min(10, (nextTurnGs.player.maxMana || 0) + 1 + (nextTurnGs.player.pendingManaNextTurn || 0));
      nextTurnGs = { ...nextTurnGs, player: { ...nextTurnGs.player, maxMana: pMax, mana: pMax, pendingManaNextTurn: 0, ultimateUsedThisTurn: false, tempAuraBonus: 0 } };
      const finalNg = handlePlayerDraw(nextTurnGs, { pMax });
      getSFX().drawCard();
      pushLog(["✨ Your turn!"]);
      setGs(finalNg);
      setPhase("player_turn");
    }
  }

  const isTargeting = !!selAtk || !!tgtSpell;
  const enemyHandVisible = !!(gs?.visibility?.aiHandRevealed || ciaUltSelection);
  const aiHasTaunt = gs ? gs.ai.board.some(m => m.keywords?.includes("taunt")) : false;
  const playerUltimateMeta = gs ? getUltimateMeta({ id: gs.player.heroId }) : { id: "generic", name: "Ultimate" };
  const playerUnlockedUltCharges = gs ? getUnlockedUltimateCharges(gs.player.maxMana) : 0;
  const playerUltUsed = gs?.player?.ultimateUses || 0;
  const playerUltAvailable = Math.max(0, Math.min(ULTIMATE_USE_MAX, playerUnlockedUltCharges) - playerUltUsed);
  const playerUltCanUse = !!gs && phase === "player_turn" && playerUltAvailable > 0 && !gs.player.ultimateUsedThisTurn;
  const playerUltimateInfo = gs ? {
    name: playerUltimateMeta.name,
    unlockedCharges: Math.min(ULTIMATE_USE_MAX, playerUnlockedUltCharges),
    usedCount: Math.min(ULTIMATE_USE_MAX, playerUltUsed),
    canUse: playerUltCanUse,
    buttonLabel: playerUltCanUse ? "Use Ultimate" : gs.player.ultimateUsedThisTurn ? "Used This Turn" : playerUltAvailable <= 0 ? "Locked / Spent" : "Unavailable",
  } : null;
  const arrowFrom = selAtk ? selAtkRef.current : (tgtSpell ? playerHeroRef : null);
  const arrowTo = hovTarget === "hero_ai" ? enemyHeroRef : hovTarget ? getMinionRef(hovTarget) : null;
  const arrowColor = tgtSpell ? "#9b59dd" : "#EF9F27";
  const [cursorPos, setCursorPos] = useState(null);

  const handlePointerMove = useCallback((event) => {
    // Capture coordinates synchronously before the RAF fires (event may be recycled)
    const cx = event.clientX;
    const cy = event.clientY;
    if (pointerRafRef.current !== null) return; // already a frame pending — skip
    pointerRafRef.current = requestAnimationFrame(() => {
      pointerRafRef.current = null;
      const point = { x: cx, y: cy, yPage: cy + window.scrollY };
      setCursorPos({ x: point.x, y: point.yPage });
      if (selCard && !tgtSpell && !selAtk) {
        // getBoundingClientRect read is batched here, after all paints settle
        const inZone = isPointInPlayZone(point);
        setIsOverPlayZone(inZone);
      }
    });
  }, [selCard, tgtSpell, selAtk]);

  useEffect(() => {
    if (!isTargeting && !selCard) {
      setCursorPos(null);
      if (pointerRafRef.current !== null) {
        cancelAnimationFrame(pointerRafRef.current);
        pointerRafRef.current = null;
      }
    }
  }, [isTargeting, selCard]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && (selCard || selAtk || tgtSpell)) {
        event.preventDefault();
        cancelInteractions();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selCard, selAtk, tgtSpell]);
  const boardHitStyle = hitStop ? { transform: "scale(0.995)", transition: `transform ${UI_SMOOTH_TRANSITION_MS}ms ease` } : { transition: `transform ${UI_SMOOTH_TRANSITION_MS}ms ease` };

  if (phase === "hero_select") {
    return (
      <div style={{ height: "100dvh", minHeight: "100dvh", overflow: "hidden", position: "relative" }}>
        {devOpen && (
          <CardCreator
            onClose={() => setDevOpen(false)}
            savedDecks={savedDecks}
            onSavedDecksChange={setSavedDecks}
            activeDeck={activeDeck}
            onSelectDeck={setActiveDeck}
            onDevSettingsChange={setDevSettings}
          />
        )}
        <HeroSelect onSelect={hero => { getSFX().cardPlay(); startGameWithFade(hero); }} />
        <button
          onClick={() => setDevOpen(true)}
          style={{
            position: "fixed",
            top: 14,
            right: 14,
            zIndex: 1100,
            background: "rgba(6,12,22,0.9)",
            border: "1px solid #FAC775",
            color: "#FAC775",
            borderRadius: 8,
            padding: "7px 12px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: 0.4,
          }}
        >
          Card Creator ✨
        </button>
        {matchFadeActive && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "#000",
              opacity: matchFadeOpaque ? 1 : 0,
              transition: "opacity 220ms ease",
              zIndex: 1200,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    );
  }

  if (phase === "menu") {
    return (
      <div style={{ minHeight: 600, background: "#04080f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 40, position: "relative" }}>
        <style>{`@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}} @keyframes flashFade{0%{opacity:1}100%{opacity:0}} @keyframes floatUp{0%{transform:translateY(0)}50%{transform:translateY(-8px)}100%{transform:translateY(0)}}`}</style>
        {devOpen && <CardCreator onClose={() => setDevOpen(false)} savedDecks={savedDecks} onSavedDecksChange={setSavedDecks} activeDeck={activeDeck} onSelectDeck={setActiveDeck} />}
        <div style={{ fontSize: 11, color: "#EF9F27", fontWeight: 900, letterSpacing: 6, textTransform: "uppercase" }}>no cap gaming presents</div>
        <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", letterSpacing: 2, textAlign: "center", textShadow: "0 0 50px rgba(55,138,221,0.6), 0 0 100px rgba(127,119,221,0.3)", lineHeight: 1.1 }}>
          CHRONICALLY<br /><span style={{ color: "#378ADD" }}>ONLINE</span>
        </div>
        <div style={{ fontSize: 15, color: "#445", textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
          The Gen Z card game. Summon influencers. Cancel your enemies. Win the main character arc.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => setPhase("hero_select")} style={{ background: "linear-gradient(135deg,#1a4a8a,#378ADD)", color: "#fff", border: "none", borderRadius: 10, padding: "14px 40px", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 0 24px rgba(55,138,221,0.5)", letterSpacing: 1 }}>PLAY vs AI</button>
          <button onClick={() => setDevOpen(true)} style={{ background: "transparent", color: "#FAC775", border: "2px solid #FAC775", borderRadius: 10, padding: "14px 24px", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>Card Forge ✨</button>
        </div>
        {activeDeck && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(55,138,221,0.08)", border: "1px solid rgba(55,138,221,0.25)", borderRadius: 8, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, color: "#378ADD", fontWeight: 900, letterSpacing: 1 }}>DECK</div>
            <div style={{ fontSize: 12, color: "#85B7EB", fontWeight: 700 }}>{activeDeck.name}</div>
            <div style={{ fontSize: 10, color: "#334" }}>· {activeDeck.cardIds.length} cards</div>
            <button onClick={() => setActiveDeck(null)} style={{ marginLeft: 4, background: "transparent", border: "none", color: "#334", cursor: "pointer", fontSize: 11 }}>✕</button>
          </div>
        )}
        <div style={{ fontSize: 10, color: "#1a2030" }}>{getLib().length} cards in pool</div>
      </div>
    );
  }

  if (!gs) return null;

  return (
    <LayoutGroup>
      <div
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setCursorPos(null)}
        onClickCapture={(event) => {
          if (!selCard || tgtSpell || selAtk) return;
          const inZone = isPointInPlayZone({ x: event.clientX, y: event.clientY });
          setIsOverPlayZone(inZone);
          if (inZone) playSelectedCard(selCard, { inPlayZone: true });
          else console.debug("[playBlocked]", "click_outside_valid_cast_zone");
        }}
        onContextMenu={(event) => {
          if (!(selCard || selAtk || tgtSpell)) return;
          event.preventDefault();
          cancelInteractions();
        }}
        className="game-root"
        style={{ height: "100dvh", minHeight: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", color: "#fff", position: "relative", userSelect: "none" }}
      >
      <style>{`@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}} @keyframes flashFade{0%{opacity:1}100%{opacity:0}} @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
      {devOpen && <CardCreator onClose={() => setDevOpen(false)} savedDecks={savedDecks} onSavedDecksChange={setSavedDecks} activeDeck={activeDeck} onSelectDeck={setActiveDeck} />}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 650 }}>
        {damageNumbers.map(n => (
          <DamageNumber key={n.id} x={n.x} y={n.y} text={n.text} color={n.color} />
        ))}
      </div>
      {spotlightCard && (
        <div style={{ position: "fixed", top: 140, left: 16, width: 180, padding: 12, background: "rgba(4,8,15,0.92)", border: "1px solid rgba(250,199,117,0.6)", borderRadius: 12, boxShadow: "0 0 30px rgba(239,159,39,0.9)", zIndex: 200, color: "#fff", pointerEvents: "none" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.8 }}>{spotlightOwner === "player" ? "You played" : "Enemy played"}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
            <div style={{ fontSize: 36, marginRight: 10, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.7))" }}>{spotlightCard.emoji || "🃏"}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{spotlightCard.name}</div>
              <div style={{ fontSize: 11, color: "#cacaca", maxWidth: 130 }}>{spotlightCard.desc}</div>
            </div>
          </div>
        </div>
      )}

      {isTargeting && arrowFrom && (arrowTo || cursorPos) && (
        <ArrowOverlay fromRef={arrowFrom} toRef={arrowTo} cursor={cursorPos} color={arrowColor} />
      )}
      {!!attackVisual && (
        <ArrowOverlay
          fromRef={getRefById(attackVisual.attacker)}
          toRef={getRefById(attackVisual.defender)}
          color="#ff735a"
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #090f1a", background: "#060c16" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#378ADD", letterSpacing: 2 }}>CHRONICALLY ONLINE</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDevOpen(true)} style={{ background: "transparent", border: "1px solid #FAC775", color: "#FAC775", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 800 }}>Card Creator ✨</button>
          <button onClick={() => setPhase("hero_select")} style={{ background: "transparent", border: "1px solid #1e2e3e", color: "#445", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>New Game</button>
        </div>
      </div>

      {toastMsg && (
        <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", background: "#060f1e", border: "1px solid #378ADD", borderRadius: 8, padding: "8px 22px", fontSize: 13, color: "#85B7EB", zIndex: 200, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 0 20px rgba(55,138,221,0.35)" }}>{toastMsg}</div>
      )}

      {winner && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: winner === "player" ? "#1D9E75" : "#E24B4A", textShadow: "0 0 50px " + (winner === "player" ? "rgba(29,158,117,0.8)" : "rgba(226,75,74,0.8)"), textAlign: "center" }}>
            {winner === "player" ? "W IN THE CHAT 🏆" : "L + RATIO 💀"}
          </div>
          <div style={{ fontSize: 16, color: "#445" }}>{winner === "player" ? "You understood the assignment fr fr." : "It's not giving what it's supposed to give."}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPhase("hero_select")} style={{ background: "#378ADD", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>Play Again</button>
            <button onClick={() => setDevOpen(true)} style={{ background: "transparent", color: "#FAC775", border: "2px solid #FAC775", borderRadius: 8, padding: "12px 22px", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>Edit Cards ✨</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           BOARD ARENA — 4-zone Hearthstone layout
           Zone 1 (18%): enemy area   Zone 2 (22%): enemy battlefield
           Zone 3 (22%): player battlefield   Zone 4 (38%): player area
      ══════════════════════════════════════════════════════════════════ */}
      <div className="board-arena" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", position: "relative" }}>

        {/* ── Zone 1 — Enemy Area ───────────────────────────────── */}
        <div className="enemy-area-zone" style={{ flex: "0 0 18%", minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 24px 6px", position: "relative", overflow: "hidden" }}>
          {/* AI hero + mana + deck row */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, zIndex: 2, position: "fixed", left: `${enemyHeroLayout.x}%`, top: `${enemyHeroLayout.y}%`, transform: "translate(-50%, -50%)" }}>
            <div style={{ fontSize: 9, color: "#334" }}>deck: {gs.ai.deck.length}</div>
            <div style={{ position: "relative", display: "inline-flex", transform: `scale(${enemyHeroLayout.size / 150})`, transformOrigin: "center center" }}>
              <HeroPortrait name="AI Nemesis" hp={gs.ai.hp} maxHp={gs.ai.maxHp} emoji="💀" portrait={devSettings.enemyPortrait || gs.ai.portrait} armor={gs.ai.armor || 0} isAI heroRef={enemyHeroRef} isTarget={isTargeting && !aiHasTaunt} onClick={onEnemyHeroClick} />
              {aiActionHighlight && (
                <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: "rgba(239,159,39,0.92)", color: "#1a0a00", fontSize: 8, fontWeight: 900, letterSpacing: 0.8, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 0 8px rgba(239,159,39,0.6)", zIndex: 10 }}>
                  ⚡ ACTING
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: gs.ai.maxMana }).map((_, i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i < gs.ai.mana ? "#378ADD" : "#0d1a2a", border: "1px solid #1a3a5a" }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Zone 2 — Enemy Battlefield ────────────────────────── */}
        {(() => {
          const playerSize = computeBoardCardSize(gs?.player?.board?.length || 0, playerBoardW);
          const enemySize  = computeBoardCardSize(gs?.ai?.board?.length || 0, enemyBoardW);
          const showBreathing = visualCfg.cardIdleBreathing !== false;
          const showParticles = visualCfg.ambientParticles !== false;
          const showLabels = visualCfg.showZoneLabels === true;
          return (
            <>
            <div
              ref={enemyBoardContainerRef}
              className="board-zone board-zone--enemy"
              style={{ position: "absolute", top: `${enemyBattlefieldLayout.y}%`, left: 0, right: 0, height: `${enemyBattlefieldLayout.height}%`, minHeight: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: BOARD_CARD_GAP_PX, padding: `8px ${BOARD_ZONE_PAD_X_PX}px`, ...boardHitStyle, ...(draggingCard ? { borderColor: "#FAC775", boxShadow: "0 0 16px rgba(250,199,117,0.5)" } : {}) }}
            >
              {showParticles && <BoardAmbience color="rgba(68,128,196,0.18)" zone="enemy" />}
              {showLabels && gs.ai.board.length === 0 && <div className="board-zone-empty-label">— enemy board —</div>}
              <AnimatePresence initial={false}>
                {gs.ai.board.map(m => {
                  const ref = getMinionRef(m.uid);
                  return (
                    <BoardMinion
                      key={m.uid} minion={m} minionRef={ref}
                      cardW={enemySize.w} cardH={enemySize.h} showBreathing={showBreathing}
                      isSelected={!!ciaUltSelection?.minionUids.includes(m.uid)}
                      isTarget={(isTargeting && (!aiHasTaunt || m.keywords?.includes("taunt"))) || !!ciaUltSelection}
                      isAttacking={attackVisual?.attacker === m.uid}
                      isDefending={attackVisual?.defender === m.uid}
                      impactKey={attackVisual?.key}
                      showRune={summonRunes.includes(m.uid)}
                      attackUp={false}
                      onClick={() => onEnemyMinionClick(m.uid)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {/* hairline between battlefield zones */}
            {visualCfg.showBattlefieldDivider && <div style={{ position: "absolute", left: 32, right: 32, top: `${playerBattlefieldLayout.y}%`, height: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />}

            {/* ── Zone 3 — Player Battlefield ───────────────────────── */}
            <div
              ref={playerBoardContainerRef}
              className={`board-zone board-zone--player${isOverPlayZone && !!selCard && !tgtSpell ? " board-zone--drop-active" : ""}`}
              style={{ position: "absolute", top: `${playerBattlefieldLayout.y}%`, left: 0, right: 0, height: `${playerBattlefieldLayout.height}%`, minHeight: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: BOARD_CARD_GAP_PX, padding: `8px ${BOARD_ZONE_PAD_X_PX}px`, ...boardHitStyle }}
            >
              {showParticles && <BoardAmbience color="rgba(40,138,111,0.2)" zone="player" />}
              {showLabels && gs.player.board.length === 0 && <div className="board-zone-empty-label">— your board —</div>}
              <AnimatePresence initial={false}>
                {gs.player.board.map(m => {
                  const ref = getMinionRef(m.uid);
                  return (
                    <BoardMinion
                      key={m.uid} minion={m} minionRef={ref}
                      cardW={playerSize.w} cardH={playerSize.h} showBreathing={showBreathing}
                      isSelected={selAtk === m.uid}
                      isTarget={!!(tgtSpell && (tgtSpell.targetType === "minion" || tgtSpell.targetType === "any"))}
                      isAttacking={attackVisual?.attacker === m.uid}
                      isDefending={attackVisual?.defender === m.uid}
                      impactKey={attackVisual?.key}
                      showRune={summonRunes.includes(m.uid)}
                      attackUp={true}
                      onClick={() => { console.debug("[BoardMinion onClick] uid=", m.uid); onMyMinionClick(m.uid); }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
            </>
          );
        })()}

        {/* ── Zone 4 — Player Area ──────────────────────────────── */}
        {/* overflow: visible so fixed hand cards can overlap upward */}
        {/* pointerEvents: none so this flex shell doesn't occlude the absolutely-positioned */}
        {/* player battlefield zone (which is a sibling earlier in DOM order but same z-index). */}
        {/* Interactive children (hero, end-turn btn) use position:fixed + pointerEvents:auto */}
        {/* so they are unaffected by this parent setting. */}
        <div className="player-area-zone" style={{ flex: 1, minHeight: 0, position: "relative", overflow: "visible", pointerEvents: "none" }}>

          {/* Player hero — fixed to viewport, sits above the arc hand */}
          <div style={{ position: "fixed", left: `${playerHeroLayout.x}%`, top: `${playerHeroLayout.y}%`, transform: `translate(-50%, -50%) scale(${playerHeroLayout.size / 150})`, transformOrigin: "center center", zIndex: 72, pointerEvents: "auto", filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.70))" }}>
            <HeroPortrait name={gs.player.name} hp={gs.player.hp} maxHp={gs.player.maxHp} emoji={gs.player.emoji || "🧙"} portrait={devSettings.playerPortrait || gs.player.portrait} armor={gs.player.armor || 0} ultimateInfo={playerUltimateInfo} onUltimateClick={useUltimate} isAI={false} heroRef={playerHeroRef} showName={false} />
          </div>

          {/* End Turn button — fixed to viewport right, above the hand arc */}
          <div style={{ position: "fixed", left: `${endTurnBtnLayout.x}%`, top: `${endTurnBtnLayout.y}%`, transform: "translate(-50%, -50%)", zIndex: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
            {ciaUltSelection && (
              <div style={{ minWidth: 220, background: "rgba(5,16,26,0.94)", border: "1px solid #6dc6d6", borderRadius: 10, padding: "10px 12px", boxShadow: "0 0 18px rgba(109,198,214,0.24)" }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#6dc6d6", textAlign: "center", marginBottom: 6 }}>
                  Deep State Download
                </div>
                <div style={{ fontSize: 11, color: "#c5d8e6", textAlign: "center", lineHeight: 1.4, marginBottom: 8 }}>
                  Select up to 2 enemy minions and up to {ciaUltSelection.maxHandCards} enemy hand cards.
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8, fontSize: 10, color: "#7ea7bc" }}>
                  <span>Minions {ciaUltSelection.minionUids.length}/2</span>
                  <span>Cards {ciaUltSelection.handUids.length}/{ciaUltSelection.maxHandCards}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={confirmCiaUltimate}
                    style={{ flex: 1, background: "linear-gradient(135deg,#0c4454,#15758a)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => cancelInteractions("CIA ultimate cancelled.")}
                    style={{ flex: 1, background: "transparent", border: "1px solid #35566a", color: "#8fa6b4", borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {isTargeting && (
              <button
                onClick={() => { setSelAtk(null); setTgtSpell(null); setSelCard(null); setHovTarget(null); selAtkRef.current = null; toast("Cancelled."); }}
                style={{ background: "transparent", border: "1px solid #E24B4A", color: "#E24B4A", borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: 800, whiteSpace: "nowrap" }}
              >
                Cancel
              </button>
            )}
            <motion.button
              onClick={endTurn}
              disabled={phase !== "player_turn"}
              animate={phase === "player_turn" ? { boxShadow: ["0 0 16px rgba(13,128,80,0.5)", "0 0 28px rgba(13,128,80,0.85)", "0 0 16px rgba(13,128,80,0.5)"] } : { boxShadow: "none" }}
              transition={phase === "player_turn" ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
              style={{ background: phase === "player_turn" ? "linear-gradient(135deg,#0a5030,#0d8050)" : "#090f0c", color: phase === "player_turn" ? "#fff" : "#223", border: "none", borderRadius: 8, padding: "12px 18px", fontSize: 13, fontWeight: 900, cursor: phase === "player_turn" ? "pointer" : "not-allowed", transition: `all ${UI_SMOOTH_TRANSITION_MS}ms ease`, minWidth: 110, whiteSpace: "nowrap" }}
            >
              {phase === "ai_turn" ? "💀 AI..." : "End Turn ✦"}
            </motion.button>
          </div>

          {/* Player stats — fixed to viewport right, stacked below End Turn */}
          <div style={{ position: "fixed", left: `${auraIndicatorLayout.x}%`, top: `${auraIndicatorLayout.y}%`, transform: "translate(-50%, -50%)", zIndex: 120, pointerEvents: "none" }}>
            <div style={{ background: "linear-gradient(135deg,#1a3a6a,#0d2244)", border: "1px solid #378ADD", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 900, color: "#aad4ff", boxShadow: "0 0 10px rgba(55,138,221,0.45)", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
              {gs.player.mana}/{gs.player.maxMana} Aura Points
            </div>
          </div>

          <div style={{ position: "fixed", left: `${deckHandIndicatorLayout.x}%`, top: `${deckHandIndicatorLayout.y}%`, transform: "translate(-50%, -50%)", zIndex: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
            {/* Pending draw card — floats above the pills */}
            <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 10, width: 100, height: 148, pointerEvents: "none" }}>
              <AnimatePresence initial={false}>
                {pendingDrawCard && (() => {
                  const rc = pendingDrawCard ? (RC[pendingDrawCard.rarity || "common"] || RC.common) : RC.common;
                  return (
                    <motion.div
                      key={pendingDrawCard.uid}
                      initial={{ opacity: 0.8, y: -20 }}
                      animate={{ opacity: 0.95, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      style={{ width: 100, minWidth: 100, height: 148, background: rc.bg, border: "2px solid " + rc.border, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", boxShadow: "0 6px 20px rgba(0,0,0,0.45)" }}
                    >
                      <div style={{ fontSize: 48, filter: "drop-shadow(0 3px 8px " + rc.glow + ")" }}>{pendingDrawCard.emoji || "🃏"}</div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
            <motion.div animate={deckPulse ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.4 }} style={{ display: "inline-block" }}>
              <div style={{ minWidth: 120, background: "linear-gradient(135deg,#111b2e,#0a1220)", border: "1px solid #2b4f78", borderRadius: 999, padding: "4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: "0 0 10px rgba(55,138,221,0.2)" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#89a8cc", textTransform: "uppercase", letterSpacing: 0.7 }}>Deck</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#d9ecff", lineHeight: 1 }}>{gs.player.deck.length}</span>
              </div>
            </motion.div>
            <div style={{ minWidth: 120, background: "linear-gradient(135deg,#111b2e,#0a1220)", border: "1px solid #2b4f78", borderRadius: 999, padding: "4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, boxShadow: "0 0 10px rgba(55,138,221,0.2)" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#89a8cc", textTransform: "uppercase", letterSpacing: 0.7 }}>Hand</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#d9ecff", lineHeight: 1 }}>{gs.player.hand.length}</span>
            </div>
          </div>

          {/* Game log — fixed, sits just above the player hero */}
          <div style={{ position: "fixed", bottom: 390, left: "50%", transform: "translateX(-50%)", width: "clamp(260px, 40vw, 480px)", maxHeight: 22, overflow: "hidden", background: "rgba(3,6,9,0.55)", borderRadius: 4, display: "flex", flexDirection: "column-reverse", pointerEvents: "none", zIndex: 60 }}>
            {[...log].reverse().slice(0, 1).map((l, i) => {
              const special = l.startsWith("—") || l.startsWith("✨") || l.startsWith("🎮") || l.startsWith("🃏") || l.startsWith("AI");
              return <div key={i} style={{ fontSize: 9, color: special ? "#1a3a5a" : "#1a2530", paddingLeft: 8, lineHeight: "22px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{l}</div>;
            })}
          </div>

        </div>{/* end Zone 4 */}

      </div>{/* end board-arena */}

      {/* ── Enemy Hand Fan — fixed to viewport top, face-down cards ── */}
      {/* Rendered outside board-arena so position:fixed is always viewport-relative */}
      {/* (inside overflow:hidden flex ancestors it could be mis-anchored in Safari/Chrome) */}
      {(() => {
        const n = gs.ai.hand.length;
        const showingCards = enemyHandVisible;
        const SPACING = showingCards ? 46 : 20;
        const fanW = n > 0 ? Math.max(showingCards ? 84 : 54, (n - 1) * SPACING + (showingCards ? 78 : 42)) : 54;
        const maxAngle = Math.min(n * Math.max(0, enemyHandLayout.fanAngle || 0), 40);
        const angleStep = n > 1 ? maxAngle / (n - 1) : 0;
        return (
          <div style={{ position: "fixed", top: `${enemyHandLayout.y}%`, left: "50%", transform: "translateX(-50%)", zIndex: 65, pointerEvents: showingCards ? "auto" : "none" }}>
            <div style={{ position: "relative", width: fanW, height: showingCards ? 112 : 56, flexShrink: 0 }}>
              {n === 0
                ? <div style={{ fontSize: 9, color: "#1a2530", lineHeight: "56px", textAlign: "center" }}>empty</div>
                : gs.ai.hand.map((card, idx) => {
                    const mid = (n - 1) / 2;
                    const angle = (idx - mid) * angleStep;
                    const xOff = (idx - mid) * SPACING;
                    return (
                      <div key={idx} style={{
                        position: "absolute", top: 0, left: "50%",
                        transform: `translateX(calc(-50% + ${xOff}px)) rotate(${angle}deg)`,
                        transformOrigin: "center top",
                        zIndex: idx,
                        pointerEvents: showingCards ? "auto" : "none",
                      }}>
                        {showingCards ? (
                          <div style={{ transform: "scale(0.42)", transformOrigin: "top center" }}>
                            <HandCard
                              card={card}
                              selected={!!ciaUltSelection?.handUids.includes(card.uid)}
                              disabled={false}
                              onClick={() => onEnemyHandCardClick(card.uid)}
                              dragEnabled={false}
                            />
                          </div>
                        ) : (
                          <CardBack size={38} imagePath={gs.ai.cardBack || selectedHero?.cardBack || ""} />
                        )}
                      </div>
                    );
                  })
              }
            </div>
          </div>
        );
      })()}

      {/* ── Player Arc Hand — fixed to viewport bottom, fans up ── */}
      {(() => {
        const hand = gs.player.hand;
        const n = hand.length;

        // Card size: clamp 80–120px, shrink for large hands
        const CARD_W = Math.round(Math.max(80, Math.min(120, n <= 4 ? 120 : n <= 6 ? 108 : n <= 8 ? 96 : 80)));
        const CARD_H = Math.round(CARD_W * (246 / 174));

        // Horizontal spread: use real viewport width so all cards always fit
        const vw = typeof window !== "undefined" ? window.innerWidth : 480;
        const MAX_SPREAD_PX = Math.min(vw - 48, 560);
        const X_STEP = n <= 1 ? 0 : Math.min(CARD_W * 0.78, MAX_SPREAD_PX / Math.max(1, n - 1));

        // Arc: edge cards drop DOWN (positive y = down), center card is highest
        const baseAngle = playerHandLayout.fanAngle;
        const ANGLE_STEP = n <= 4 ? baseAngle : n <= 7 ? baseAngle * 0.7 : baseAngle * 0.5;
        const CURVE_K    = n <= 4 ? 5 : n <= 7 ? 3   : 2;

        // Selection lift: card moves further up when selected
        const SELECTION_LIFT = 28;

        // Container sits at the screen bottom; tall enough for center card + lift buffer
        const BOTTOM_INSET = 6; // gap between card bottom and screen edge
        const CONTAINER_H = CARD_H + SELECTION_LIFT + BOTTOM_INSET + 4;

        function arcFor(i) {
          const mid = (n - 1) / 2;
          const normalized = i - mid;
          const x = normalized * X_STEP;
          const y = Math.pow(Math.abs(normalized), 2) * CURVE_K;
          const rotate = normalized * ANGLE_STEP;
          return { x, y, rotate };
        }

        return (
          <div style={{
            position: "fixed",
            top: `${playerHandLayout.y}%`,
            left: 0,
            right: 0,
            height: CONTAINER_H,
            overflow: "visible",
            zIndex: 50,
            pointerEvents: "none",       // container transparent to clicks
            transform: "translateY(-100%)",
          }}>
            {n === 0 && (
              <div style={{ position: "absolute", bottom: BOTTOM_INSET + 8, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#1a2030", fontSize: 13, pointerEvents: "none" }}>
                No cards — topdeck mode
              </div>
            )}
            <AnimatePresence initial={false}>
              {hand.map((card, i) => {
                const { x, y, rotate } = arcFor(i);
                const isSelected = !!(selCard && selCard.uid === card.uid);
                const canDrag = phase === "player_turn" && card.type === "minion" && card.cost <= gs.player.mana;
                return (
                  <motion.div
                    key={card.uid}
                    initial={{ opacity: 0, y: 60, x, rotate, scale: 0.85 }}
                    animate={{ opacity: 1, y: isSelected ? y - SELECTION_LIFT : y, x, rotate, scale: 1 }}
                    exit={{ opacity: 0, y: 80, x, rotate, scale: 0.7, transition: { duration: 0.22 } }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    style={{
                      position: "absolute",
                      bottom: BOTTOM_INSET,
                      left: "50%",
                      marginLeft: -(CARD_W / 2),
                      transformOrigin: "50% 100%",   // rotate from bottom-center
                      zIndex: isSelected ? 40 : 10 + i,
                      pointerEvents: "auto",          // cards are interactive
                    }}
                    onMouseEnter={e => { e.currentTarget.style.zIndex = String(isSelected ? 42 : 35); }}
                    onMouseLeave={e => { e.currentTarget.style.zIndex = String(isSelected ? 40 : 10 + i); }}
                  >
                    <HandCard
                      card={card}
                      selected={isSelected}
                      disabled={card.cost > gs.player.mana || phase !== "player_turn"}
                      onClick={() => onHandClick(card)}
                      dragEnabled={canDrag}
                      onDragStart={() => handleCardDragStart(card)}
                      onDragEnd={(point) => handleCardDragEnd(card, point)}
                      width={CARD_W}
                      height={CARD_H}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* ── AI Action Log (right side, ephemeral) ── */}
      <div style={{ position: "fixed", right: 8, top: 120, width: 172, zIndex: 150, display: "flex", flexDirection: "column", gap: 5, pointerEvents: "none" }}>
        <AnimatePresence>
          {aiActions.map(a => (
            <motion.div
              key={a.id}
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.45, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              style={{ background: "rgba(4,8,20,0.92)", border: "1px solid rgba(55,138,221,0.3)", borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "flex-start", gap: 7, boxShadow: "0 4px 14px rgba(0,0,0,0.6)" }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>{a.emoji}</span>
              <span style={{ fontSize: 10, color: "#85B7EB", lineHeight: 1.4 }}>{a.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Enemy Play History panel (left side, persistent) ── */}
      <div style={{ position: "fixed", left: 0, top: 44, bottom: 0, width: 148, zIndex: 140, pointerEvents: selCard ? "none" : "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "rgba(4,6,14,0.88)", borderRight: "1px solid #0d1525", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px 5px", fontSize: 8, fontWeight: 900, color: "#1a3050", letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid #0d1525", flexShrink: 0 }}>
            Enemy played
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence initial={false}>
              {aiPlayHistory.map((card) => {
                const rcH = RC[card.rarity || "common"];
                return (
                  <motion.div
                    key={card._hid}
                    initial={{ x: -120, opacity: 0, scale: 0.85 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.25 } }}
                    transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0 }}
                    onMouseEnter={() => setHoveredHistoryCard(card)}
                    onMouseLeave={() => setHoveredHistoryCard(prev => (prev?._hid === card._hid ? null : prev))}
                    style={{
                      background: rcH.bg,
                      border: "1px solid " + rcH.border,
                      borderRadius: 8,
                      padding: "5px 7px",
                      display: "flex", alignItems: "center", gap: 7,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5), 0 0 8px " + rcH.glow,
                      flexShrink: 0,
                      pointerEvents: "auto",
                      cursor: "default",
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{card.emoji || "🃏"}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                      <div style={{ fontSize: 8, color: rcH.label, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{card.rarity}</div>
                      <div style={{ fontSize: 7, color: "#7f96b8", lineHeight: 1.2, marginTop: 2, maxHeight: 18, overflow: "hidden" }}>{card._summary || "Enemy played this card"}</div>
                      {card.type === "minion" && (
                        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 8, color: "#ff9988", fontWeight: 900 }}>⚔{card.atk}</span>
                          <span style={{ fontSize: 8, color: "#88ffaa", fontWeight: 900 }}>♥{card.hp}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 9, fontWeight: 900, color: "#aad4ff", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>{card.cost}</div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {aiPlayHistory.length === 0 && (
              <div style={{ fontSize: 9, color: "#0d1525", textAlign: "center", marginTop: 12 }}>nothing yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Flying card: center → history panel ── */}
      <AnimatePresence>
        {flyingCard && (() => {
          return (
            <motion.div
              key={flyingCard.id}
              initial={{ opacity: 1, scale: 1, x: "-50%", y: "-50%", left: `${LEFT_REVEAL_LEFT_PX + REVEAL_CARD_WIDTH_PX / 2}px`, top: `${LEFT_REVEAL_TOP_PX + REVEAL_CARD_HEIGHT_PX / 2}px` }}
              animate={{ opacity: 0, scale: 0.45, x: "-50%", y: "-50%", left: "74px", top: "160px" }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "fixed", zIndex: 820, pointerEvents: "none",
                width: 100, height: 140, borderRadius: 12, overflow: "hidden",
              }}
            >
              <TemplateCardFace card={flyingCard.card} width={100} height={140} />
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Left-side enemy reveal ── */}
      <AnimatePresence>
        {aiPlayOverlay && (() => {
          const card = aiPlayOverlay.card;
          return (
            <motion.div
              key={"overlay-" + card.name}
              initial={{ opacity: 0, x: -16, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.22, ease: "easeOut" } }}
              exit={{ opacity: 0, x: -22, scale: 0.94, transition: { duration: 0.22, ease: "easeIn" } }}
              style={{ position: "fixed", top: LEFT_REVEAL_TOP_PX, left: LEFT_REVEAL_LEFT_PX, width: REVEAL_CARD_WIDTH_PX, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 860, pointerEvents: "none" }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, color: "#FAC775", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, textShadow: "0 0 18px rgba(239,159,39,0.85)" }}>{aiPlayOverlay.label}</div>
              <div onClick={() => aiPlayOverlay.onSkip && aiPlayOverlay.onSkip()} style={{ width: REVEAL_CARD_WIDTH_PX, height: REVEAL_CARD_HEIGHT_PX, borderRadius: 22, overflow: "hidden", pointerEvents: "auto", cursor: "pointer", boxShadow: "0 24px 60px rgba(0,0,0,0.85)" }}>
                <TemplateCardFace card={card} width={REVEAL_CARD_WIDTH_PX} height={REVEAL_CARD_HEIGHT_PX} />
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: "#a9bfdc", letterSpacing: 0.25, textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>Click card to skip</div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredHistoryCard && (() => {
          const card = hoveredHistoryCard;
          return (
            <motion.div
              key={"history-preview-" + card._hid}
              initial={{ opacity: 0, x: -24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -18, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              style={{ position: "fixed", left: 164, top: 74, width: 190, minHeight: 260, borderRadius: 16, padding: 10, zIndex: 850, pointerEvents: "none", boxShadow: "0 14px 32px rgba(0,0,0,0.7)" }}
            >
              <TemplateCardFace card={card} width={170} height={240} />
              <div style={{ marginTop: 6, fontSize: 8, color: "#8aa8cc", textAlign: "center" }}>{card._summary || "Enemy played this card."}</div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {matchFadeActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            opacity: matchFadeOpaque ? 1 : 0,
            transition: "opacity 220ms ease",
            zIndex: 1200,
            pointerEvents: "none",
          }}
        />
      )}

      {selCard && !tgtSpell && cursorPos && (
        <div style={{ position: "fixed", left: cursorPos.x - 53, top: cursorPos.y - 73, width: 106, pointerEvents: "none", zIndex: 1000, opacity: 0.95 }}>
          <div style={{ background: "rgba(6,10,18,0.95)", border: "1px solid #378ADD", borderRadius: 10, padding: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.55)" }}>
            <div style={{ fontSize: 24, textAlign: "center", marginBottom: 2 }}>{selCard.emoji || "🃏"}</div>
            <div style={{ fontSize: 10, fontWeight: 800, textAlign: "center", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selCard.name}</div>
            <div style={{ fontSize: 9, textAlign: "center", color: isOverPlayZone ? "#5fd68a" : "#85B7EB", marginTop: 3 }}>
              {isOverPlayZone ? "Click to play" : "Move to cast zone"}
            </div>
          </div>
        </div>
      )}

    </div></LayoutGroup>
  );
}



