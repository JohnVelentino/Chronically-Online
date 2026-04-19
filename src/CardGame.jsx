import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { getLib, RC, HEROES, getHeroDeckIds } from "./data/cards.js";
import { getSFX } from "./audio/sfx.js";
import { drawCard, initPlayer, makeDeckFrom, mkUid, mulliganHand } from "./engine/gameState.js";
import { applySpell, applyZuckUltimate, doAttack, playBattlecry, createMinionEntity, damageHero, destroyAllMinions, resolveEndOfTurn, revealHand, startTurn, stealCardFromHandByUid, takeControlOfMinion } from "./engine/combat.js";
import { runAiTurnSteps } from "./engine/ai.js";
import ArrowOverlay from "./components/ArrowOverlay.jsx";
import BoardMinion from "./components/BoardMinion.jsx";
import BoardAmbience from "./components/BoardAmbience.jsx";
import CardCreator from "./components/CardCreator.jsx";
import HandCard from "./components/HandCard.jsx";
import MulliganScreen from "./components/MulliganScreen.jsx";
import RulesScreen from "./components/RulesScreen.jsx";
import HeroPortrait from "./components/HeroPortrait.jsx";
import DamageNumber from "./components/DamageNumber.jsx";
import CardBack from "./components/CardBack.jsx";
import HeroSelect from "./components/HeroSelect.jsx";
import TemplateCardFace from "./components/TemplateCardFace.jsx";
import UltimateTooltip from "./components/UltimateTooltip.jsx";
import useDevConfig from "./dev/useDevConfig.js";

const CANVAS_W = 1600;
const CANVAS_H = 900;
const ATTACK_IMPACT_DELAY_MS = 260;
const ATTACK_CLEANUP_BUFFER_MS = 140;
const ENEMY_REVEAL_DURATION_MS = 2500;
const ATTACK_VISUAL_HOLD_MS = 500;
const REVEAL_CARD_WIDTH_PX = 248;
const REVEAL_CARD_HEIGHT_PX = 352;
const LEFT_REVEAL_TOP_PX = 180;
const LEFT_REVEAL_LEFT_PX = 480;
const UI_SMOOTH_TRANSITION_MS = 180;
const BOARD_ZONE_MIN_H_PX = 262;
const BOARD_ZONE_GAP_PX = 14;
const BOARD_ZONE_PAD_X_PX = 22;
const BOARD_STAGE_SHIFT_UP_PX = 20;
const ULTIMATE_USE_MAX = 2;
const HERO_PORTRAIT_STORAGE_PREFIX = "heroPortrait:";

const BOARD_CARD_MIN_W = 80;
const BOARD_CARD_MAX_W = 126;
const BOARD_CARD_ASPECT = 176 / 132;
const BOARD_SIDE_PAD_PX = 24;
const BOARD_CARD_GAP_PX = 14;

