/** 成就定义：轻量数据驱动，test 根据局内/生涯上下文判断是否达成 */

export interface AchvCtx {
  // 局内
  kills: number;
  walls: number; // 击杀黑冰墙数
  level: number;
  dist: number; // 累计移动距离
  maxChain: number; // 电弧单次最大连锁数
  // 生涯
  playCount: number;
  winCount: number;
  // 局内武器等级
  orbitLv: number;
  novaLv: number;
  arcLv: number;
  shardLv: number;
  wellLv: number;
  // 结算时填入
  win: boolean;
  hpPctAtWin: number;
  hitTaken: boolean;
  bossKilled: boolean;
  buffPurchases: number;
}

export interface AchvDef {
  id: string;
  name: string;
  desc: string;
  test: (c: AchvCtx) => boolean;
}

export const ACHIEVEMENTS: AchvDef[] = [
  { id: 'first_run',    name: '初次接入',   desc: '完成你的第一局',                          test: (c) => c.playCount >= 1 },
  { id: 'first_win',    name: '上传完成',   desc: '首次通关任意关卡',                        test: (c) => c.winCount >= 1 },
  { id: 'kills_100',    name: '清道夫',     desc: '单局击杀 100 个进程',                     test: (c) => c.kills >= 100 },
  { id: 'kills_300',    name: '割草协议',   desc: '单局击杀 300 个进程',                     test: (c) => c.kills >= 300 },
  { id: 'level_15',     name: '深度同步',   desc: '单局达到 15 级',                          test: (c) => c.level >= 15 },
  { id: 'chain_5',      name: '连锁反应',   desc: '电弧单次连锁 5 个敌人',                   test: (c) => c.maxChain >= 5 },
  { id: 'orbit_max',    name: '轨道大师',   desc: '轨道刃升至满级（4）',                     test: (c) => c.orbitLv >= 4 },
  { id: 'walls_10',     name: '破壁者',     desc: '单局击杀 10 个黑冰墙',                    test: (c) => c.walls >= 10 },
  { id: 'low_hp_win',   name: '极限上传',   desc: '生命低于 30% 时通关',                     test: (c) => c.win && c.hpPctAtWin < 0.3 },
  { id: 'no_hit_win',   name: '完美潜入',   desc: '未受任何伤害通关',                        test: (c) => c.win && !c.hitTaken },
  { id: 'all_weapons',  name: '全栈武装',   desc: '同时持有全部 5 种特殊武器',               test: (c) => c.orbitLv > 0 && c.novaLv > 0 && c.arcLv > 0 && c.shardLv > 0 && c.wellLv > 0 },
  { id: 'distance_5000', name: '漫游者',    desc: '单局累计移动 5000 单位',                  test: (c) => c.dist >= 5000 },
  { id: 'boss_kill',    name: '弑神',       desc: '首次击败看守者',                          test: (c) => c.bossKilled },
  { id: 'buff_buy',     name: '初次交易',   desc: '首次消耗击杀储备购买进场增益',            test: (c) => c.buffPurchases >= 1 },
];
