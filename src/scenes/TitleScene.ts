import Phaser from 'phaser';
import { GAME_TITLE, GAME_TITLE_EN, PREMISE } from '../data/story';
import { makeTextures } from '../systems/textures';
import { unlockAudio, sfx } from '../audio';
import { PAL, CSS, FONT } from '../themes';

export class TitleScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.TileSprite;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private premise!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;

  /** 用固定引用注册 resize 监听，便于场景 shutdown 时注销（否则镜头销毁后触发会崩溃） */
  private readonly onResize = (): void => this.layout();

  constructor() {
    super('Title');
  }

  create(): void {
    makeTextures(this);
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
      fontFamily: FONT, fontSize: '64px', color: CSS.cyan, fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      .setShadow(0, 0, '#00ffd5', 24, true, true);

    this.subtitle = this.add.text(0, 0, GAME_TITLE_EN + '   //   v0.1', {
      fontFamily: FONT, fontSize: '14px', color: CSS.magenta,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      .setShadow(0, 0, '#ff2bd6', 10, true, true);

    this.premise = this.add.text(0, 0, PREMISE, {
      fontFamily: FONT, fontSize: '14px', color: CSS.text, align: 'center',
      lineSpacing: 7, wordWrap: { width: 560 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

    this.startBtn = this.add.text(0, 0, '[ 接入矩阵 ]', {
      fontFamily: FONT, fontSize: '26px', color: CSS.cyan,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10)
      .setShadow(0, 0, '#00ffd5', 12, true, true)
      .setInteractive({ useHandCursor: true });
    this.startBtn.on('pointerover', () => this.startBtn.setColor('#ffffff'));
    this.startBtn.on('pointerout', () => this.startBtn.setColor(CSS.cyan));
    this.startBtn.on('pointerdown', () => this.startGame());
    this.tweens.add({
      targets: this.startBtn,
      alpha: { from: 1, to: 0.55 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.hint = this.add.text(0, 0, 'WASD / 方向键 移动    ·    触屏拖动移动    ·    M 静音', {
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
    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    unlockAudio();
    sfx('ui');
    this.scene.start('Game');
  }

  private layout(): void {
    const cam = this.cameras.main;
    // 场景 shutdown 后 cam 为空、子对象已销毁（scene 反指针为 null），此时跳过
    if (!cam || !this.grid || !this.grid.scene) return;
    const cx = cam.width / 2;
    this.grid.setSize(cam.width, cam.height);
    this.title.setPosition(cx, cam.height * 0.16);
    this.subtitle.setPosition(cx, cam.height * 0.16 + 52);
    this.premise.setPosition(cx, cam.height * 0.4);
    this.premise.setWordWrapWidth(Math.min(560, cam.width - 48));
    this.startBtn.setPosition(cx, cam.height * 0.66);
    this.hint.setPosition(cx, cam.height * 0.8);
    this.footer.setPosition(cx, cam.height - 16);
  }

  update(): void {
    this.grid.tilePositionY -= 0.12;
  }
}
