import type { GameScene } from '../scenes/GameScene';
import type { Player } from '../entities/Player';

/** 升级定义：数据驱动，新增强化只需在此追加条目 */
export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  max: number;
  weight: number;
  apply: (scene: GameScene, player: Player) => void;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'dmg',    name: '裂解器超频',     desc: '所有攻击伤害 +25%',                        max: 8, weight: 10, apply: (_s, p) => { p.damageMul += 0.25; } },
  { id: 'rate',   name: '神经反射加速',   desc: '射击频率 +18%',                            max: 8, weight: 10, apply: (_s, p) => { p.rateMul += 0.18; } },
  { id: 'proj',   name: '多线程弹道',     desc: '额外发射 1 发脉冲弹',                      max: 4, weight: 7,  apply: (_s, p) => { p.extraProj += 1; } },
  { id: 'pierce', name: '透波弹头',       desc: '脉冲弹可穿透 +1 个目标',                   max: 4, weight: 6,  apply: (_s, p) => { p.pierce += 1; } },
  { id: 'speed',  name: '义体·猎豹腿部',  desc: '移动速度 +14%',                            max: 5, weight: 8,  apply: (_s, p) => { p.speed *= 1.14; } },
  { id: 'hp',     name: '义体·复合躯干',  desc: '生命上限 +25，并立即恢复 25',              max: 5, weight: 8,  apply: (_s, p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'orbit',  name: '轨道刃·断路',    desc: '召唤 1 枚环绕自身旋转的数据刃',            max: 4, weight: 6,  apply: (s, p) => { p.orbitBlades += 1; s.syncOrbitBlades(); } },
  { id: 'nova',   name: '脉冲新星',       desc: '周期性释放电磁冲击波，叠加后更强',          max: 4, weight: 6,  apply: (_s, p) => { p.novaLevel += 1; p.novaDmg += 25; p.novaRadius += 25; } },
  { id: 'magnet', name: '数据引力阱',     desc: '拾取范围 +45%',                            max: 4, weight: 7,  apply: (_s, p) => { p.pickupRange *= 1.45; } },
  { id: 'repair', name: '纳米修复液',     desc: '立即恢复 60% 生命',                        max: 9, weight: 4,  apply: (_s, p) => { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.6); } },
];
