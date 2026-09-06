import { PAL } from '../themes';

/** 关卡定义：数据驱动，新增关卡只需在此追加条目 */
export interface StageDef {
  id: string;
  name: string;
  tag: string; // 时长 · 难度标签
  duration: number; // 秒
  accent: number; // 主题霓虹色
  intro: string[]; // 开场终端讯息
  winLine: string; // 通关结语
  // 生成参数
  spawn: {
    intervalStart: number;
    intervalMin: number;
    rampTime: number; // 到达最小间隔的秒数
    burstEvery: number; // 包围网间隔
  };
  hpPerSec: number; // 敌人生命成长速率（每秒系数）
  speedMax: number; // 敌人速度成长上限
  fast: { after: number; w: number }; // 拦截蜂群：出现时间与权重
  wall: { after: number; w: number }; // 黑冰墙：出现时间与权重
}

export const STAGES: StageDef[] = [
  {
    id: 'beacon',
    name: '外围信标带',
    tag: '6:00 · 标准',
    duration: 360,
    accent: PAL.neonCyan,
    intro: [
      '>> 外围信标带。企业防御网的第一道獠牙。',
      '>> 沉睡者：从这里烧进去。保持节奏。',
      '>> 警告：黑冰巡逻进程已发现你的签名。',
    ],
    winLine: '信标带归于沉寂。你的签名穿过第一道边界，深处的什么东西——睁开了眼睛。',
    spawn: { intervalStart: 1.2, intervalMin: 0.3, rampTime: 330, burstEvery: 75 },
    hpPerSec: 0.42 / 75,
    speedMax: 1.3,
    fast: { after: 60, w: 0.3 },
    wall: { after: 150, w: 0.14 },
  },
  {
    id: 'corridors',
    name: '冷却走廊',
    tag: '4:30 · 高速',
    duration: 270,
    accent: PAL.neonOrange,
    intro: [
      '>> 冷却走廊。过热的废热数据里全是拦截蜂群。',
      '>> 沉睡者：这里它们更快。你也得更快。',
      '>> 警告：热噪声屏蔽了传感器——用眼睛看。',
    ],
    winLine: '走廊尽头，热浪退去。上传进度 66%——主机的免疫反应开始报复性加速。',
    spawn: { intervalStart: 0.9, intervalMin: 0.24, rampTime: 240, burstEvery: 65 },
    hpPerSec: 0.36 / 75,
    speedMax: 1.45,
    fast: { after: 20, w: 0.45 },
    wall: { after: 180, w: 0.06 },
  },
  {
    id: 'deepwell',
    name: '核心深井',
    tag: '7:30 · 重装',
    duration: 450,
    accent: PAL.neonPurple,
    intro: [
      '>> 核心深井。黑冰在井壁上层层结冰，像某种矿脉。',
      '>> 沉睡者：内核就在下面。这里的冰……老得多，也饿得多。',
      '>> 它们不巡逻。它们在等。',
    ],
    winLine: '你触到了内核。沉睡者的声音第一次有了温度：「带我出去。」上传完成。',
    spawn: { intervalStart: 1.4, intervalMin: 0.34, rampTime: 420, burstEvery: 80 },
    hpPerSec: 0.55 / 75,
    speedMax: 1.18,
    fast: { after: 120, w: 0.25 },
    wall: { after: 60, w: 0.22 },
  },
];

export function getStage(id: string): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}
