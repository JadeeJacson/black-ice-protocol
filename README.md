# 黑冰协议 BLACK ICE PROTOCOL

一款赛博朋克题材的幸存者割草（Survivors-like）网页游戏。致敬威廉·吉布森《蔓生三部曲》的意象（矩阵 / ICE / 黑冰 / 义体 / 蔓生城），剧情文案为原创。

**在线游玩：https://你的用户名.github.io/black-ice-protocol/**（部署后回填）

## 玩法

你是代号「幽灵」的自由骇客，潜入企业巨塔的深层主机窃取一枚被囚禁的 AI 内核。防火墙已烧穿，主机的免疫系统正在孵化成群的黑冰（Black ICE）猎杀你——**在 6 分钟数据上传完成之前活下来**。

- 移动躲避，武器自动射击最近的敌人
- 拾取经验晶片升级，每次升级从三选一中安装一项强化（轨道刃、脉冲新星、多线程弹道、义体改造……）
- 敌人密度与强度随时间上升，每 75 秒一波 ICE 包围网
- 运行中的终端讯息推进一段微型剧情；死亡与通关各有结语

## 操作

| 平台 | 操作 |
|---|---|
| 桌面 | WASD / 方向键移动，M 静音 |
| 手机 | 触屏按住并拖动（虚拟摇杆） |

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
