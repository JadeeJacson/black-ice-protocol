/** 进场增益池：消耗历史击杀储备，在开局前三选一兑换，仅本次对局生效 */

export interface PrerunBuff {
  id: string;
  name: string;
  desc: string;
  cost: number;
}

export const PRERUN_BUFFS: PrerunBuff[] = [
  { id: 'bulk',   name: '加固义体',   desc: '生命上限 +60，并立即恢复 60',            cost: 150 },
  { id: 'speed',  name: '神经超频',   desc: '本次对局移动速度 +15%',                  cost: 150 },
  { id: 'magnet', name: '虹吸协议',   desc: '拾取范围 +60%，医疗包掉率翻倍',          cost: 150 },
  { id: 'dmg',    name: '过载核心',   desc: '本次对局所有伤害 +25%',                  cost: 250 },
  { id: 'orbit1', name: '预装轨道刃', desc: '开局自带 1 级轨道刃',                    cost: 250 },
  { id: 'level3', name: '热启动',     desc: '开局立即连升 3 级',                      cost: 400 },
];

export function rollPrerunOffers(n: number): PrerunBuff[] {
  const pool = [...PRERUN_BUFFS];
  const picks: PrerunBuff[] = [];
  while (picks.length < n && pool.length > 0) {
    picks.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return picks;
}

/** 任意增益的最低价，用于判断是否值得弹出面板 */
export const MIN_BUFF_COST = Math.min(...PRERUN_BUFFS.map((b) => b.cost));
