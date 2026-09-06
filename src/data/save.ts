/** localStorage 存档：成就 / 关卡纪录 / 局数 / 上次选关 */

export interface StageRecord {
  wins: number;
  bestKills: number;
  bestAlive: number; // 秒
}

const K_ACHV = 'bip_achv';
const K_RECORDS = 'bip_records';
const K_PLAYCOUNT = 'bip_playcount';
const K_LASTSTAGE = 'bip_laststage';
const K_TOTALKILLS = 'bip_totalkills';
const K_BUFFS = 'bip_buffs';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式等场景下静默失败 */
  }
}

export function loadAchievements(): string[] {
  return readJSON<string[]>(K_ACHV, []);
}

export function saveAchievements(ids: string[]): void {
  writeJSON(K_ACHV, ids);
}

export function loadRecords(): Record<string, StageRecord> {
  return readJSON<Record<string, StageRecord>>(K_RECORDS, {});
}

export function saveRecords(records: Record<string, StageRecord>): void {
  writeJSON(K_RECORDS, records);
}

export function loadPlayCount(): number {
  return readJSON<number>(K_PLAYCOUNT, 0);
}

export function savePlayCount(n: number): void {
  writeJSON(K_PLAYCOUNT, n);
}

export function loadLastStage(): string {
  return readJSON<string>(K_LASTSTAGE, '');
}

export function saveLastStage(id: string): void {
  writeJSON(K_LASTSTAGE, id);
}

/** 历史总击杀：进场增益的货币 */
export function loadTotalKills(): number {
  return readJSON<number>(K_TOTALKILLS, 0);
}

export function saveTotalKills(n: number): void {
  writeJSON(K_TOTALKILLS, n);
}

/** 历史购买进场增益次数（成就用） */
export function loadBuffPurchases(): number {
  return readJSON<number>(K_BUFFS, 0);
}

export function saveBuffPurchases(n: number): void {
  writeJSON(K_BUFFS, n);
}
