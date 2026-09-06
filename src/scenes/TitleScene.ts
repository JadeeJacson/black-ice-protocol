import Phaser from 'phaser';
import { GAME_TITLE, GAME_TITLE_EN, GAME_VERSION, PREMISE } from '../data/story';
import { STAGES } from '../data/stages';
import type { StageDef } from '../data/stages';
import { ACHIEVEMENTS } from '../data/achievements';
import { loadRecords, loadLastStage, saveLastStage, loadAchievements } from '../data/save';
import { makeTextures } from '../systems/textures';
import { unlockAudio, sfx } from '../audio';
import { PAL, CSS, FONT } from '../themes';

interface StageCardRefs {
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
  record: Phaser.GameObjects.Text;
  accent: number;
}

export class TitleScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.TileSprite;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private premise!: Phaser.GameObjects.Text;
  private selectLabel!: Phaser.GameObjects.Text;
  private cards: StageCardRefs[] = [];
  private hint!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private achvText!: Phaser.GameObjects.Text;

  /** 固定引用注册 resize 监听，便于场景 shutdown 时注销（否则镜头销毁后触发会崩溃） */
  private readonly onResize = (): void => this.layout();

  constructor() {
    super('Title');
  }

  create(): void {
    makeTextures(this);
    this.cards = []; // scene.restart/再次进入时清空上一次的卡片引用
    const cam = this.cameras.main;

    this.grid = this.add.tileSprite(0, 0, cam.width, cam.height, 'grid').setOrigin(0).setDepth(-10);
    this.add.tileSprite(0, 0, cam.width, cam.height, 'scan')
      .setOrigin(0).setScrollFactor(0).setDepth(120).setAlpha(0.4);

    this.add.particles(0, 0, 'glow', {
      x: { min: 0, max: cam.width },
      y: cam.height + 20,
      lifespan: 9000,
      speedY: { min: -30, max: -12 },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.2, end: 0 },
      blendMode: 'ADD',
      tint: [PAL.neonCyan, PAL.neonPurple, PAL.neonMagenta],
      frequency: 180,
    }).setDepth(-5);

    this.title = this.add.text(0, 0, GAME_TITLE, {
      fontFamily: FONT, fontSize: '60px', color: CSS.cyan, fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      .setShadow(0, 0, '#00ffd5', 24, true, true);

    this.subtitle = this.add.text(0, 0, `${GAME_TITLE_EN}   //   ${GAME_VERSION}`, {
      fontFamily: FONT, fontSize: '14px', color: CSS.magenta,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      .setShadow(0, 0, '#ff2bd6', 10, true, true);

    this.premise = this.add.text(0, 0, PREMISE, {
      fontFamily: FONT, fontSize: '13px', color: CSS.text, align: 'center',
      lineSpacing: 6, wordWrap: { width: 560 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.selectLabel = this.add.text(0, 0, '>> 选择接入节点 <<', {
      fontFamily: FONT, fontSize: '16px', color: CSS.text,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
    this.tweens.add({
      targets: this.selectLabel,
      alpha: { from: 1, to: 0.45 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // 关卡卡片（独立对象，不用 Container —— 容器内输入命中不可靠）
    const records = loadRecords();
    const lastStage = loadLastStage();
    const cardW = Math.min(440, cam.width - 40);
    STAGES.forEach((stage: StageDef, i) => {
      const rec = records[stage.id];
      const recordText = rec && rec.wins > 0
        ? `通关 ${rec.wins} 次 · 最佳击杀 ${rec.bestKills}`
        : rec && rec.bestAlive > 0
          ? `最远存活 ${rec.bestAlive}s`
          : '尚未接入';
      const bg = this.add.rectangle(0, 0, cardW, 48, PAL.panel, 0.94)
        .setStrokeStyle(1, stage.accent, stage.id === lastStage ? 0.95 : 0.35)
        .setScrollFactor(0).setDepth(10)
        .setInteractive({ useHandCursor: true });
      const name = this.add.text(0, 0, stage.name, {
        fontFamily: FONT, fontSize: '16px', color: CSS.cyan,
      }).setScrollFactor(0).setDepth(11);
      const tag = this.add.text(0, 0, stage.tag, {
        fontFamily: FONT, fontSize: '11px', color: CSS.textDim,
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(11);
      const record = this.add.text(0, 0, recordText, {
        fontFamily: FONT, fontSize: '10px', color: CSS.textDim,
      }).setScrollFactor(0).setDepth(11);

      bg.on('pointerover', () => {
        bg.setStrokeStyle(1.5, stage.accent, 1);
        name.setColor('#ffffff');
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(1, stage.accent, stage.id === lastStage ? 0.95 : 0.35);
        name.setColor(CSS.cyan);
      });
      bg.on('pointerdown', () => this.startStage(stage));

      this.cards.push({ bg, name, tag, record, accent: stage.accent });
      void i;
    });

    const unlocked = loadAchievements().length;
    this.achvText = this.add.text(0, 0, `成就 ${unlocked}/${ACHIEVEMENTS.length}`, {
      fontFamily: FONT, fontSize: '11px', color: '#ffe14d',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

    this.hint = this.add.text(0, 0, 'WASD / 方向键 移动    ·    触屏拖动移动    ·    ESC 暂停    ·    M 静音', {
      fontFamily: FONT, fontSize: '12px', color: CSS.textDim,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.footer = this.add.text(0, 0, '致敬威廉·吉布森《蔓生三部曲》意象 · 文案原创 · Phaser 3 + TypeScript', {
      fontFamily: FONT, fontSize: '10px', color: CSS.textDim,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.scale.on('resize', this.onResize);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize));
    this.layout();

    this.input.once(Phaser.Input.Events.POINTER_DOWN, unlockAudio);
    this.input.keyboard?.once('keydown', unlockAudio);
    const fallback = loadLastStage() || STAGES[0].id;
    this.input.keyboard?.once('keydown-ENTER', () => this.startStageById(fallback));
    this.input.keyboard?.once('keydown-SPACE', () => this.startStageById(fallback));
  }

  private startStage(stage: StageDef): void {
    this.startStageById(stage.id);
  }

  private startStageById(id: string): void {
    unlockAudio();
    sfx('ui');
    saveLastStage(id);
    this.registry.set('stage', id);
    this.scene.start('Game');
  }

  private layout(): void {
    const cam = this.cameras.main;
    if (!cam || !this.grid || !this.grid.scene) return;
    const cx = cam.width / 2;
    this.grid.setSize(cam.width, cam.height);
    this.title.setPosition(cx, cam.height * 0.13);
    this.subtitle.setPosition(cx, cam.height * 0.13 + 48);
    this.premise.setPosition(cx, cam.height * 0.29);
    this.premise.setWordWrapWidth(Math.min(560, cam.width - 48));
    this.selectLabel.setPosition(cx, cam.height * 0.42);
    this.achvText.setPosition(cam.width - 12, 12);
    const cardW = Math.min(440, cam.width - 40);
    const y0 = cam.height * 0.47;
    const step = 0.062 * cam.height;
    this.cards.forEach((c) => {
      if (!c.bg.scene) return; // 已销毁的旧引用直接跳过
      const y = y0 + this.cards.indexOf(c) * step;
      c.bg.setPosition(cx, y);
      c.name.setPosition(cx - cardW / 2 + 16, y - 14);
      c.tag.setPosition(cx + cardW / 2 - 14, y - 14);
      c.record.setPosition(cx - cardW / 2 + 16, y + 6);
    });
    this.hint.setPosition(cx, cam.height * 0.7);
    this.footer.setPosition(cx, cam.height - 14);
  }

  update(): void {
    this.grid.tilePositionY -= 0.12;
  }
}