function computeBoardCardSize(count, zoneWidth) {
  if (count <= 0) return { w: BOARD_CARD_MAX_W, h: Math.round(BOARD_CARD_MAX_W * BOARD_CARD_ASPECT) };
  const available = Math.max(0, zoneWidth - BOARD_SIDE_PAD_PX * 2);
  // N cards need N-1 gaps
  const raw = (available - BOARD_CARD_GAP_PX * (count - 1)) / count;
  const w = Math.max(BOARD_CARD_MIN_W, Math.min(BOARD_CARD_MAX_W, Math.floor(raw)));
  return { w, h: Math.round(w * BOARD_CARD_ASPECT) };
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

import { getUltimateMeta } from "./data/ultimates.js";
export { getUltimateMeta };

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
  const [gameHistory, setGameHistory] = useState([]);       // unified play-history for both sides (cards + ultimates)
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
  const [ciaUltSelection, setCiaUltSelection] = useState(null);
  const [tateDiscoverChoice, setTateDiscoverChoice] = useState(null);
  const [ultBurstKey, setUltBurstKey] = useState(null);
  const prevUltCanUseRef = useRef(false);
  const devConfig = useDevConfig();
  const prevBoardUids = useRef({ player: [], ai: [] });

  const layoutCfg = devConfig?.layout || {};
  const visualCfg = devConfig?.visual || {};
  const enemyHeroLayout = layoutCfg.enemyHero || { x: 50, y: 8, size: 120 };
  const playerHeroLayout = layoutCfg.playerHero || { x: 50, y: 85, size: 120 };
  const enemyBattlefieldLayout = layoutCfg.enemyBattlefield || { y: 26, height: 24 };
  const playerBattlefieldLayout = layoutCfg.playerBattlefield || { y: 50, height: 24 };
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
  const [ultHover, setUltHover] = useState(false);
  const ultBtnRef = useRef(null);
  const [enemyUltHover, setEnemyUltHover] = useState(false);
  const enemyUltBtnRef = useRef(null);
  const pointerRafRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);

  function getMinionRef(uid) {
    if (!minionRefs.current[uid]) minionRefs.current[uid] = { current: null };
    return minionRefs.current[uid];
  }

  function pushLog(e) {
    setLog(p => [...p.slice(-50), ...e]);
  }

  function pushHistory({ card, side, kind, summary }) {
    const hid = mkUid();
    setGameHistory(prev => [...prev, { ...card, _hid: hid, _side: side, _kind: kind, _summary: summary }]);
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
    const update = () => setCanvasScale(Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const lockScroll = phase !== "hero_select" && phase !== "menu";
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      // Auto-fullscreen on game start
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [phase]);

  // F11 listener for manual fullscreen toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  function pickTateDiscover(card) {
    if (!gs || !tateDiscoverChoice || !card) return;
    getSFX().cardSelect();
    let ng = gs;
    if (ng.player.hand.length < 10) {
      ng = { ...ng, player: { ...ng.player, hand: [...ng.player.hand, { ...card, uid: mkUid() }] } };
      pushLog([`👊 Chose ${card.name}!`, "Top G knows what he wants."]);
    } else {
      pushLog(["Hand full.", `${card.name} couldn't be added.`]);
    }
    setTateDiscoverChoice(null);
    setGs(ng);
  }

  function startGame(hero) {
    const heroDeck = hero ? makeDeckFrom(getHeroDeckIds(hero.id)) : (activeDeck?.cardIds?.length ? makeDeckFrom(activeDeck.cardIds) : null);
    const heroName = hero ? hero.name : "You";
    const heroEmoji = hero ? hero.emoji : "🧙";
    const heroPortrait = getHeroPortraitFromStorage(hero);
    const heroCardBack = hero?.cardBack || activeDeck?.cardBack || null;
    setSelectedHero(hero || null);
    // Pick a random AI hero (different from player if possible)
    const aiHeroCandidates = HEROES.filter(h => !hero || h.id !== hero.id);
    const aiHero = aiHeroCandidates[Math.floor(Math.random() * aiHeroCandidates.length)] || HEROES[0];
    const aiDeck = makeDeckFrom(getHeroDeckIds(aiHero.id));
    setGs({
      player: { ...initPlayer(heroName, false, heroDeck), heroId: hero?.id || null, maxMana: 1, mana: 1, armor: 0, ultimateUses: 0, ultimateUsedThisTurn: false, emoji: heroEmoji, portrait: heroPortrait, cardBack: heroCardBack },
      ai: { ...initPlayer(aiHero.name, true, aiDeck), heroId: aiHero.id, maxMana: 0, mana: 0, armor: 0, ultimateUses: 0, ultimateUsedThisTurn: false, portrait: getHeroPortraitFromStorage(aiHero), cardBack: aiHero.cardBack || null, emoji: aiHero.emoji },
    });
    const rulesSeen = (() => { try { return localStorage.getItem("co_rules_seen_v1") === "1"; } catch { return false; } })();
    setPhase(rulesSeen ? "mulligan" : "rules");
    setLog(["🎮 Game on! No cap."]);
    setWinner(null);
    setSelCard(null);
    setSelAtk(null);
    setTgtSpell(null);
    setHovTarget(null);
    setGameHistory([]);
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
    // Pre-check: elusive enemy minion can't be spell-targeted. Reject before consuming card/mana.
    if (targetId && typeof targetId === "string" && targetId !== "hero" && !targetId.startsWith("hero_")) {
      const enemyMinion = gs.ai.board.find(m => m.uid === targetId);
      if (enemyMinion && (enemyMinion.keywords?.includes("elusive") || enemyMinion.keywords?.includes("stealth"))) {
        getSFX().error();
        toast("Elusive! Can't target with spells.");
        return;
      }
    }
    getSFX().spellCast();
    const nh = gs.player.hand.filter(c => c.uid !== card.uid);
    let ng = { ...gs, player: { ...gs.player, hand: nh, mana: gs.player.mana - card.cost } };
    const r = applySpell(card.effectId || card.effect, targetId, ng, "player", card);
    ng = r.gs;
    pushLog(["✨ " + card.name + "!", ...r.log]);
    pushHistory({ card, side: "player", kind: "cast", summary: `You cast ${card.name}` });
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
    pushHistory({ card, side: "player", kind: "play", summary: `You played ${card.name}` });
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

    getSFX().ultimate();
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
    } else if (meta.id === "tate") {
      const lib = getLib();
      const warRoom = { id: "war_room_member", name: "War Room Member", type: "minion", cost: 8, rarity: "legendary", class: "Viral", atk: 8, hp: 8, emoji: "🕴️", keywords: ["charge"], desc: "Charge. War Room." };
      for (let i = 0; i < 3; i++) {
        if (ng.player.board.length >= 7) break;
        ng = { ...ng, player: { ...ng.player, board: [...ng.player.board, createMinionEntity(warRoom)] } };
      }
      const discoverIds = ["cigar_night", "bugatti_chiron", "security_team_spell"];
      const discoverCards = discoverIds.map(id => lib.find(c => c.id === id)).filter(Boolean);
      pushLog(["👊 Top G Protocol!", "3 War Room Members summoned. Choose your weapon..."]);
      ng = {
        ...ng,
        player: {
          ...ng.player,
          ultimateUses: (ng.player.ultimateUses || 0) + 1,
          ultimateUsedThisTurn: true,
        },
      };
      pushHistory({
        card: { id: `player_ult_${meta.id}`, name: meta.name, emoji: meta.emoji || "⚡", type: "spell", rarity: "legendary", cost: 0, desc: meta.desc },
        side: "player",
        kind: "ultimate",
        summary: `You unleashed ${meta.name}`,
      });
      setGs(ng);
      setTateDiscoverChoice({ cards: discoverCards });
      return;
    } else if (meta.id === "pewdiepie") {
      const stealCount = Math.min(10, ng.ai.deck.length);
      const stolen = [];
      for (let i = 0; i < stealCount; i++) {
        if (!ng.ai.deck.length) break;
        const idx = Math.floor(Math.random() * ng.ai.deck.length);
        const card = ng.ai.deck[idx];
        stolen.push({ ...card, uid: mkUid() });
        ng = { ...ng, ai: { ...ng.ai, deck: ng.ai.deck.filter((_, i2) => i2 !== idx) } };
      }
      ng = { ...ng, player: { ...ng.player, deck: [...ng.player.deck, ...stolen] } };
      const army = { id: "nine_yo_army", name: "9yo Army Member", type: "minion", cost: 2, rarity: "common", class: "Viral", atk: 2, hp: 2, emoji: "🪖", keywords: ["charge"], desc: "Charge. For the Bros." };
      for (let i = 0; i < 6; i++) {
        if (ng.player.board.length >= 7) break;
        ng = { ...ng, player: { ...ng.player, board: [...ng.player.board, createMinionEntity(army)] } };
      }
      const lib = getLib();
      const lasagna = lib.find(c => c.id === "bitch_lasagna");
      if (lasagna && ng.player.hand.length < 10) {
        ng = { ...ng, player: { ...ng.player, hand: [...ng.player.hand, { ...lasagna, uid: mkUid() }] } };
      }
      pushLog(["🎮 MEME REVIEW!", `Stole ${stealCount} cards. 6 Bros summoned. Bitch Lasagna added.`]);
    } else if (meta.id === "zuck") {
      const cloneCount = Math.min(ng.ai.board.length, Math.max(0, 7 - ng.player.board.length));
      ng = applyZuckUltimate(ng, "player");
      pushLog(["🤖 THE ZUCK!", `Copied ${cloneCount} enemy minion(s). Their cards +1 next turn. Your hand −1 permanently.`]);
    } else if (meta.id === "mrbeast") {
      ng = destroyAllMinions(ng, "player");
      const contestant = { id: "contestant", name: "Contestant", type: "minion", cost: 3, rarity: "common", class: "Viral", atk: 3, hp: 3, emoji: "🎮", keywords: [], desc: "A Squid Game contestant." };
      for (let i = 0; i < 4; i++) {
        if (ng.player.board.length >= 7) break;
        ng = { ...ng, player: { ...ng.player, board: [...ng.player.board, createMinionEntity(contestant)] } };
      }
      for (let i = 0; i < 3; i++) {
        if (ng.ai.board.length >= 7) break;
        ng = { ...ng, ai: { ...ng.ai, board: [...ng.ai.board, createMinionEntity(contestant)] } };
      }
      if (ng.player.board.length > 0) {
        const survivorIdx = Math.floor(Math.random() * ng.player.board.length);
        ng = {
          ...ng,
          player: {
            ...ng.player,
            board: ng.player.board.map((m, i) => i === survivorIdx ? createMinionEntity({ ...m, id: "survivor", name: "Survivor", atk: m.atk + 10, hp: m.hp + 10, maxHp: (m.maxHp ?? m.hp) + 10, emoji: "🏆", rarity: "legendary", keywords: ["charge"], desc: "Charge. The last one standing." }) : m),
          },
        };
      }
      ng = {
        ...ng,
        player: { ...ng.player, armor: (ng.player.armor || 0) + 20, mana: Math.min(10, (ng.player.mana || 0) + 5), tempAuraBonus: (ng.player.tempAuraBonus || 0) + 5 },
        ai: { ...ng.ai, armor: (ng.ai.armor || 0) + 20 },
      };
      const lib = getLib();
      const beastGames = lib.find(c => c.id === "beast_games");
      if (beastGames && ng.player.hand.length < 10) {
        ng = { ...ng, player: { ...ng.player, hand: [...ng.player.hand, { ...beastGames, uid: mkUid() }] } };
      }
      pushLog(["🎯 SQUID GAME CHARITY!", "Board wiped. 7 Contestants in arena. Survivor crowned. +20 Armor both heroes."]);
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

    pushHistory({
      card: {
        id: `player_ult_${meta.id}`,
        name: meta.name,
        emoji: meta.emoji || "⚡",
        type: "spell",
        rarity: "legendary",
        cost: 0,
        desc: meta.desc,
      },
      side: "player",
      kind: "ultimate",
      summary: `You unleashed ${meta.name}`,
    });

    const w = checkWin(ng);
    if (w) {
      setWinner(w);
      setPhase("gameover");
      if (w === "player") getSFX().victory(); else getSFX().defeat();
    }
    setGs(ng);
  }

  function endTurn() {
    if (phase !== "player_turn" || ciaUltSelection || tateDiscoverChoice) return;
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
        ai: { ...aiTurnState.ai, maxMana: aiMax, mana: aiMax, pendingManaNextTurn: 0, ultimateUsedThisTurn: false, tempAuraBonus: 0 },
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
              setGameHistory(prev => [...prev, {
                ...step.card,
                _hid: flyId,
                _side: "ai",
                _kind: step.verb === "casts" ? "cast" : "play",
                _summary: `Enemy ${step.verb} ${step.card.name}`,
              }]);
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

        } else if (step.type === "ai_ultimate") {
          getSFX().ultimate();
          const ultMeta = getUltimateMeta(step.heroId);
          setAiPlayOverlay({
            card: {
              id: `ai_ult_${step.heroId}`,
              name: ultMeta.name,
              emoji: ultMeta.emoji,
              type: "spell",
              effect: ultMeta.desc,
              desc: ultMeta.desc,
              rarity: "legendary",
              cost: 0,
            },
            label: "ENEMY ULTIMATE:",
          });
          schedule(() => {
            setAiPlayOverlay(null);
            setGs(step.gs);
            pushLog(step.log);
            pushHistory({
              card: {
                id: `ai_ult_${step.heroId}`,
                name: ultMeta.name,
                emoji: ultMeta.emoji || "⚡",
                type: "spell",
                rarity: "legendary",
                cost: 0,
                desc: ultMeta.desc,
              },
              side: "ai",
              kind: "ultimate",
              summary: `Enemy unleashed ${ultMeta.name}`,
            });
            addAiAction(ultMeta.emoji || "⚡", step.log[0] || "Enemy ultimate!");
            setAiActionHighlight(true);
            schedule(() => setAiActionHighlight(false), 700);
            const w = checkWin(step.gs);
            if (w) { resolveWin(w, step.gs); return; }
            schedule(runNextStep, STEP_DELAY);
          }, ENEMY_REVEAL_DURATION_MS);
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

  useEffect(() => {
    if (playerUltCanUse && !prevUltCanUseRef.current) {
      setUltBurstKey(Date.now());
      getSFX().ultimateReady();
    }
    prevUltCanUseRef.current = playerUltCanUse;
  }, [playerUltCanUse]);

  useEffect(() => {
    if (ultBurstKey === null) return;
    const t = setTimeout(() => setUltBurstKey(null), 1000);
    return () => clearTimeout(t);
  }, [ultBurstKey]);

  const aiUltimateMeta = gs ? getUltimateMeta({ id: gs.ai.heroId }) : null;
  const aiUnlockedUltCharges = gs ? getUnlockedUltimateCharges(gs.ai.maxMana) : 0;
  const aiUltUsed = gs?.ai?.ultimateUses || 0;
  const aiUltAvailable = Math.max(0, Math.min(ULTIMATE_USE_MAX, aiUnlockedUltCharges) - aiUltUsed);
  const aiUltStatus = aiUltUsed >= ULTIMATE_USE_MAX ? "SPENT" : aiUnlockedUltCharges === 0 ? "LOCKED" : aiUltAvailable > 0 ? "READY" : "COOLDOWN";
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
    // Only track cursor when actually needed: targeting a spell/attack or holding a selected card.
    // Otherwise every mouse move triggers a full App re-render which re-measures all
    // framer-motion layoutId cards in the hand → causes hover-jitter on sibling cards.
    const needsCursor = isTargeting || !!selCard;
    if (!needsCursor) return;
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
  }, [isTargeting, selCard, tgtSpell, selAtk]);

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
      {/* Fullscreen letterbox wrapper */}
      <div style={{ position: "fixed", inset: 0, background: "#020608", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 0 }}>
        {/* Fixed canvas — all position:fixed children anchor to this div due to transform */}
        <div style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${canvasScale})`, transformOrigin: "center center", position: "relative", overflow: "hidden" }}>
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
            style={{ width: CANVAS_W, height: CANVAS_H, overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", color: "#fff", position: "relative", userSelect: "none" }}
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

      {phase === "hero_select" && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #090f1a", background: "#060c16" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#378ADD", letterSpacing: 2 }}>CHRONICALLY ONLINE</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDevOpen(true)} style={{ background: "transparent", border: "1px solid #FAC775", color: "#FAC775", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 800 }}>Card Creator ✨</button>
          <button onClick={() => setPhase("hero_select")} style={{ background: "transparent", border: "1px solid #1e2e3e", color: "#445", borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>New Game</button>
        </div>
      </div>
      )}

      {toastMsg && (
        <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", background: "#060f1e", border: "1px solid #378ADD", borderRadius: 8, padding: "8px 22px", fontSize: 13, color: "#85B7EB", zIndex: 200, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 0 20px rgba(55,138,221,0.35)" }}>{toastMsg}</div>
      )}

      {tateDiscoverChoice && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 450, flexDirection: "column", gap: 24, backdropFilter: "blur(6px)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: "#d4af37" }}>👊 TOP G PROTOCOL</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", textShadow: "0 0 30px rgba(212,175,55,0.7)", marginTop: 6 }}>Choose Your Weapon</div>
            <div style={{ fontSize: 14, color: "#c5a960", marginTop: 4, fontStyle: "italic" }}>What color is your Bugatti?</div>
          </div>
          <div style={{ display: "flex", gap: 22, padding: 20 }}>
            {tateDiscoverChoice.cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.12, duration: 0.35 }}
                whileHover={{ scale: 1.08, y: -8 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => pickTateDiscover(card)}
                style={{ cursor: "pointer", filter: "drop-shadow(0 0 22px rgba(212,175,55,0.55))" }}
              >
                <TemplateCardFace card={card} width={220} height={310} />
              </motion.div>
            ))}
          </div>
        </div>
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
           BOARD ARENA — Hearthstone / LoR inspired vertical layout
           No position:fixed for heroes — everything flows naturally.
           Top→Bottom: enemy-hand → enemy-hero → enemy-board → player-board → player-hero → player-hand
      ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const playerSize = computeBoardCardSize(gs?.player?.board?.length || 0, playerBoardW);
        const enemySize  = computeBoardCardSize(gs?.ai?.board?.length || 0, enemyBoardW);
        const showBreathing = visualCfg.cardIdleBreathing !== false;
        const showParticles = visualCfg.ambientParticles !== false;
        const showLabels = visualCfg.showZoneLabels === true;
        return (
      <div className="board-arena" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", position: "relative", background: "radial-gradient(ellipse at 50% 50%, rgba(12,24,48,0.95) 0%, #04080f 100%)" }}>

        {/* ── Enemy Hand — horizontal row above hero ─────────────── */}
        {(() => {
          const n = gs.ai.hand.length;
          const showingCards = enemyHandVisible;
          const CARD_BACK_W = 48;
          const CARD_BACK_H = 64;
          const SPACING = showingCards ? 86 : 28;
          return (
            <div style={{ flex: "0 0 80px", display: "flex", justifyContent: "center", alignItems: "center", padding: "4px 0", zIndex: showingCards ? 100 : 20, pointerEvents: showingCards ? "auto" : "none" }}>
              {n === 0
                ? <div style={{ fontSize: 9, color: "#1a2530" }}>empty hand</div>
                : gs.ai.hand.map((card, idx) => {
                    const mid = (n - 1) / 2;
                    const xOff = (idx - mid) * SPACING;
                    return (
                      <div key={idx}
                        className={showingCards ? "enemy-revealed-card-wrap" : undefined}
                        style={{ transform: `translateX(${xOff}px)`, position: "relative", zIndex: idx, pointerEvents: showingCards ? "auto" : "none" }}>
                        {showingCards ? (
                          <div className="enemy-revealed-card">
                            <HandCard card={card} selected={!!ciaUltSelection?.handUids.includes(card.uid)} disabled={false} onClick={() => onEnemyHandCardClick(card.uid)} dragEnabled={false} width={80} height={113} />
                          </div>
                        ) : (
                          <CardBack size={CARD_BACK_W} imagePath={gs.ai.cardBack || selectedHero?.cardBack || ""} />
                        )}
                      </div>
                    );
                  })
              }
            </div>
          );
        })()}

        {/* ── Enemy Hero Row ─────────────────────────────────────── */}
        <div style={{ flex: "0 0 100px", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 24px", gap: 16, zIndex: 10, position: "relative" }}>
          {/* ── Enemy Ultimate Indicator (read-only, mirrors player ult column) ── */}
          {aiUltimateMeta && (() => {
            const etc = aiUltimateMeta.themeColor || "#c94545";
            const isReady = aiUltStatus === "READY";
            const isSpent = aiUltStatus === "SPENT";
            return (
              <div
                ref={enemyUltBtnRef}
                onMouseEnter={() => setEnemyUltHover(true)}
                onMouseLeave={() => setEnemyUltHover(false)}
                style={{ position: "absolute", left: 270, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "help" }}>
                <div style={{
                  position: "relative",
                  width: 82, height: 92,
                  background: isReady
                    ? `linear-gradient(160deg, #0a0f1a 0%, ${etc}33 55%, ${etc}66 100%)`
                    : "linear-gradient(160deg, #070c14, #0d1624)",
                  border: `2px solid ${isReady ? etc : isSpent ? "#2a3a4a" : "#1a2e48"}`,
                  borderRadius: 14,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                  padding: "7px 5px",
                  boxShadow: isReady ? `0 0 18px ${etc}99, 0 0 34px ${etc}55` : "none",
                  opacity: isSpent ? 0.5 : 1,
                }}>
                  <span style={{ fontSize: 26, lineHeight: 1, filter: isReady ? `drop-shadow(0 0 8px ${etc}) drop-shadow(0 0 18px ${etc}88)` : "grayscale(0.7) opacity(0.55)" }}>
                    {aiUltimateMeta.emoji || "⚡"}
                  </span>
                  <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: isReady ? "#ffc8c8" : "#334", lineHeight: 1, textShadow: isReady ? `0 0 6px ${etc}66` : "none" }}>
                    Enemy Ult
                  </span>
                  <span style={{
                    fontSize: 6.5, fontWeight: 900, letterSpacing: 1.3, textTransform: "uppercase",
                    color: isReady ? etc : isSpent ? "#2a3a4a" : "#1e3050",
                    padding: "2px 5px", borderRadius: 4,
                    background: isReady ? `${etc}2c` : "transparent",
                    border: `1px solid ${isReady ? etc + "88" : "#1a2e48"}`,
                    lineHeight: 1.2,
                  }}>
                    {aiUltStatus}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0, 1].map(i => {
                    const used = i < aiUltUsed;
                    const unlocked = i < Math.min(ULTIMATE_USE_MAX, aiUnlockedUltCharges);
                    return (
                      <div key={i} style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: used ? "#0d1624" : unlocked ? etc : "#080e18",
                        border: `1.5px solid ${used ? "#1a2e48" : unlocked ? etc : "#0f1e30"}`,
                        boxShadow: unlocked && !used ? `0 0 8px ${etc}dd, 0 0 18px ${etc}66` : "none",
                      }} />
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 3, flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 9, color: "#334", fontWeight: 700 }}>DECK</div>
            <div style={{ fontSize: 14, color: "#667", fontWeight: 900 }}>{gs.ai.deck.length}</div>
          </div>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <HeroPortrait name="AI Nemesis" hp={gs.ai.hp} maxHp={gs.ai.maxHp} emoji="💀" portrait={gs.ai.portrait} armor={gs.ai.armor || 0} isAI heroRef={enemyHeroRef} isTarget={isTargeting && !aiHasTaunt} onClick={onEnemyHeroClick} size={120} showName={false} />
            {aiActionHighlight && (
              <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: "rgba(239,159,39,0.92)", color: "#1a0a00", fontSize: 8, fontWeight: 900, letterSpacing: 0.8, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 0 8px rgba(239,159,39,0.6)", zIndex: 10 }}>
                ⚡ ACTING
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: gs.ai.maxMana }).map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < gs.ai.mana ? "#378ADD" : "#0d1a2a", border: "1px solid #1a3a5a", boxShadow: i < gs.ai.mana ? "0 0 6px rgba(55,138,221,0.6)" : "none" }} />
            ))}
          </div>
        </div>

        {/* ── Enemy Battlefield ──────────────────────────────────── */}
        <div
          ref={enemyBoardContainerRef}
          className="board-zone board-zone--enemy"
          style={{ flex: "1 1 28px", minHeight: 80, maxHeight: 270, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: BOARD_CARD_GAP_PX, padding: `4px ${BOARD_ZONE_PAD_X_PX}px`, position: "relative", overflow: "visible", ...boardHitStyle }}
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

        {/* ── Glowing horizon line ───────────────────────────────── */}
        <div style={{ flex: "0 0 2px", background: "linear-gradient(90deg, transparent 0%, rgba(120,180,240,0.35) 20%, rgba(200,230,255,0.55) 50%, rgba(120,180,240,0.35) 80%, transparent 100%)", boxShadow: "0 0 14px rgba(120,180,240,0.35)", margin: "0 24px", pointerEvents: "none", zIndex: 3 }} />

        {/* ── Player Battlefield ─────────────────────────────────── */}
        <div
          ref={playerBoardContainerRef}
          className={`board-zone board-zone--player${isOverPlayZone && !!selCard && !tgtSpell ? " board-zone--drop-active" : ""}`}
          style={{ flex: "1 1 28px", minHeight: 80, maxHeight: 270, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: BOARD_CARD_GAP_PX, padding: `4px ${BOARD_ZONE_PAD_X_PX}px`, position: "relative", overflow: "visible", ...boardHitStyle, ...(draggingCard ? { borderColor: "#FAC775", boxShadow: "0 0 16px rgba(250,199,117,0.5)" } : {}) }}
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

        {/* ── Player Hero Row — ult pinned LEFT (absolute), hero truly CENTER ── */}
        {(() => {
          const tc = playerUltimateMeta?.themeColor || "#9b59dd";
          const ultStatus = playerUltUsed >= 2 ? "SPENT" : playerUnlockedUltCharges === 0 ? "LOCKED" : playerUltCanUse ? "READY" : "COOLDOWN";
          return (
        <div style={{ flex: "0 0 130px", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "4px 24px 4px", zIndex: 60, position: "relative" }}>

          {/* ── Ultimate button (absolute, offset left of hero so hover doesn't crowd) ── */}
          <div
            ref={ultBtnRef}
            onMouseEnter={() => setUltHover(true)}
            onMouseLeave={() => setUltHover(false)}
            style={{ position: "absolute", left: 310, bottom: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
          >
            {playerUltimateInfo && (
              <>
                {(() => {
                  const hex = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
                  const isReady = ultStatus === "READY";
                  const isLocked = ultStatus === "LOCKED";
                  const isSpent = ultStatus === "SPENT";
                  const isCooldown = ultStatus === "COOLDOWN";
                  return (
                <div style={{ position: "relative", width: 128, height: 144, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AnimatePresence>
                    {ultBurstKey !== null && (
                      <motion.div
                        key={`ring-${ultBurstKey}`}
                        aria-hidden
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 2.4, 3.2] }}
                        transition={{ duration: 0.95, ease: [0.2, 0.8, 0.3, 1] }}
                        style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", border: `3px solid ${tc}`, boxShadow: `0 0 45px ${tc}, inset 0 0 35px ${tc}aa`, pointerEvents: "none", zIndex: 4 }}
                      />
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {ultBurstKey !== null && Array.from({ length: 10 }).map((_, i) => {
                      const a = (i / 10) * Math.PI * 2;
                      const dx = Math.cos(a) * 92;
                      const dy = Math.sin(a) * 92;
                      return (
                        <motion.span
                          key={`spk-${ultBurstKey}-${i}`}
                          aria-hidden
                          initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                          animate={{ opacity: [1, 1, 0], x: dx, y: dy, scale: [0.6, 1.2, 0.2] }}
                          transition={{ duration: 0.78, ease: "easeOut", delay: 0.04 + i * 0.015 }}
                          style={{ position: "absolute", width: 9, height: 9, borderRadius: "50%", background: `radial-gradient(circle, #fff 0%, ${tc} 50%, transparent 75%)`, boxShadow: `0 0 12px ${tc}`, pointerEvents: "none", zIndex: 5 }}
                        />
                      );
                    })}
                  </AnimatePresence>
                  <motion.button
                    onClick={useUltimate}
                    disabled={!playerUltCanUse}
                    whileHover={playerUltCanUse ? { scale: 1.06, y: -2 } : {}}
                    whileTap={playerUltCanUse ? { scale: 0.94 } : {}}
                    animate={
                      ultBurstKey !== null
                        ? { scale: [1, 1.22, 0.96, 1.06, 1] }
                        : isReady
                          ? { scale: [1, 1.035, 1] }
                          : { scale: 1 }
                    }
                    transition={
                      ultBurstKey !== null
                        ? { duration: 0.7, times: [0, 0.25, 0.55, 0.8, 1], ease: "easeOut" }
                        : isReady
                          ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                          : { duration: 0.25 }
                    }
                    style={{
                      position: "relative",
                      width: 118, height: 132,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: playerUltCanUse ? "pointer" : "not-allowed",
                      filter: isLocked || isSpent ? "grayscale(0.9) brightness(0.55)" : "none",
                      transition: "filter 450ms ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isReady && (
                      <span
                        aria-hidden
                        style={{ position: "absolute", inset: -5, clipPath: hex, background: `conic-gradient(from 0deg, transparent 0deg, ${tc} 55deg, transparent 120deg, ${tc}aa 200deg, transparent 260deg, ${tc} 325deg, transparent 360deg)`, animation: "ultOrbit 4.2s linear infinite", filter: `blur(2.5px) drop-shadow(0 0 10px ${tc})`, pointerEvents: "none" }}
                      />
                    )}
                    <span aria-hidden style={{ position: "absolute", inset: 0, clipPath: hex, background: isReady ? tc : "#1a2e48", boxShadow: isReady ? `0 0 26px ${tc}aa, 0 0 52px ${tc}55` : "none", transition: "background 450ms, box-shadow 450ms" }} />
                    <span aria-hidden style={{ position: "absolute", inset: 3, clipPath: hex, background: isReady ? `radial-gradient(ellipse at 50% 28%, ${tc}4a 0%, #0a0f1a 60%, #05080f 100%)` : "linear-gradient(160deg, #070c14 0%, #0d1624 60%, #0a121f 100%)", transition: "background 450ms" }} />
                    <span aria-hidden style={{ position: "absolute", inset: 8, clipPath: hex, background: `repeating-linear-gradient(45deg, transparent 0 13px, ${isReady ? tc + "14" : "#10192a"} 13px 14px)`, pointerEvents: "none", opacity: 0.8 }} />
                    {isReady && (
                      <motion.span
                        aria-hidden
                        animate={{ opacity: [0.28, 0.72, 0.28] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
                        style={{ position: "absolute", inset: 8, clipPath: hex, background: `radial-gradient(circle at 50% 50%, ${tc}55 0%, transparent 65%)`, pointerEvents: "none" }}
                      />
                    )}
                    {isReady && (
                      <span aria-hidden style={{ position: "absolute", inset: 4, clipPath: hex, background: "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.28) 50%, transparent 58%)", backgroundSize: "260% 100%", animation: "ultShimmerSweep 2.6s ease-in-out infinite", pointerEvents: "none" }} />
                    )}
                    {isLocked && (
                      <span aria-hidden style={{ position: "absolute", inset: 0, clipPath: hex, background: "repeating-linear-gradient(135deg, transparent 0 9px, rgba(130,150,180,0.13) 9px 11px), repeating-linear-gradient(45deg, transparent 0 9px, rgba(130,150,180,0.1) 9px 11px)", pointerEvents: "none" }} />
                    )}
                    {isSpent && (
                      <span aria-hidden style={{ position: "absolute", inset: 0, clipPath: hex, background: "linear-gradient(135deg, transparent 46%, rgba(190,90,90,0.38) 49%, rgba(190,90,90,0.38) 51%, transparent 54%), linear-gradient(45deg, transparent 46%, rgba(190,90,90,0.38) 49%, rgba(190,90,90,0.38) 51%, transparent 54%)", pointerEvents: "none" }} />
                    )}
                    {[
                      { top: -3, left: "50%", tx: -50, ty: 0 },
                      { top: "22%", right: -3, tx: 0, ty: -50 },
                      { bottom: "22%", right: -3, tx: 0, ty: 50 },
                      { bottom: -3, left: "50%", tx: -50, ty: 0 },
                      { bottom: "22%", left: -3, tx: 0, ty: 50 },
                      { top: "22%", left: -3, tx: 0, ty: -50 },
                    ].map((p, i) => (
                      <span
                        key={i}
                        aria-hidden
                        style={{ position: "absolute", top: p.top, left: p.left, right: p.right, bottom: p.bottom, transform: `translate(${p.tx}%, ${p.ty}%)`, width: 6, height: 6, borderRadius: "50%", background: isReady ? tc : "#263a54", boxShadow: isReady ? `0 0 9px ${tc}` : "none", transition: "background 450ms, box-shadow 450ms", zIndex: 3 }}
                      />
                    ))}
                    <motion.span
                      animate={isReady ? { y: [0, -2, 0] } : { y: 0 }}
                      transition={isReady ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : {}}
                      style={{ position: "relative", fontSize: 40, lineHeight: 1, zIndex: 3, filter: isReady ? `drop-shadow(0 0 12px ${tc}) drop-shadow(0 0 24px ${tc}cc)` : "none", marginTop: 2, marginBottom: 2 }}
                    >
                      {playerUltimateMeta.emoji}
                    </motion.span>
                    <span style={{ position: "relative", fontSize: 8.5, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase", color: isReady ? "#f3f9ff" : "#2b3f5a", textShadow: isReady ? `0 0 10px ${tc}, 0 0 20px ${tc}88` : "none", marginTop: 1, zIndex: 3, fontFamily: "inherit" }}>
                      Ultimate
                    </span>
                    <span style={{ position: "relative", fontSize: 7.5, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase", color: isReady ? tc : isSpent ? "#7a3a3a" : isCooldown ? "#3a5580" : "#1f3050", background: isReady ? `${tc}22` : "transparent", border: `1px solid ${isReady ? tc + "aa" : isSpent ? "#5a2a2a" : "#1a2e48"}`, padding: "2px 7px", borderRadius: 3, marginTop: 3, zIndex: 3, lineHeight: 1.1 }}>
                      {ultStatus}
                    </span>
                  </motion.button>
                </div>
                  );
                })()}

                {/* Charge gems — orbital diamonds */}
                <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
                  {[0, 1].map(i => {
                    const used = i < playerUltUsed;
                    const unlocked = i < Math.min(ULTIMATE_USE_MAX, playerUnlockedUltCharges);
                    const live = unlocked && !used;
                    return (
                      <motion.div
                        key={i}
                        animate={live ? { scale: [1, 1.18, 1], rotate: [45, 55, 45] } : { scale: 1, rotate: 45 }}
                        transition={live ? { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 } : { duration: 0 }}
                        style={{
                          width: 14, height: 14,
                          background: used ? "#0d1624" : live ? `linear-gradient(135deg, #ffffff 0%, ${tc} 55%, ${tc}88 100%)` : "#0a1220",
                          border: `1.5px solid ${used ? "#1a2e48" : live ? tc : "#0f1e30"}`,
                          boxShadow: live ? `0 0 12px ${tc}, 0 0 24px ${tc}77, inset 0 0 4px #fff` : used ? "inset 0 0 6px #000" : "none",
                          transition: "background 400ms",
                        }}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Hero portrait — CENTER */}
          <div style={{ position: "relative", filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.70))" }}>
            <HeroPortrait name={gs.player.name} hp={gs.player.hp} maxHp={gs.player.maxHp} emoji={gs.player.emoji || "🧙"} portrait={gs.player.portrait} armor={gs.player.armor || 0} isAI={false} heroRef={playerHeroRef} showName={false} size={120} />
          </div>
        </div>
          );
        })()}

        {/* ── Hand spacer — reserves room so hand cards don't overlap hero ── */}
        <div style={{ flex: "0 0 175px" }} />

        {/* Ultimate tooltip */}
        <AnimatePresence>
          {ultHover && gs?.player && (
            <UltimateTooltip
              meta={getUltimateMeta({ id: gs.player.heroId })}
              unlockedCharges={getUnlockedUltimateCharges(gs.player.maxMana)}
              usedCharges={gs.player.ultimateUses || 0}
              maxCharges={ULTIMATE_USE_MAX}
              anchorRect={ultBtnRef.current?.getBoundingClientRect()}
            />
          )}
        </AnimatePresence>

        {/* Enemy ultimate tooltip */}
        <AnimatePresence>
          {enemyUltHover && gs?.ai && aiUltimateMeta && (
            <UltimateTooltip
              meta={aiUltimateMeta}
              unlockedCharges={aiUnlockedUltCharges}
              usedCharges={aiUltUsed}
              maxCharges={ULTIMATE_USE_MAX}
              anchorRect={enemyUltBtnRef.current?.getBoundingClientRect()}
              placement="right"
            />
          )}
        </AnimatePresence>

        {/* ── End Turn + Cancel — center-right overlay ────────────── */}
        <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {ciaUltSelection && (
            <div style={{ minWidth: 220, background: "rgba(5,16,26,0.94)", border: "1px solid #6dc6d6", borderRadius: 10, padding: "10px 12px", boxShadow: "0 0 18px rgba(109,198,214,0.24)" }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "#6dc6d6", textAlign: "center", marginBottom: 6 }}>Deep State Download</div>
              <div style={{ fontSize: 11, color: "#c5d8e6", textAlign: "center", lineHeight: 1.4, marginBottom: 8 }}>Select up to 2 enemy minions and up to {ciaUltSelection.maxHandCards} enemy hand cards.</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8, fontSize: 10, color: "#7ea7bc" }}>
                <span>Minions {ciaUltSelection.minionUids.length}/2</span>
                <span>Cards {ciaUltSelection.handUids.length}/{ciaUltSelection.maxHandCards}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={confirmCiaUltimate} style={{ flex: 1, background: "linear-gradient(135deg,#0c4454,#15758a)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>Confirm</button>
                <button onClick={() => cancelInteractions("CIA ultimate cancelled.")} style={{ flex: 1, background: "transparent", border: "1px solid #35566a", color: "#8fa6b4", borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
          {isTargeting && (
            <button onClick={() => { setSelAtk(null); setTgtSpell(null); setSelCard(null); setHovTarget(null); selAtkRef.current = null; toast("Cancelled."); }} style={{ background: "transparent", border: "1px solid #E24B4A", color: "#E24B4A", borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: 800, whiteSpace: "nowrap" }}>Cancel</button>
          )}
          <motion.button
            onClick={endTurn}
            disabled={phase !== "player_turn"}
            animate={phase === "player_turn" ? { boxShadow: ["0 0 16px rgba(13,128,80,0.5)", "0 0 28px rgba(13,128,80,0.85)", "0 0 16px rgba(13,128,80,0.5)"] } : { boxShadow: "none" }}
            transition={phase === "player_turn" ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
            style={{ background: phase === "player_turn" ? "linear-gradient(135deg,#0a5030,#0d8050)" : "#090f0c", color: phase === "player_turn" ? "#fff" : "#223", border: "none", borderRadius: 10, padding: "14px 22px", fontSize: 14, fontWeight: 900, cursor: phase === "player_turn" ? "pointer" : "not-allowed", transition: `all ${UI_SMOOTH_TRANSITION_MS}ms ease`, minWidth: 120, whiteSpace: "nowrap" }}
          >
            {phase === "ai_turn" ? "💀 AI..." : "End Turn ✦"}
          </motion.button>
          {/* AP / Deck / Hand boxes UNDER End Turn */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 12 }}>
            <motion.div animate={deckPulse ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.4 }} style={{ display: "inline-block" }}>
              <div style={{ background: "linear-gradient(135deg,#1a3a6a,#0d2244)", border: "2px solid #378ADD", borderRadius: 12, padding: "8px 16px", fontSize: 16, fontWeight: 900, color: "#aad4ff", boxShadow: "0 0 20px rgba(55,138,221,0.55)", letterSpacing: 0.4, whiteSpace: "nowrap", minWidth: 100, textAlign: "center" }}>
                {gs.player.mana}/{gs.player.maxMana} Aura Points
              </div>
            </motion.div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ minWidth: 70, background: "linear-gradient(135deg,#111b2e,#0a1220)", border: "1px solid #2b4f78", borderRadius: 999, padding: "4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, boxShadow: "0 0 8px rgba(55,138,221,0.2)" }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#89a8cc", textTransform: "uppercase", letterSpacing: 0.5 }}>Deck</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: "#d9ecff", lineHeight: 1 }}>{gs.player.deck.length}</span>
              </div>
              <div style={{ minWidth: 70, background: "linear-gradient(135deg,#111b2e,#0a1220)", border: "1px solid #2b4f78", borderRadius: 999, padding: "4px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, boxShadow: "0 0 8px rgba(55,138,221,0.2)" }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#89a8cc", textTransform: "uppercase", letterSpacing: 0.5 }}>Hand</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: "#d9ecff", lineHeight: 1 }}>{gs.player.hand.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Draw card animation — flies from deck area to hero center ── */}
        <AnimatePresence initial={false}>
          {pendingDrawCard && (() => {
            const rc = RC[pendingDrawCard.rarity || "common"] || RC.common;
            return (
              <motion.div
                key={pendingDrawCard.uid}
                initial={{ opacity: 0, scale: 0.3, x: 120, y: -80 }}
                animate={{
                  opacity: [0, 1, 1, 1, 0],
                  scale: [0.3, 1.15, 1, 0.95, 0.7],
                  x: [120, 40, 0, -20, -60],
                  y: [-80, -40, 0, 20, 60],
                }}
                transition={{ duration: 0.9, times: [0, 0.3, 0.55, 0.75, 1], ease: [0.25, 0.9, 0.35, 1] }}
                style={{
                  position: "absolute",
                  bottom: 90,
                  left: "50%",
                  marginLeft: -50,
                  width: 100,
                  height: 148,
                  background: rc.bg,
                  border: "2px solid " + rc.border,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                  boxShadow: `0 10px 30px rgba(0,0,0,0.6), 0 0 24px ${rc.glow}`,
                  zIndex: 300,
                }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 0.75, times: [0, 0.4, 1] }}
                  style={{ position: "absolute", inset: -6, borderRadius: 16, background: `radial-gradient(circle at 50% 50%, ${rc.glow} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }}
                />
                <span aria-hidden style={{ position: "absolute", top: 0, left: "-60%", width: "60%", height: "100%", background: "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)", animation: "ultimateShimmer 0.75s ease-out 1", pointerEvents: "none" }} />
                <div style={{ position: "relative", fontSize: 38, filter: `drop-shadow(0 3px 10px ${rc.glow})`, zIndex: 1 }}>{pendingDrawCard.emoji || "🃏"}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#fff", textAlign: "center", marginTop: 4, zIndex: 1 }}>{pendingDrawCard.name}</div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Game log removed */}

        {/* ── Player Arc Hand — inside board-arena at bottom ────────── */}
        {(() => {
        const hand = gs.player.hand;
        const n = hand.length;
        const CARD_W = Math.round(Math.max(80, Math.min(120, n <= 4 ? 120 : n <= 6 ? 108 : n <= 8 ? 96 : 80)));
        const CARD_H = Math.round(CARD_W * (246 / 174));
        const CANVAS_WIDTH = CANVAS_W;
        const MAX_SPREAD_PX = Math.min(CANVAS_WIDTH - 48, 560);
        const X_STEP = n <= 1 ? 0 : Math.min(CARD_W * 0.78, MAX_SPREAD_PX / Math.max(1, n - 1));
        const baseAngle = 5;
        const ANGLE_STEP = n <= 4 ? baseAngle : n <= 7 ? baseAngle * 0.7 : baseAngle * 0.5;
        const CURVE_K = n <= 4 ? 5 : n <= 7 ? 3 : 2;
        const SELECTION_LIFT = 28;
        const BOTTOM_INSET = 6;
        const CONTAINER_H = CARD_H + SELECTION_LIFT + BOTTOM_INSET + 4;

        function arcFor(i) {
          const mid = (n - 1) / 2;
          const normalized = i - mid;
          return { x: normalized * X_STEP, y: Math.pow(Math.abs(normalized), 2) * CURVE_K, rotate: normalized * ANGLE_STEP };
        }

        return (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: CONTAINER_H, overflow: "visible", zIndex: 50, pointerEvents: "none" }}>
            {n === 0 && (
              <div style={{ position: "absolute", bottom: BOTTOM_INSET + 8, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#1a2030", fontSize: 13, pointerEvents: "none" }}>No cards — topdeck mode</div>
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
                    style={{ position: "absolute", bottom: BOTTOM_INSET, left: "50%", marginLeft: -(CARD_W / 2), transformOrigin: "50% 100%", zIndex: isSelected ? 40 : 10 + i, pointerEvents: "auto" }}
                  >
                    <HandCard card={card} selected={isSelected} disabled={card.cost > gs.player.mana || phase !== "player_turn"} onClick={() => onHandClick(card)} dragEnabled={canDrag} onDragStart={() => handleCardDragStart(card)} onDragEnd={(point) => handleCardDragEnd(card, point)} width={CARD_W} height={CARD_H} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        );
        })()}
      </div>
        );
      })()}

      {/* ── Keyword Guide (bottom-right, static reference) ── */}
      <div style={{ position: "fixed", right: 16, bottom: 16, width: 192, zIndex: 140, pointerEvents: "none" }}>
        <div style={{
          background: "linear-gradient(145deg, rgba(6,10,22,0.94), rgba(10,16,32,0.94))",
          border: "1px solid rgba(55,138,221,0.35)",
          borderRadius: 10,
          padding: "8px 10px 9px",
          boxShadow: "0 6px 22px rgba(0,0,0,0.7), 0 0 14px rgba(55,138,221,0.18)",
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: "#6d92c2", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, textAlign: "center", borderBottom: "1px solid rgba(55,138,221,0.22)", paddingBottom: 4 }}>
            Guide
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { k: "Taunt",     c: "#EF9F27", d: "Must attack me first" },
              { k: "Battlecry", c: "#378ADD", d: "Triggers when played" },
              { k: "Charge",    c: "#1D9E75", d: "Can attack immediately" },
              { k: "Elusive",   c: "#9b59dd", d: "Can't be targeted by spells" },
            ].map(({ k, c, d }) => (
              <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 10, lineHeight: 1.3 }}>
                <span style={{ color: c, fontWeight: 900, letterSpacing: 0.4, minWidth: 56, flexShrink: 0 }}>{k}</span>
                <span style={{ color: "#9cb4d2", fontWeight: 500 }}>— {d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Action Log (right side, ephemeral) ── */}
      <div style={{ position: "fixed", right: 160, top: 80, width: 172, zIndex: 150, display: "flex", flexDirection: "column", gap: 5, pointerEvents: "none" }}>
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

      {/* ── Match History panel (left side, persistent — both sides, cards + ultimates) ── */}
      <div style={{ position: "fixed", left: 0, top: 44, bottom: 0, width: 172, zIndex: 140, pointerEvents: selCard ? "none" : "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "rgba(4,6,14,0.92)", borderRight: "1px solid #0d1525", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px 5px", fontSize: 8, fontWeight: 900, color: "#3a5578", letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid #0d1525", flexShrink: 0, textAlign: "center" }}>
            Match History
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence initial={false}>
              {gameHistory.map((card) => {
                const rcH = RC[card.rarity || "common"];
                const isPlayer = card._side === "player";
                const isUlt = card._kind === "ultimate";
                const sideBar = isPlayer ? "#1D9E75" : "#c94545";
                const kindLabel = isUlt ? "ULTIMATE" : card._kind === "cast" ? "SPELL" : "MINION";
                const sideLabel = isPlayer ? "YOU" : "ENEMY";
                return (
                  <motion.div
                    key={card._hid}
                    initial={{ x: isPlayer ? 120 : -120, opacity: 0, scale: 0.85 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.25 } }}
                    transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0 }}
                    onMouseEnter={() => setHoveredHistoryCard(card)}
                    onMouseLeave={() => setHoveredHistoryCard(prev => (prev?._hid === card._hid ? null : prev))}
                    style={{
                      background: rcH.bg,
                      border: `1px solid ${isUlt ? "#EF9F27" : rcH.border}`,
                      borderLeft: `4px solid ${sideBar}`,
                      borderRadius: 8,
                      padding: "5px 7px",
                      display: "flex", alignItems: "center", gap: 7,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5), 0 0 8px " + (isUlt ? "rgba(239,159,39,0.55)" : rcH.glow),
                      flexShrink: 0,
                      pointerEvents: "auto",
                      cursor: "default",
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0, filter: isUlt ? "drop-shadow(0 0 6px rgba(239,159,39,0.8))" : "none" }}>{card.emoji || "🃏"}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 7, fontWeight: 900, color: sideBar, letterSpacing: 0.5 }}>{sideLabel}</span>
                        <span style={{ fontSize: 7, fontWeight: 800, color: isUlt ? "#EF9F27" : "#7f96b8", letterSpacing: 0.5 }}>• {kindLabel}</span>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.name}</div>
                      {card.type === "minion" && (
                        <div style={{ display: "flex", gap: 4, marginTop: 1 }}>
                          <span style={{ fontSize: 8, color: "#ff9988", fontWeight: 900 }}>⚔{card.atk}</span>
                          <span style={{ fontSize: 8, color: "#88ffaa", fontWeight: 900 }}>♥{card.hp}</span>
                        </div>
                      )}
                    </div>
                    {!isUlt && (
                      <div style={{ marginLeft: "auto", fontSize: 9, fontWeight: 900, color: "#aad4ff", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "1px 4px", flexShrink: 0 }}>{card.cost}</div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {gameHistory.length === 0 && (
              <div style={{ fontSize: 9, color: "#1a3050", textAlign: "center", marginTop: 12 }}>nothing yet</div>
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
              animate={{ opacity: 0, scale: 0.45, x: "-50%", y: "-50%", left: "86px", top: "160px" }}
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
              style={{ position: "fixed", left: 188, top: 74, width: 190, minHeight: 260, borderRadius: 16, padding: 10, zIndex: 850, pointerEvents: "none", boxShadow: "0 14px 32px rgba(0,0,0,0.7)" }}
            >
              <TemplateCardFace card={card} width={170} height={240} />
              <div style={{ marginTop: 6, fontSize: 8, color: "#8aa8cc", textAlign: "center" }}>{card._summary || (card._side === "ai" ? "Enemy played this card." : "You played this card.")}</div>
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

      <AnimatePresence>
        {phase === "rules" && (
          <RulesScreen
            key="rules-screen"
            onContinue={() => setPhase("mulligan")}
          />
        )}
        {phase === "mulligan" && gs && (
          <MulliganScreen
            key="mulligan-screen"
            hand={gs.player.hand}
            onConfirm={(uids) => {
              if (uids.length) {
                setGs(prev => ({ ...prev, player: mulliganHand(prev.player, uids) }));
              }
              setPhase("player_turn");
            }}
          />
        )}
      </AnimatePresence>

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

          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}



