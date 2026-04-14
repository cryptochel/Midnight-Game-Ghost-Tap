import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Zap, Eye, Filter, Shield, Lock, MapPin, ZapOff, Key, Trophy, Star, Target, Crown, Award, X, Cpu, Activity, TrendingUp, CheckCircle2, ListTodo } from 'lucide-react';
import { GhostType, GhostTrace, Upgrades, GameState, DISTRICTS, Achievement, Task } from './types';

const BASE_LIFETIME = 2500; // ms
const SPAWN_INTERVAL = 1200; // ms
const COMBO_TIMEOUT = 2000; // ms

const ACHIEVEMENTS: Achievement[] = [
  { id: 'points_1k', title: 'Shadow Initiate', description: 'Reach 1,000 Shadow Points', icon: 'Star', threshold: 1000, type: 'points', unlocked: false },
  { id: 'points_10k', title: 'Dark Master', description: 'Reach 10,000 Shadow Points', icon: 'Trophy', threshold: 10000, type: 'points', unlocked: false },
  { id: 'points_100k', title: 'Night Legend', description: 'Reach 100,000 Shadow Points', icon: 'TrendingUp', threshold: 100000, type: 'points', unlocked: false },
  { id: 'keys_5', title: 'Key Collector', description: 'Collect 5 Dark Keys', icon: 'Key', threshold: 5, type: 'keys', unlocked: false },
  { id: 'boss_1', title: 'Overlord Slayer', description: 'Defeat your first Phantom Overlord', icon: 'Crown', threshold: 1, type: 'bosses', unlocked: false },
  { id: 'boss_10', title: 'Void Tyrant', description: 'Defeat 10 Phantom Overlords', icon: 'Award', threshold: 10, type: 'bosses', unlocked: false },
  { id: 'taps_100', title: 'Fast Fingers', description: 'Tap 100 times', icon: 'Target', threshold: 100, type: 'taps', unlocked: false },
  { id: 'combo_20', title: 'Flow Master', description: 'Reach a 20x Combo', icon: 'Activity', threshold: 20, type: 'combo', unlocked: false },
  { id: 'passive_10', title: 'Shadow Miner', description: 'Reach 10 SP/sec passive income', icon: 'Cpu', threshold: 10, type: 'passive', unlocked: false },
];

