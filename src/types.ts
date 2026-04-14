export enum GhostType {
  COMMON = "COMMON",
  ENCRYPTED = "ENCRYPTED",
  BLACK = "BLACK",
  BOSS = "BOSS",
}

export interface GhostTrace {
  id: string;
  type: GhostType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  startTime: number;
  lifetime: number;
  value: number;
  isBlack?: boolean;
  requiredTaps: number;
  currentTaps: number;
}

export interface Upgrades {
  stealthFingers: number; // tap radius
  shadowVision: number; // lifetime bonus
  noiseFilter: number; // encrypted chance
  shadowMining: number; // passive income
  precisionSync: number; // crit chance
  flowState: number; // combo duration/multiplier
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  type: 'points' | 'keys' | 'bosses' | 'taps' | 'combo' | 'passive';
  unlocked: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number; // SP reward
  rewardKeys?: number;
  requirement: number;
  type: 'taps' | 'bosses' | 'keys' | 'upgrades';
  progress: number;
  completed: boolean;
}

export interface GameState {
  shadowPoints: number;
  darkKeys: number;
  district: string;
  isBananaMode: boolean;
  bananaModeEndTime: number;
  totalTaps: number;
  bossesDefeated: number;
  unlockedAchievements: string[];
  completedTasks: string[];
  currentCombo: number;
  maxCombo: number;
  lastTapTime: number;
  passiveIncome: number; // SP per second
}

export const DISTRICTS = [
  { name: "Back Alleys", threshold: 0, color: "text-emerald-400", bg: "bg-emerald-950/20" },
  { name: "Dark Hub", threshold: 500, color: "text-indigo-400", bg: "bg-indigo-950/20" },
  { name: "zk District", threshold: 2000, color: "text-violet-400", bg: "bg-violet-950/20" },
  { name: "Core Void", threshold: 5000, color: "text-rose-400", bg: "bg-rose-950/20" },
];
