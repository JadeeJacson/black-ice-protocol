# 黑冰协议 BLACK ICE PROTOCOL

一款赛博朋克题材的幸存者割草（Survivors-like）网页游戏。致敬威廉·吉布森《蔓生三部曲》的意象（矩阵 / ICE / 黑冰 / 义体 / 蔓生城），剧情文案为原创。

**在线游玩：<https://jadeejacson.github.io/black-ice-protocol/>**

## 玩法

你是代号「幽灵」的自由骇客，潜入企业巨塔的深层主机窃取一枚被囚禁的 AI 内核。防火墙已烧穿，主机的免疫系统正在孵化成群的黑冰（Black ICE）猎杀你——**在数据上传完成之前活下来**。

- **三个关卡**：外围信标带（6:00 标准）/ 冷却走廊（4:30 高速）/ 核心深井（7:30 重装），各有敌种配比、难度曲线、主题配色与剧情节点
- 移动躲避，武器自动射击；拾取经验晶片升级，三选一安装强化
- **六种武器系**：脉冲弹（基础）/ 轨道刃（近防）/ 脉冲新星（范围）/ 链式电弧（连锁）/ 蚀刻飞刃（追踪）/ 引力异常（聚怪控制），另有暴击、穿透等属性强化
- **精英与首领**：精英敌人（大体型高经验）随战况出现；每关最后 75 秒首领「看守者」登场——蓄力冲刺、环形弹幕、召唤护卫
- **击杀储备**：历史总击杀是货币，开局三选一兑换进场增益（仅当局生效）
- **14 个成就**：右上角 Steam 式弹窗，localStorage 持久化；每关纪录（通关次数 / 最佳击杀 / 最远存活）
- 运行中的终端讯息推进微型剧情；死亡与通关各有结语；程序化 BGM 随战况分层

## 操作

| 平台 | 操作 |
|---|---|
| 桌面 | WASD / 方向键移动，ESC/P 暂停，M 静音 |
| 手机 | 触屏拖动移动，右上角 ‖ 暂停 |

## 技术栈与结构

- **Phaser 3 + TypeScript + Vite**，无外部美术/音频资源：
  - 贴图全部由 Canvas 程序化绘制（`src/systems/textures.ts`，霓虹几何风）
  - 音效由 WebAudio 振荡器合成（`src/audio.ts`）
- 升级数据驱动（`src/data/upgrades.ts`），新增强化只需追加条目
- 剧情文案集中在 `src/data/story.ts`

```
src/
  main.ts              # 游戏配置与入口
  scenes/TitleScene.ts # 标题 / 剧情 / 开始
  scenes/GameScene.ts  # 核心战斗、生成器、升级面板、HUD、结算
  entities/            # Player / Enemy
  systems/             # 程序化贴图、虚拟摇杆
  data/                # 升级定义、剧情文案
  themes.ts            # 配色与字体
  audio.ts             # 合成音效
```

## 本地运行

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 类型检查 + 产线构建（输出 dist/）
npm run preview  # 预览构建产物
```

调试便利：

- URL 加 `?canvas` 强制 Canvas 渲染器（GPU 异常时的兼容模式）
- 控制台 `__BIP.game` 可访问 Phaser.Game 实例

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动构建并发布到 GitHub Pages。

## 路线图（v2 候选）

- 更多武器与进化路线、敌人图鉴
- 局外成长 / 排行榜（localStorage 起步）
- 微信小游戏适配（现有纯 Canvas 架构可直接迁移）
- Tauri 打包桌面版