const INITIAL_TASKS: Task[] = [
  { id: 'task_taps_50', title: 'Data Extraction', description: 'Capture 50 Ghost Traces', reward: 500, requirement: 50, type: 'taps', progress: 0, completed: false },
  { id: 'task_boss_2', title: 'Overlord Hunt', description: 'Defeat 2 Phantom Overlords', reward: 2000, rewardKeys: 1, requirement: 2, type: 'bosses', progress: 0, completed: false },
  { id: 'task_keys_3', title: 'Key Hunter', description: 'Find 3 Dark Keys', reward: 1000, requirement: 3, type: 'keys', progress: 0, completed: false },
  { id: 'task_upgrades_10', title: 'Tool Specialist', description: 'Purchase 10 upgrades', reward: 1500, requirement: 10, type: 'upgrades', progress: 0, completed: false },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    shadowPoints: 0,
    darkKeys: 0,
    district: DISTRICTS[0].name,
    isBananaMode: false,
    bananaModeEndTime: 0,
    totalTaps: 0,
    bossesDefeated: 0,
    unlockedAchievements: [],
    completedTasks: [],
    currentCombo: 0,
    maxCombo: 0,
    lastTapTime: 0,
    passiveIncome: 0,
  });

  const [upgrades, setUpgrades] = useState<Upgrades>({
    stealthFingers: 0,
    shadowVision: 0,
    noiseFilter: 0,
    shadowMining: 0,
    precisionSync: 0,
    flowState: 0,
  });

  const [ghosts, setGhosts] = useState<GhostTrace[]>([]);
  const [showShop, setShowShop] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [isBossActive, setIsBossActive] = useState(false);
  const [lastUnlocked, setLastUnlocked] = useState<Achievement | null>(null);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const lastBossPoints = useRef(0);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Passive Income Loop
  useEffect(() => {
    const income = upgrades.shadowMining * 2; // 2 SP per level per second
    setGameState(prev => ({ ...prev, passiveIncome: income }));

    if (income > 0) {
      const interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          shadowPoints: prev.shadowPoints + (income / 10) // Update 10 times a second for smoothness
        }));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [upgrades.shadowMining]);

  // Combo Reset Logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.currentCombo > 0 && Date.now() - gameState.lastTapTime > COMBO_TIMEOUT) {
        setGameState(prev => ({ ...prev, currentCombo: 0 }));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState.currentCombo, gameState.lastTapTime]);

  // Check Achievements & Task Progress
  useEffect(() => {
    // Achievements
    const newlyUnlocked: string[] = [];
    ACHIEVEMENTS.forEach(achievement => {
      if (gameState.unlockedAchievements.includes(achievement.id)) return;

      let met = false;
      switch (achievement.type) {
        case 'points': met = gameState.shadowPoints >= achievement.threshold; break;
        case 'keys': met = gameState.darkKeys >= achievement.threshold; break;
        case 'bosses': met = gameState.bossesDefeated >= achievement.threshold; break;
        case 'taps': met = gameState.totalTaps >= achievement.threshold; break;
        case 'combo': met = gameState.maxCombo >= achievement.threshold; break;
        case 'passive': met = gameState.passiveIncome >= achievement.threshold; break;
      }

      if (met) {
        newlyUnlocked.push(achievement.id);
        setLastUnlocked(achievement);
        setTimeout(() => setLastUnlocked(null), 3000);
      }
    });

    if (newlyUnlocked.length > 0) {
      setGameState(prev => ({
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, ...newlyUnlocked]
      }));
    }

    // Task Progress
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.completed) return task;
      
      let progress = 0;
      switch (task.type) {
        case 'taps': progress = gameState.totalTaps; break;
        case 'bosses': progress = gameState.bossesDefeated; break;
        case 'keys': progress = gameState.darkKeys; break;
        case 'upgrades': progress = (Object.values(upgrades) as number[]).reduce((a, b) => a + b, 0); break;
      }

      if (progress >= task.requirement) {
        return { ...task, progress, completed: true };
      }
      return { ...task, progress };
    }));
  }, [gameState.shadowPoints, gameState.darkKeys, gameState.bossesDefeated, gameState.totalTaps, gameState.maxCombo, gameState.passiveIncome, upgrades]);

  // Task Reward Handling
  useEffect(() => {
    tasks.forEach(task => {
      if (task.completed && !gameState.completedTasks.includes(task.id)) {
        setGameState(prev => ({
          ...prev,
          shadowPoints: prev.shadowPoints + task.reward,
          darkKeys: prev.darkKeys + (task.rewardKeys || 0),
          completedTasks: [...prev.completedTasks, task.id]
        }));
      }
    });
  }, [tasks, gameState.completedTasks]);

  // Update district based on points
  useEffect(() => {
    const currentDistrict = [...DISTRICTS].reverse().find(d => gameState.shadowPoints >= d.threshold);
    if (currentDistrict && currentDistrict.name !== gameState.district) {
      setGameState(prev => ({ ...prev, district: currentDistrict.name }));
    }
  }, [gameState.shadowPoints, gameState.district]);

  // Banana Mode Timer
  useEffect(() => {
    if (gameState.isBananaMode) {
      const interval = setInterval(() => {
        if (Date.now() > gameState.bananaModeEndTime) {
          setGameState(prev => ({ ...prev, isBananaMode: false }));
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameState.isBananaMode, gameState.bananaModeEndTime]);

  const spawnGhost = useCallback(() => {
    const id = Math.random().toString(36).substring(2, 9);
    const x = Math.random() * 80 + 10; // 10-90%
    const y = Math.random() * 70 + 15; // 15-85%
    
    let type = GhostType.COMMON;
    let value = 1;
    
    const roll = Math.random();
    const encryptedChance = 0.1 + (upgrades.noiseFilter * 0.05);
    const blackChance = 0.02;

    if (gameState.isBananaMode) {
      type = GhostType.ENCRYPTED;
      value = 5;
    } else if (gameState.shadowPoints >= lastBossPoints.current + 1000 && !isBossActive) {
      type = GhostType.BOSS;
      value = 500;
      lastBossPoints.current = Math.floor(gameState.shadowPoints / 1000) * 1000;
      setIsBossActive(true);
    } else if (roll < blackChance) {
      type = GhostType.BLACK;
      value = 0;
    } else if (roll < encryptedChance + blackChance) {
      type = GhostType.ENCRYPTED;
      value = 5;
    }

    let lifetime = BASE_LIFETIME + (upgrades.shadowVision * 500);

    // Special behaviors
    let requiredTaps = 1;

    if (type === GhostType.BOSS) {
      requiredTaps = 50;
      lifetime = 15000;
    } else if (type === GhostType.ENCRYPTED && Math.random() < 0.3) {
      requiredTaps = 2;
    }

    const newGhost: GhostTrace = {
      id,
      type,
      x,
      y,
      startTime: Date.now(),
      lifetime,
      value,
      requiredTaps,
      currentTaps: 0,
    };

    setGhosts(prev => [...prev, newGhost]);

    // Auto-remove after lifetime
    setTimeout(() => {
      setGhosts(prev => {
        const ghostToRemove = prev.find(g => g.id === id);
        if (ghostToRemove?.type === GhostType.BOSS) {
          setIsBossActive(false);
        }
        return prev.filter(g => g.id !== id);
      });
    }, lifetime);
  }, [upgrades, gameState.isBananaMode, gameState.shadowPoints, isBossActive]);

  // Spawning loop
  useEffect(() => {
    if (isBossActive) return;
    const intervalTime = gameState.isBananaMode ? SPAWN_INTERVAL / 2 : SPAWN_INTERVAL;
    const interval = setInterval(spawnGhost, intervalTime);
    return () => clearInterval(interval);
  }, [spawnGhost, gameState.isBananaMode]);

  const handleTap = (ghost: GhostTrace) => {
    setGhosts(prev => {
      const targetGhost = prev.find(g => g.id === ghost.id);
      if (!targetGhost) return prev;

      const updatedTaps = targetGhost.currentTaps + 1;
      
      if (updatedTaps >= targetGhost.requiredTaps) {
        setGameState(prevGS => {
          const newState = { ...prevGS, totalTaps: prevGS.totalTaps + 1 };
          
          // Combo Logic
          const now = Date.now();
          const newCombo = prevGS.currentCombo + 1;
          const comboMultiplier = 1 + (newCombo * 0.1 * (1 + upgrades.flowState * 0.2));
          
          // Crit Logic
          const critChance = upgrades.precisionSync * 0.05;
          const isCrit = Math.random() < critChance;
          const critMultiplier = isCrit ? 3 : 1;

          let pointsToAdd = Math.floor(ghost.value * comboMultiplier * critMultiplier);
          if (ghost.type === GhostType.COMMON) pointsToAdd = Math.max(pointsToAdd, 1);

          newState.shadowPoints += pointsToAdd;
          newState.currentCombo = newCombo;
          newState.maxCombo = Math.max(prevGS.maxCombo, newCombo);
          newState.lastTapTime = now;

          if (ghost.type === GhostType.BLACK) {
            newState.darkKeys += 1;
          } else if (ghost.type === GhostType.BOSS) {
            newState.darkKeys += 2;
            newState.bossesDefeated += 1;
            setIsBossActive(false);
          }
          return newState;
        });
        return prev.filter(g => g.id !== ghost.id);
      }

      setGameState(prevGS => ({
        ...prevGS,
        totalTaps: prevGS.totalTaps + 1,
        lastTapTime: Date.now(),
      }));

      return prev.map(g => g.id === ghost.id ? { ...g, currentTaps: updatedTaps } : g);
    });
  };

  const activateBananaMode = () => {
    if (gameState.darkKeys >= 3 && !gameState.isBananaMode) {
      setGameState(prev => ({
        ...prev,
        darkKeys: prev.darkKeys - 3,
        isBananaMode: true,
        bananaModeEndTime: Date.now() + 8000,
      }));
    }
  };

  const buyUpgrade = (type: keyof Upgrades, cost: number) => {
    if (gameState.shadowPoints >= cost) {
      setGameState(prev => ({ ...prev, shadowPoints: prev.shadowPoints - cost }));
      setUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));
    }
  };

  const currentDistrictData = DISTRICTS.find(d => d.name === gameState.district) || DISTRICTS[0];

  return (
    <div 
      ref={gameContainerRef}
      className={`relative w-full h-screen overflow-hidden font-sans transition-colors duration-1000 ${currentDistrictData.bg}`}
    >
      {/* Boss Health Bar */}
      <AnimatePresence>
        {isBossActive && ghosts.find(g => g.type === GhostType.BOSS) && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4"
          >
            <div className="bg-black/60 backdrop-blur-md border border-rose-500/30 p-4 rounded-2xl">
              <div className="flex justify-between items-end mb-2">
                <span className="text-rose-500 font-bold uppercase tracking-tighter italic">Phantom Overlord</span>
                <span className="text-xs font-mono text-rose-500/60">
                  {ghosts.find(g => g.type === GhostType.BOSS)?.requiredTaps! - ghosts.find(g => g.type === GhostType.BOSS)?.currentTaps!} HP
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ 
                    width: `${((ghosts.find(g => g.type === GhostType.BOSS)?.requiredTaps! - ghosts.find(g => g.type === GhostType.BOSS)?.currentTaps!) / ghosts.find(g => g.type === GhostType.BOSS)?.requiredTaps!) * 100}%` 
                  }}
                  className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-50">
            <MapPin size={12} />
            <span>District</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tighter uppercase italic ${currentDistrictData.color} glitch-text`}>
            {gameState.district}
          </h1>
        </div>

        <div className="flex gap-8 pointer-events-auto">
          {gameState.currentCombo > 1 && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold">Combo</div>
              <div className="text-3xl font-black italic text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                {gameState.currentCombo}x
              </div>
            </motion.div>
          )}
          <div className="text-right">
            <div className="text-xs font-mono uppercase tracking-widest opacity-50">Shadow Points</div>
            <div className="text-3xl font-bold font-mono text-white tabular-nums">
              {Math.floor(gameState.shadowPoints).toLocaleString()}
            </div>
            {gameState.passiveIncome > 0 && (
              <div className="text-[10px] font-mono text-emerald-400">+{gameState.passiveIncome} SP/sec</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs font-mono uppercase tracking-widest opacity-50">Dark Keys</div>
            <div className="flex items-center justify-end gap-2 text-3xl font-bold font-mono text-amber-400 tabular-nums">
              <Key size={24} />
              {gameState.darkKeys}
            </div>
          </div>
        </div>
      </div>

      {/* Banana Mode Trigger */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={activateBananaMode}
          disabled={gameState.darkKeys < 3 || gameState.isBananaMode}
          className={`group relative px-8 py-3 rounded-full border transition-all duration-300 flex items-center gap-3 overflow-hidden
            ${gameState.isBananaMode 
              ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
              : gameState.darkKeys >= 3 
                ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 text-white cursor-pointer' 
                : 'bg-black/40 border-white/5 text-white/20 cursor-not-allowed'}`}
        >
          {gameState.isBananaMode && (
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: "linear" }}
              className="absolute inset-0 bg-yellow-500/20"
            />
          )}
          <Zap size={18} className={gameState.isBananaMode ? 'animate-pulse' : ''} />
          <span className="font-bold uppercase tracking-tighter text-sm">
            {gameState.isBananaMode ? 'Banana Brain Active' : 'Banana Brain Mode (3 Keys)'}
          </span>
        </button>
      </div>

      {/* Shop Toggle */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-4">
        <button
          onClick={() => setShowTasks(true)}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white relative"
        >
          <ListTodo size={24} />
          {tasks.filter(t => t.completed && !gameState.completedTasks.includes(t.id)).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center font-bold">
              !
            </span>
          )}
        </button>
        <button
          onClick={() => setShowAchievements(true)}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white relative"
        >
          <Trophy size={24} />
          {gameState.unlockedAchievements.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-[10px] flex items-center justify-center font-bold">
              {gameState.unlockedAchievements.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowShop(true)}
          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
        >
          <Shield size={24} />
        </button>
      </div>

      {/* Achievement Notification */}
      <AnimatePresence>
        {lastUnlocked && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute top-24 right-8 z-50 bg-rose-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20"
          >
            <div className="p-2 bg-white/20 rounded-xl">
              <Trophy size={24} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">Achievement Unlocked!</div>
              <div className="font-bold text-lg leading-tight">{lastUnlocked.title}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Area */}
      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {ghosts.map(ghost => (
            <GhostItem 
              key={ghost.id} 
              ghost={ghost} 
              onTap={() => handleTap(ghost)} 
              radiusBonus={upgrades.stealthFingers}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Upgrade Shop Overlay */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold uppercase italic tracking-tighter text-white">Upgrades</h2>
                <button 
                  onClick={() => setShowShop(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                <UpgradeRow 
                  icon={<Zap size={20} />}
                  title="Stealth Fingers"
                  desc="Increases tap detection radius"
                  level={upgrades.stealthFingers}
                  cost={Math.floor(100 * Math.pow(1.5, upgrades.stealthFingers))}
                  onBuy={() => buyUpgrade('stealthFingers', Math.floor(100 * Math.pow(1.5, upgrades.stealthFingers)))}
                  canAfford={gameState.shadowPoints >= Math.floor(100 * Math.pow(1.5, upgrades.stealthFingers))}
                />
                <UpgradeRow 
                  icon={<Eye size={20} />}
                  title="Shadow Vision"
                  desc="Ghosts stay visible for 0.5s longer"
                  level={upgrades.shadowVision}
                  cost={Math.floor(150 * Math.pow(1.6, upgrades.shadowVision))}
                  onBuy={() => buyUpgrade('shadowVision', Math.floor(150 * Math.pow(1.6, upgrades.shadowVision)))}
                  canAfford={gameState.shadowPoints >= Math.floor(150 * Math.pow(1.6, upgrades.shadowVision))}
                />
                <UpgradeRow 
                  icon={<Filter size={20} />}
                  title="Noise Filter"
                  desc="Higher chance for Encrypted Traces"
                  level={upgrades.noiseFilter}
                  cost={Math.floor(200 * Math.pow(1.7, upgrades.noiseFilter))}
                  onBuy={() => buyUpgrade('noiseFilter', Math.floor(200 * Math.pow(1.7, upgrades.noiseFilter)))}
                  canAfford={gameState.shadowPoints >= Math.floor(200 * Math.pow(1.7, upgrades.noiseFilter))}
                />
                <UpgradeRow 
                  icon={<Cpu size={20} />}
                  title="Shadow Mining"
                  desc="Generates passive Shadow Points"
                  level={upgrades.shadowMining}
                  cost={Math.floor(500 * Math.pow(1.8, upgrades.shadowMining))}
                  onBuy={() => buyUpgrade('shadowMining', Math.floor(500 * Math.pow(1.8, upgrades.shadowMining)))}
                  canAfford={gameState.shadowPoints >= Math.floor(500 * Math.pow(1.8, upgrades.shadowMining))}
                />
                <UpgradeRow 
                  icon={<Activity size={20} />}
                  title="Precision Sync"
                  desc="Chance for 3x Critical Taps"
                  level={upgrades.precisionSync}
                  cost={Math.floor(1000 * Math.pow(2.0, upgrades.precisionSync))}
                  onBuy={() => buyUpgrade('precisionSync', Math.floor(1000 * Math.pow(2.0, upgrades.precisionSync)))}
                  canAfford={gameState.shadowPoints >= Math.floor(1000 * Math.pow(2.0, upgrades.precisionSync))}
                />
                <UpgradeRow 
                  icon={<TrendingUp size={20} />}
                  title="Flow State"
                  desc="Increases combo multiplier bonus"
                  level={upgrades.flowState}
                  cost={Math.floor(800 * Math.pow(1.9, upgrades.flowState))}
                  onBuy={() => buyUpgrade('flowState', Math.floor(800 * Math.pow(1.9, upgrades.flowState)))}
                  canAfford={gameState.shadowPoints >= Math.floor(800 * Math.pow(1.9, upgrades.flowState))}
                />
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="text-xs font-mono uppercase tracking-widest opacity-50 mb-1">Available Balance</div>
                <div className="text-2xl font-bold font-mono text-white">{gameState.shadowPoints.toLocaleString()} SP</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Overlay */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold uppercase italic tracking-tighter text-white">Achievements</h2>
                <button 
                  onClick={() => setShowAchievements(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {ACHIEVEMENTS.map(achievement => {
                  const isUnlocked = gameState.unlockedAchievements.includes(achievement.id);
                  return (
                    <div 
                      key={achievement.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${
                        isUnlocked 
                        ? 'bg-rose-500/10 border-rose-500/30' 
                        : 'bg-white/5 border-white/5 opacity-40 grayscale'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40'}`}>
                        {getAchievementIcon(achievement.icon)}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold uppercase tracking-tight ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                          {achievement.title}
                        </h3>
                        <p className="text-xs text-white/40">{achievement.description}</p>
                      </div>
                      {isUnlocked && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 text-rose-500">
                          <Target size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest opacity-50 mb-1">Completion</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {gameState.unlockedAchievements.length} / {ACHIEVEMENTS.length}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono uppercase tracking-widest opacity-50 mb-1">Total Taps</div>
                  <div className="text-2xl font-bold font-mono text-white">{gameState.totalTaps}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks Overlay */}
      <AnimatePresence>
        {showTasks && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold uppercase italic tracking-tighter text-white">Midnight Tasks</h2>
                <button 
                  onClick={() => setShowTasks(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {tasks.map(task => (
                  <div 
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      task.completed 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className={`font-bold uppercase tracking-tight ${task.completed ? 'text-emerald-400' : 'text-white'}`}>
                          {task.title}
                        </h3>
                        <p className="text-xs text-white/40">{task.description}</p>
                      </div>
                      {task.completed ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : (
                        <div className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded text-white/60">
                          {task.progress} / {task.requirement}
                        </div>
                      )}
                    </div>
                    
                    {!task.completed && (
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-3">
                        <div 
                          className="h-full bg-white/20 transition-all duration-500"
                          style={{ width: `${Math.min(100, (task.progress / task.requirement) * 100)}%` }}
                        />
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest opacity-50">Reward:</div>
                      <div className="flex items-center gap-1 text-xs font-bold text-white">
                        {task.reward} SP
                      </div>
                      {task.rewardKeys && (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                          + {task.rewardKeys} Key
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GhostItemProps {
  ghost: GhostTrace;
  onTap: () => void;
  radiusBonus: number;
}

const GhostItem: React.FC<GhostItemProps> = ({ ghost, onTap, radiusBonus }) => {
  const size = ghost.type === GhostType.BOSS ? 120 : ghost.type === GhostType.BLACK ? 64 : ghost.type === GhostType.ENCRYPTED ? 56 : 48;
  const color = ghost.type === GhostType.BOSS ? 'text-rose-500' : ghost.type === GhostType.BLACK ? 'text-amber-400' : ghost.type === GhostType.ENCRYPTED ? 'text-cyan-400' : 'text-white/40';
  const glow = ghost.type === GhostType.BOSS ? 'shadow-[0_0_40px_rgba(244,63,94,0.6)]' : ghost.type === GhostType.BLACK ? 'shadow-[0_0_20px_rgba(251,191,36,0.5)]' : ghost.type === GhostType.ENCRYPTED ? 'shadow-[0_0_15px_rgba(34,211,238,0.3)]' : '';

  // Increase hit area based on upgrade
  const hitAreaPadding = ghost.type === GhostType.BOSS ? 20 : 10 + (radiusBonus * 10);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
      }}
      transition={{
        duration: 0.3
      }}
      style={{ left: `${ghost.x}%`, top: `${ghost.y}%` }}
      exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      onClick={onTap}
    >
      {/* Hit Area (Invisible) */}
      <div 
        className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ padding: `${hitAreaPadding}px`, margin: `-${hitAreaPadding}px` }}
      />

      <div className={`relative flex items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 ${glow}`}
           style={{ width: size, height: size }}>
        
        {/* Multi-tap Progress */}
        {ghost.requiredTaps > 1 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: ghost.requiredTaps }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${i < ghost.currentTaps ? color : 'bg-white/10'}`} 
              />
            ))}
          </div>
        )}
        
        {/* Timer Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <motion.circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="100"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: 100 }}
            transition={{ duration: ghost.lifetime / 1000, ease: "linear" }}
            className={color}
          />
        </svg>

        <Ghost size={size * 0.5} className={`${color} ${ghost.type === GhostType.BOSS ? 'animate-pulse' : ''}`} />
        
        {ghost.type === GhostType.BOSS && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Lock size={24} className="text-rose-500 animate-bounce" />
          </div>
        )}

        {ghost.type === GhostType.BLACK && (
          <div className="absolute -top-1 -right-1">
            <Key size={16} className="text-amber-400 animate-bounce" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function getAchievementIcon(iconName: string) {
  switch (iconName) {
    case 'Star': return <Star size={20} />;
    case 'Trophy': return <Trophy size={20} />;
    case 'Key': return <Key size={20} />;
    case 'Crown': return <Crown size={20} />;
    case 'Award': return <Award size={20} />;
    case 'Target': return <Target size={20} />;
    case 'TrendingUp': return <TrendingUp size={20} />;
    case 'Activity': return <Activity size={20} />;
    case 'Cpu': return <Cpu size={20} />;
    default: return <Trophy size={20} />;
  }
}

function UpgradeRow({ icon, title, desc, level, cost, onBuy, canAfford }: { 
  icon: React.ReactNode, 
  title: string, 
  desc: string, 
  level: number, 
  cost: number, 
  onBuy: () => void,
  canAfford: boolean
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-white/5 text-white">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white uppercase tracking-tight">{title}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">LVL {level}</span>
          </div>
          <p className="text-xs text-white/40">{desc}</p>
        </div>
      </div>
      <button
        onClick={onBuy}
        disabled={!canAfford}
        className={`px-4 py-2 rounded-xl font-mono text-sm font-bold transition-all
          ${canAfford 
            ? 'bg-white text-black hover:bg-white/90 active:scale-95' 
            : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
      >
        {cost.toLocaleString()}
      </button>
    </div>
  );
}
