import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy, ENEMY_CONF } from '../entities/Enemy';
import type { EnemyKind } from '../entities/Enemy';
import { UPGRADES } from '../data/upgrades';
import type { UpgradeDef } from '../data/upgrades';
import { BEATS, WIN_LINES, DEATH_LINES } from '../data/story';
import { getStage } from '../data/stages';
import type { StageDef } from '../data/stages';
import { ACHIEVEMENTS } from '../data/achievements';
import type { AchvCtx } from '../data/achievements';
import { loadRecords, saveRecords, loadPlayCount, savePlayCount, loadAchievements, saveAchievements } from '../data/save';
import { makeTextures } from '../systems/textures';
import { Joystick } from '../systems/Joystick';
import { DamageNumbers } from '../systems/DamageNumbers';
import { AchievementToast } from '../systems/AchievementToast';
import { sfx, toggleMute, isMuted } from '../audio';
import { PAL, CSS, FONT } from '../themes';

const WORLD = 2400;
const MAX_ENEMIES = 150;
const BULLET_DMG = 10;

interface ArcFx {
  pts: Phaser.Math.Vector2[];
  ttl: number;
}

interface Well {
  x: number;
  y: number;
  r: number;
  until: number;
  level: number;
  gfx: Phaser.GameObjects.Image;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private shards!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private meds!: Phaser.Physics.Arcade.Group;
  private blades: Phaser.GameObjects.Image[] = [];
  private bladeAngle = 0;
  private ring!: Phaser.GameObjects.Image;
  private joystick!: Joystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  // 关卡
  private stage!: StageDef;
  private beatTimes: { t: number; text: string }[] = [];

  // 局内状态（scene.restart 不重建实例，全部在 create 重置）
  private elapsed = 0;
  private kills = 0;
  private level = 1;
  private xp = 0;
  private xpNext = 7;
  private spawnTimer = 1.2;
  private burstTimer = 0;
  private novaTimer = 0;
  private arcTimer = 0;
  private shardTimer = 0;
  private wellTimer = 0;
  private taken: Record<string, number> = {};
  private beatIndex = 0;
  private ended = false;
  private paused = false;
  private pauseOpen = false;
  private pendingLevels = 0;
  private bulletGen = 0;
  private newRecord = false;

  // 武器特效
  private arcs: ArcFx[] = [];
  private arcGfx!: Phaser.GameObjects.Graphics;
  private wells: Well[] = [];

  // 成就与纪录
  private dmgNums!: DamageNumbers;
  private toast!: AchievementToast;
  private unlockedAchv = new Set<string>();
  private playCountTotal = 0;
  private winCountTotal = 0;
  private achv = { walls: 0, dist: 0, maxChain: 0, hitTaken: false };
  private achvTimer = 5;

  // HUD
  private hud!: Phaser.GameObjects.Container;
  private xpFill!: Phaser.GameObjects.Rectangle;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private muteHint!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private messageTween?: Phaser.Tweens.Tween;
  private scan!: Phaser.GameObjects.TileSprite;

  /** 当前打开面板（升级/暂停/结算）的全部对象，关闭时统一销毁。
   *  注意：刻意不用 Container —— 容器子元素的输入命中与渲染变换不一致，会导致点击失效 */
  private panelObjects: Phaser.GameObjects.GameObject[] = [];

  /** 固定引用注册 resize 监听，便于场景 shutdown 时注销 */
  private readonly onResize = (): void => this.layout();

  constructor() {
    super('Game');
  }

  create(): void {
    makeTextures(this);

    // 防御：Clock 的 paused 标记不会被 Clock.shutdown 重置（Phaser 行为），
    // endGame → scene.restart 后会残留「时钟冻结」，导致升级面板的 delayedCall 永不触发。
    // 物理世界的 isPaused 同理有残留风险，一并强制复位。
    this.time.paused = false;
    this.physics.world.resume();

    // 关卡选择：标题界面写入 registry，scene.restart 后依然保留
    const stageId = (this.registry.get('stage') as string) || 'beacon';
    this.stage = getStage(stageId);
    this.beatTimes = BEATS.map((b) => ({ t: b.t * (this.stage.duration / 360), text: b.text }));

    // 状态重置
    this.elapsed = 0;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 7;
    this.spawnTimer = this.stage.spawn.intervalStart;
    this.burstTimer = 0;
    this.novaTimer = 0;
    this.arcTimer = 0;
    this.shardTimer = 0;
    this.wellTimer = 0;
    this.taken = {};
    this.beatIndex = 0;
    this.ended = false;
    this.paused = false;
    this.pauseOpen = false;
    this.pendingLevels = 0;
    this.bulletGen = 0;
    this.bladeAngle = 0;
    this.blades.forEach((b) => b.destroy());
    this.blades = [];
    this.panelObjects = [];
    this.arcs = [];
    this.wells = [];
    this.newRecord = false;
    this.achv = { walls: 0, dist: 0, maxChain: 0, hitTaken: false };
    this.achvTimer = 5;
    this.unlockedAchv = new Set(loadAchievements());
    this.playCountTotal = loadPlayCount();
    this.winCountTotal = Object.values(loadRecords()).reduce((s, r) => s + r.wins, 0);

    const cam = this.cameras.main;
    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    cam.setBounds(0, 0, WORLD, WORLD);

    // ---- 世界（按关卡主题着色）----
    this.add.tileSprite(WORLD / 2, WORLD / 2, WORLD, WORLD, 'grid').setDepth(-10).setTint(this.stage.accent);
    this.add.rectangle(WORLD / 2, WORLD / 2, WORLD + 10, WORLD + 10)
      .setStrokeStyle(4, this.stage.accent, 0.5).setDepth(-5);
    this.add.particles(0, 0, 'glow', {
      x: { min: 0, max: WORLD },
      y: { min: 0, max: WORLD },
      lifespan: 7000,
      speedY: { min: -14, max: -4 },
      speedX: { min: -3, max: 3 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.22, end: 0 },
      blendMode: 'ADD',
      tint: [this.stage.accent, PAL.neonPurple],
      frequency: 140,
    }).setDepth(-8);

    // ---- 玩家与镜头 ----
    this.player = new Player(this, WORLD / 2, WORLD / 2);
    this.ring = this.add.image(this.player.x, this.player.y, 'ringSeg')
      .setTint(this.stage.accent).setAlpha(0.5).setDepth(19);
    cam.startFollow(this.player, true, 0.15, 0.15);
    this.add.particles(0, 0, 'glow', {
      follow: this.player,
      lifespan: 380,
      speed: 14,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.28, end: 0 },
      blendMode: 'ADD',
      tint: this.stage.accent,
      frequency: 45,
    }).setDepth(11);

    // ---- 对象池 ----
    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: MAX_ENEMIES });
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 220 });
    this.shards = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 60 });
    this.gems = this.physics.add.group({ maxSize: 140 });
    this.meds = this.physics.add.group({ maxSize: 8 });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) =>
      this.onBulletHit(b as Phaser.Physics.Arcade.Sprite, e as Enemy));
    this.physics.add.overlap(this.shards, this.enemies, (b, e) =>
      this.onBulletHit(b as Phaser.Physics.Arcade.Sprite, e as Enemy));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) =>
      this.damagePlayer((e as Enemy).dmg));
    this.physics.add.overlap(this.player, this.gems, (_p, g) =>
      this.collectGem(g as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.meds, (_p, m) =>
      this.collectMed(m as Phaser.Physics.Arcade.Sprite));

    // ---- 特效层 ----
    this.arcGfx = this.add.graphics().setDepth(17);
    this.dmgNums = new DamageNumbers(this);
    this.toast = new AchievementToast(this);

    // ---- 输入 ----
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    this.joystick = new Joystick(this);
    this.input.keyboard!.on('keydown-M', () => {
      const m = toggleMute();
      this.showMessage(m ? '>> 音效已关闭' : '>> 音效已开启', 1.6);
    });
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard!.on('keydown-P', () => this.togglePause());

    // ---- HUD ----
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(80);
    // 注意：Container 不传播 scrollFactor，每个子元素必须各自设置为 0，否则镜头移动时出现重影
    const xpBg = this.add.rectangle(12, 10, 376, 7, 0x0a1020).setOrigin(0, 0.5).setStrokeStyle(1, 0x223355, 1).setScrollFactor(0);
    this.xpFill = this.add.rectangle(13, 10, 374, 4, this.stage.accent).setOrigin(0, 0.5).setScale(0, 1).setScrollFactor(0);
    const hpBg = this.add.rectangle(12, 26, 204, 10, 0x0a1020).setOrigin(0, 0.5).setStrokeStyle(1, 0x223355, 1).setScrollFactor(0);
    this.hpFill = this.add.rectangle(13, 26, 202, 7, PAL.hpGreen).setOrigin(0, 0.5).setScrollFactor(0);
    this.hpText = this.add.text(226, 26, '', { fontFamily: FONT, fontSize: '12px', color: CSS.textDim }).setOrigin(0, 0.5).setScrollFactor(0);
    this.levelText = this.add.text(12, 38, 'LV.1', { fontFamily: FONT, fontSize: '12px', color: CSS.cyan }).setOrigin(0, 0.5).setScrollFactor(0);
    this.killText = this.add.text(388, 26, '击杀 0', { fontFamily: FONT, fontSize: '13px', color: CSS.text }).setOrigin(1, 0.5).setScrollFactor(0);
    this.hud.add([xpBg, this.xpFill, hpBg, this.hpFill, this.hpText, this.levelText, this.killText]);

    this.timeText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '24px', color: CSS.cyan })
      .setOrigin(0.5).setScrollFactor(0).setDepth(80)
      .setShadow(0, 0, '#00ffd5', 10, true, true);
    this.message = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '15px', color: '#cfe6ff', align: 'center',
      wordWrap: { width: 600 }, lineSpacing: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(85).setAlpha(0);
    this.muteHint = this.add.text(0, 0, 'M 静音 · ESC 暂停', { fontFamily: FONT, fontSize: '11px', color: CSS.textDim })
      .setOrigin(1, 1).setScrollFactor(0).setDepth(80);
    this.pauseBtn = this.add.text(0, 0, '‖', { fontFamily: FONT, fontSize: '20px', color: CSS.textDim })
      .setOrigin(0.5).setScrollFactor(0).setDepth(80).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerover', () => this.pauseBtn.setColor('#ffffff'));
    this.pauseBtn.on('pointerout', () => this.pauseBtn.setColor(CSS.textDim));
    this.pauseBtn.on('pointerdown', () => this.togglePause());

    this.scan = this.add.tileSprite(0, 0, cam.width, cam.height, 'scan')
      .setOrigin(0).setScrollFactor(0).setDepth(120).setAlpha(0.4);

    this.scale.on('resize', this.onResize);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize));
    this.layout();

    // ---- 开场剧情（按关卡）----
    this.stage.intro.forEach((line, i) => {
      this.time.delayedCall(400 + i * 2600, () => this.showMessage(line, 2.4));
    });
  }

  // ================= 主循环 =================

  update(_time: number, delta: number): void {
    if (this.paused || this.ended) return;
    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += dt;
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.setAlpha(p.invuln > 0 ? 0.55 : 1);
    this.ring.setPosition(p.x, p.y);
    this.ring.rotation += dt * 0.9;

    // 移动
    const v = new Phaser.Math.Vector2(0, 0);
    if (this.cursors.left.isDown || this.wasd.A.isDown) v.x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) v.x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) v.y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) v.y += 1;
    if (this.joystick.vec.lengthSq() > 0.01) v.copy(this.joystick.vec);
    if (v.lengthSq() > 0.0001) {
      v.normalize().scale(p.speed);
      p.setVelocity(v.x, v.y);
      p.setRotation(v.angle() + Math.PI / 2);
      this.achv.dist += p.speed * dt;
    } else {
      p.setVelocity(0, 0);
    }

    // 自动射击
    const target = this.nearestEnemy(p.x, p.y, 560);
    p.fireCooldown -= dt;
    if (target && p.fireCooldown <= 0) {
      p.fireCooldown = p.fireInterval / p.rateMul;
      const base = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
      const n = 1 + p.extraProj;
      for (let i = 0; i < n; i++) {
        this.fireBullet(p.x, p.y, base + (i - (n - 1) / 2) * 0.14);
      }
      sfx('fire');
    }

    // 武器系统
    this.updateBlades();
    this.updateChainArc(dt);
    this.updateShards(dt);
    this.updateShardMotion(dt);
    this.updateWells(dt);
    this.drawArcs(dt);

    if (p.novaLevel > 0) {
      this.novaTimer -= dt;
      if (this.novaTimer <= 0) {
        this.novaTimer = p.novaInterval;
        this.fireNova();
      }
    }

    this.updateEnemies();
    this.updateSpawner(dt);
    this.updateGems();

    // HUD
    this.xpFill.setScale(Phaser.Math.Clamp(this.xp / this.xpNext, 0, 1), 1);
    const hpPct = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.hpFill.setScale(hpPct, 1);
    this.hpFill.fillColor = hpPct < 0.3 ? PAL.neonRed : PAL.hpGreen;
    this.hpText.setText(`${Math.ceil(Math.max(0, p.hp))}/${p.maxHp}`);
    this.timeText.setText(this.fmt(this.stage.duration - this.elapsed));
    this.killText.setText(`击杀 ${this.kills}`);
    this.levelText.setText(`LV.${this.level}`);

    // 剧情节点
    while (this.beatIndex < this.beatTimes.length && this.elapsed >= this.beatTimes[this.beatIndex].t) {
      this.showMessage(this.beatTimes[this.beatIndex].text);
      this.beatIndex++;
    }

    // 成就周期检查（覆盖移动距离等无事件触发的条件）
    this.achvTimer -= dt;
    if (this.achvTimer <= 0) {
      this.achvTimer = 5;
      this.checkAchv(false);
    }

    if (this.elapsed >= this.stage.duration) this.endGame(true);
  }

  // ================= 战斗 =================

  private nearestEnemy(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist;
    for (const c of this.enemies.getChildren()) {
      const e = c as Enemy;
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private nearestEnemyExcept(x: number, y: number, maxDist: number, except: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist;
    for (const c of this.enemies.getChildren()) {
      const e = c as Enemy;
      if (!e.active || except.includes(e)) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private fireBullet(x: number, y: number, angle: number): void {
    const b = this.bullets.get(x, y, 'bullet') as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    this.bulletGen++;
    const gen = this.bulletGen;
    b.setTexture('bullet');
    b.enableBody(true, x, y, true, true);
    b.setTint(PAL.neonCyan).setDepth(12).setScale(1);
    b.setData('pierce', this.player.pierce);
    b.setData('dmg', BULLET_DMG * this.player.damageMul);
    b.setData('hits', new Set<Enemy>());
    b.setData('gen', gen);
    b.setVelocity(Math.cos(angle) * this.player.projSpeed, Math.sin(angle) * this.player.projSpeed);
    this.time.delayedCall(1100, () => {
      if (b.active && b.getData('gen') === gen) b.disableBody(true, true);
    });
  }

  private onBulletHit(b: Phaser.Physics.Arcade.Sprite, e: Enemy): void {
    if (!b.active || !e.active) return;
    const hits = b.getData('hits') as Set<Enemy>;
    if (hits.has(e)) return;
    hits.add(e);
    this.hurtEnemy(e, b.getData('dmg') as number);
    const pierce = (b.getData('pierce') as number) ?? 0;
    if (pierce <= 0) b.disableBody(true, true);
    else b.setData('pierce', pierce - 1);
  }

  private hurtEnemy(e: Enemy, dmg: number): void {
    if (!e.active) return;
    let d = dmg;
    let crit = false;
    if (this.player.critChance > 0 && Math.random() < this.player.critChance) {
      d *= 2.5;
      crit = true;
    }
    e.hp -= d;
    this.dmgNums.show(e.x, e.y - 12, Math.max(1, Math.round(d)), crit);
    e.hitFlash();
    sfx('hit');
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    this.kills++;
    if (e.kind === 'wall') this.achv.walls++;
    this.spawnGem(e.x, e.y, e.xp);
    if (Math.random() < 0.02) this.spawnMed(e.x, e.y);
    this.burst(e.x, e.y, ENEMY_CONF[e.kind].tint, 8);
    sfx('kill');
    e.disableBody(true, true);
    this.checkAchv(false);
  }

  private fireNova(): void {
    const p = this.player;
    const ring = this.add.image(p.x, p.y, 'ring')
      .setTint(PAL.neonMagenta).setDepth(16).setScale(0.15).setAlpha(0.9);
    this.tweens.add({
      targets: ring,
      scale: p.novaRadius / 120,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy(),
    });
    for (const c of this.enemies.getChildren()) {
      const en = c as Enemy;
      if (en.active && Phaser.Math.Distance.Between(en.x, en.y, p.x, p.y) < p.novaRadius) {
        this.hurtEnemy(en, p.novaDmg * p.damageMul);
      }
    }
    sfx('nova');
    this.cameras.main.shake(120, 0.004);
  }

  syncOrbitBlades(): void {
    const want = this.player.orbitBlades;
    while (this.blades.length > want) this.blades.pop()?.destroy();
    while (this.blades.length < want) {
      this.blades.push(
        this.add.image(this.player.x, this.player.y, 'blade').setTint(PAL.neonCyan).setDepth(18),
      );
    }
  }

  private updateBlades(): void {
    const n = this.blades.length;
    if (n === 0) return;
    const p = this.player;
    this.bladeAngle += (Math.min(this.game.loop.delta, 50) / 1000) * p.orbitSpeed;
    this.blades.forEach((b, i) => {
      const a = this.bladeAngle + (i / n) * Math.PI * 2;
      b.setPosition(p.x + Math.cos(a) * p.orbitRadius, p.y + Math.sin(a) * p.orbitRadius);
      b.setRotation(a + Math.PI / 2);
    });
    for (const c of this.enemies.getChildren()) {
      const en = c as Enemy;
      if (!en.active || this.elapsed < en.orbitTick) continue;
      const d = Phaser.Math.Distance.Between(en.x, en.y, p.x, p.y);
      if (Math.abs(d - p.orbitRadius) < 24) {
        en.orbitTick = this.elapsed + 0.4;
        this.hurtEnemy(en, p.orbitDmg * p.damageMul);
      }
    }
  }

  // ================= 武器：链式电弧 =================

  private updateChainArc(dt: number): void {
    const p = this.player;
    if (p.arcLevel <= 0) return;
    this.arcTimer -= dt;
    if (this.arcTimer > 0) return;
    this.arcTimer = Math.max(0.9, 2.3 - p.arcLevel * 0.28);
    const first = this.nearestEnemy(p.x, p.y, 440);
    if (!first) return;
    const maxN = 2 + p.arcLevel;
    const hit: Enemy[] = [first];
    let cur = first;
    while (hit.length < maxN) {
      const next = this.nearestEnemyExcept(cur.x, cur.y, 180, hit);
      if (!next) break;
      hit.push(next);
      cur = next;
    }
    this.arcs.push({
      pts: [new Phaser.Math.Vector2(p.x, p.y), ...hit.map((e) => new Phaser.Math.Vector2(e.x, e.y))],
      ttl: 0.22,
    });
    if (hit.length > this.achv.maxChain) this.achv.maxChain = hit.length;
    const dmg = 14 * p.arcLevel * p.damageMul;
    for (const e of hit) {
      this.hurtEnemy(e, dmg);
      this.burst(e.x, e.y, 0xffe14d, 4);
    }
    sfx('zap');
    this.checkAchv(false);
  }

  private drawArcs(dt: number): void {
    if (this.arcs.length === 0) {
      if (this.arcGfx.commandBuffer.length > 0) this.arcGfx.clear();
      return;
    }
    const g = this.arcGfx;
    g.clear();
    for (const a of this.arcs) {
      a.ttl -= dt;
      const alpha = Math.max(0, a.ttl / 0.22);
      g.lineStyle(6, 0x9fe8ff, alpha * 0.22);
      this.strokeJittered(g, a.pts, 5);
      g.lineStyle(2, 0xe8fbff, alpha);
      this.strokeJittered(g, a.pts, 5);
    }
    this.arcs = this.arcs.filter((a) => a.ttl > 0);
  }

  /** 折线绘制，每段中点加入抖动模拟电流 */
  private strokeJittered(g: Phaser.GameObjects.Graphics, pts: Phaser.Math.Vector2[], jitter: number): void {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      g.beginPath();
      g.moveTo(a.x, a.y);
      for (let s = 1; s <= 3; s++) {
        const t = s / 4;
        const jx = s < 3 ? Phaser.Math.Between(-jitter, jitter) : 0;
        const jy = s < 3 ? Phaser.Math.Between(-jitter, jitter) : 0;
        g.lineTo(a.x + (b.x - a.x) * t + jx, a.y + (b.y - a.y) * t + jy);
      }
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
  }

  // ================= 武器：蚀刻飞刃 =================

  private updateShards(dt: number): void {
    const p = this.player;
    if (p.shardLevel <= 0) return;
    this.shardTimer -= dt;
    if (this.shardTimer > 0) return;
    if (!this.nearestEnemy(p.x, p.y, 620)) return; // 无目标不发射
    this.shardTimer = Math.max(0.7, 1.7 - p.shardLevel * 0.2);
    const count = 1 + Math.floor(p.shardLevel / 2);
    for (let i = 0; i < count; i++) this.fireShard();
    sfx('shard');
  }

  private fireShard(): void {
    const p = this.player;
    const s = this.shards.get(p.x, p.y, 'shard') as Phaser.Physics.Arcade.Sprite | null;
    if (!s) return;
    this.bulletGen++;
    const gen = this.bulletGen;
    s.setTexture('shard');
    s.enableBody(true, p.x, p.y, true, true);
    s.setTint(PAL.neonMagenta).setDepth(13);
    const target = this.nearestEnemy(p.x, p.y, 620);
    const angle = target
      ? Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y)
      : Math.random() * Math.PI * 2;
    s.setData('gen', gen);
    s.setData('target', target);
    s.setData('dmg', (11 + 5 * p.shardLevel) * p.damageMul);
    s.setData('pierce', 0);
    s.setData('hits', new Set<Enemy>());
    s.setRotation(angle);
    s.setVelocity(Math.cos(angle) * 340, Math.sin(angle) * 340);
    this.time.delayedCall(2600, () => {
      if (s.active && s.getData('gen') === gen) s.disableBody(true, true);
    });
  }

  private updateShardMotion(dt: number): void {
    for (const c of this.shards.getChildren()) {
      const s = c as Phaser.Physics.Arcade.Sprite;
      if (!s.active || !s.body) continue;
      let target = s.getData('target') as Enemy | null;
      if (!target || !target.active) {
        target = this.nearestEnemy(s.x, s.y, 520);
        s.setData('target', target);
      }
      if (target) {
        const desired = Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y);
        const cur = Math.atan2(s.body.velocity.y, s.body.velocity.x);
        const next = Phaser.Math.Angle.RotateTo(cur, desired, 5.5 * dt);
        s.setVelocity(Math.cos(next) * 340, Math.sin(next) * 340);
        s.setRotation(next);
      }
    }
  }

  // ================= 武器：引力异常 =================

  private updateWells(dt: number): void {
    const p = this.player;
    // 引爆到期的井
    for (let i = this.wells.length - 1; i >= 0; i--) {
      const w = this.wells[i];
      if (this.elapsed < w.until) continue;
      const ring = this.add.image(w.x, w.y, 'ring')
        .setTint(PAL.neonPurple).setDepth(16).setScale(w.r / 120 * 0.8).setAlpha(0.9);
      this.tweens.add({
        targets: ring,
        scale: w.r / 120 * 1.25,
        alpha: 0,
        duration: 260,
        onComplete: () => ring.destroy(),
      });
      for (const c of this.enemies.getChildren()) {
        const en = c as Enemy;
        if (en.active && Phaser.Math.Distance.Between(en.x, en.y, w.x, w.y) < w.r + 30) {
          this.hurtEnemy(en, (30 + 22 * w.level) * p.damageMul);
        }
      }
      this.cameras.main.shake(110, 0.004);
      w.gfx.destroy();
      this.wells.splice(i, 1);
    }

    // 定时生成新井
    if (p.wellLevel <= 0) return;
    this.wellTimer -= dt;
    if (this.wellTimer > 0) return;
    this.wellTimer = Math.max(3.5, 7.5 - p.wellLevel * 0.7);
    // 聚怪点：取最近的若干敌人求质心
    const near: Enemy[] = [];
    for (const c of this.enemies.getChildren()) {
      const e = c as Enemy;
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) < 520) near.push(e);
    }
    if (near.length < 3) return;
    let sx = 0;
    let sy = 0;
    for (const e of near) {
      sx += e.x;
      sy += e.y;
    }
    const wx = sx / near.length;
    const wy = sy / near.length;
    const r = 150;
    const gfx = this.add.image(wx, wy, 'ring')
      .setTint(PAL.neonPurple).setDepth(14).setScale(r / 120).setAlpha(0.4);
    this.tweens.add({
      targets: gfx,
      scale: { from: r / 120 * 0.85, to: r / 120 * 1.1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.wells.push({ x: wx, y: wy, r, until: this.elapsed + 1.8, level: p.wellLevel, gfx });
    sfx('well');
  }

  // ================= 敌人与生成 =================

  private updateEnemies(): void {
    const p = this.player;
    for (const c of this.enemies.getChildren()) {
      const en = c as Enemy;
      if (!en.active) continue;
      const baseA = Phaser.Math.Angle.Between(en.x, en.y, p.x, p.y);
      const a = baseA + Math.sin(this.elapsed * 2.2 + en.wobble) * 0.3;
      let vx = Math.cos(a) * en.speed;
      let vy = Math.sin(a) * en.speed;
      for (const w of this.wells) {
        const d = Phaser.Math.Distance.Between(en.x, en.y, w.x, w.y);
        if (d < w.r && d > 4) {
          const k = 160 * (1 - d / w.r) + 60;
          vx += ((w.x - en.x) / d) * k;
          vy += ((w.y - en.y) / d) * k;
        }
      }
      en.setVelocity(vx, vy);
      en.setRotation(baseA + Math.PI / 2);
      if (Phaser.Math.Distance.Between(en.x, en.y, p.x, p.y) > 1500) {
        const pos = this.spawnPos();
        en.setPosition(pos.x, pos.y);
      }
    }
  }

  private updateSpawner(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const sp = this.stage.spawn;
      this.spawnTimer = Phaser.Math.Clamp(
        sp.intervalStart - (this.elapsed / sp.rampTime) * (sp.intervalStart - sp.intervalMin),
        sp.intervalMin,
        sp.intervalStart,
      );
      const count = 1 + Math.floor(this.elapsed / 150);
      for (let i = 0; i < count; i++) this.spawnEnemy();
    }
    this.burstTimer += dt;
    if (this.burstTimer >= this.stage.spawn.burstEvery) {
      this.burstTimer = 0;
      this.burstWave();
    }
  }

  private pickKind(): EnemyKind {
    const r = Math.random();
    if (this.elapsed > this.stage.wall.after && r > 1 - this.stage.wall.w) return 'wall';
    if (this.elapsed > this.stage.fast.after && r < this.stage.fast.w) return 'fast';
    return 'chaser';
  }

  private spawnPos(): { x: number; y: number } {
    const cam = this.cameras.main;
    const p = this.player;
    const R = Math.max(cam.width, cam.height) * 0.62 + 70;
    let last = { x: p.x, y: p.y };
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = Phaser.Math.Clamp(p.x + Math.cos(a) * R, 30, WORLD - 30);
      const y = Phaser.Math.Clamp(p.y + Math.sin(a) * R, 30, WORLD - 30);
      last = { x, y };
      const inView = Math.abs(x - cam.midPoint.x) < cam.width / 2 + 40
        && Math.abs(y - cam.midPoint.y) < cam.height / 2 + 40;
      if (!inView) return last;
    }
    return last;
  }

  private difficultyHp(): number {
    return 1 + this.elapsed * this.stage.hpPerSec;
  }

  private difficultySpeed(): number {
    return Math.min(this.stage.speedMax, 1 + (this.elapsed / 600) * 0.15);
  }

  private spawnEnemy(): void {
    const e = this.enemies.get(0, 0) as Enemy | null;
    if (!e) return;
    const pos = this.spawnPos();
    e.spawn(this.pickKind(), pos.x, pos.y, this.difficultyHp(), this.difficultySpeed());
  }

  private burstWave(): void {
    const p = this.player;
    const n = 18;
    const R = Math.max(this.cameras.main.width, this.cameras.main.height) * 0.62 + 70;
    for (let i = 0; i < n; i++) {
      const e = this.enemies.get(0, 0) as Enemy | null;
      if (!e) break;
      const a = (i / n) * Math.PI * 2;
      const kind: EnemyKind = this.elapsed > this.stage.fast.after + 60 && i % 3 === 0 ? 'fast' : 'chaser';
      e.spawn(kind,
        Phaser.Math.Clamp(p.x + Math.cos(a) * R, 30, WORLD - 30),
        Phaser.Math.Clamp(p.y + Math.sin(a) * R, 30, WORLD - 30),
        this.difficultyHp(), this.difficultySpeed());
    }
    this.showMessage('>> 警告：检测到 ICE 包围网。', 2.5);
  }

  // ================= 拾取 =================

  private spawnGem(x: number, y: number, val: number): void {
    const g = this.gems.get(x, y, 'gem') as Phaser.Physics.Arcade.Sprite | null;
    if (g) {
      g.enableBody(true, x, y, true, true);
      g.setTint(this.stage.accent).setDepth(5).setScale(1);
      g.setData('val', val);
      g.setVelocity(0, 0);
      return;
    }
    // 池满：合并到最近的晶片
    let best: Phaser.Physics.Arcade.Sprite | null = null;
    let bestD = Infinity;
    for (const c of this.gems.getChildren()) {
      const s = c as Phaser.Physics.Arcade.Sprite;
      if (!s.active) continue;
      const d = Phaser.Math.Distance.Between(s.x, s.y, x, y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) best.setData('val', (best.getData('val') as number) + val);
  }

  private spawnMed(x: number, y: number): void {
    const m = this.meds.get(x, y, 'med') as Phaser.Physics.Arcade.Sprite | null;
    if (!m) return;
    m.enableBody(true, x, y, true, true);
    m.setTint(PAL.hpGreen).setDepth(5);
    m.setVelocity(0, 0);
  }

  private updateGems(): void {
    const p = this.player;
    for (const c of this.gems.getChildren()) {
      const g = c as Phaser.Physics.Arcade.Sprite;
      if (!g.active) continue;
      const d = Phaser.Math.Distance.Between(g.x, g.y, p.x, p.y);
      if (d < p.pickupRange) {
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        g.setVelocity(Math.cos(a) * 340, Math.sin(a) * 340);
      } else if (g.body) {
        g.setVelocity(g.body.velocity.x * 0.9, g.body.velocity.y * 0.9);
      }
    }
  }

  private collectGem(g: Phaser.Physics.Arcade.Sprite): void {
    if (!g.active) return;
    this.xp += (g.getData('val') as number) ?? 1;
    g.disableBody(true, true);
    sfx('pickup');
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.floor(7 + (this.level - 1) * 3.5);
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.paused && !this.ended) {
      this.time.delayedCall(0, () => this.openLevelUp());
    }
  }

  private collectMed(m: Phaser.Physics.Arcade.Sprite): void {
    if (!m.active) return;
    m.disableBody(true, true);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
    this.burst(this.player.x, this.player.y, PAL.hpGreen, 6);
    sfx('pickup');
  }

  private damagePlayer(dmg: number): void {
    const p = this.player;
    if (this.ended || p.invuln > 0) return;
    p.hp -= dmg;
    p.invuln = 0.55;
    this.achv.hitTaken = true;
    sfx('hurt');
    this.cameras.main.shake(90, 0.006);
    if (p.hp <= 0) this.endGame(false);
  }

  // ================= 升级面板 =================

  private rollUpgrades(): UpgradeDef[] {
    const avail = UPGRADES.filter((u) => (this.taken[u.id] ?? 0) < u.max);
    const picks: UpgradeDef[] = [];
    while (picks.length < 3 && avail.length > 0) {
      const total = avail.reduce((s, u) => s + u.weight, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < avail.length; i++) {
        r -= avail[i].weight;
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      picks.push(avail.splice(idx, 1)[0]);
    }
    return picks;
  }

  private pauseRun(): void {
    this.paused = true;
    this.physics.world.pause();
    this.time.paused = true;
  }

  private resumeRun(): void {
    this.paused = false;
    this.physics.world.resume();
    this.time.paused = false;
  }

  private openLevelUp(): void {
    this.pauseRun();
    this.joystick?.hide();
    sfx('levelup');
    const picks = this.rollUpgrades();
    if (picks.length === 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      this.resumeRun();
      return;
    }
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    // 遮罩只做视觉，不可交互
    this.panelObjects.push(
      this.add.rectangle(cx, cy, cam.width + 2, cam.height + 2, 0x02030a, 0.78).setScrollFactor(0).setDepth(90),
    );
    this.panelObjects.push(
      this.add.text(cx, cy - 170, '// 沉睡者：选择一项强化', { fontFamily: FONT, fontSize: '20px', color: CSS.cyan })
        .setOrigin(0.5).setScrollFactor(0).setDepth(95)
        .setShadow(0, 0, '#00ffd5', 12, true, true),
    );
    const cardW = Math.min(340, cam.width - 48);
    picks.forEach((u, i) => {
      const lv = this.taken[u.id] ?? 0;
      const y = cy - 80 + i * 104;
      const bg = this.add.rectangle(cx, y, cardW, 90, PAL.panel, 0.96)
        .setStrokeStyle(1, this.stage.accent, 0.45)
        .setScrollFactor(0).setDepth(95)
        .setInteractive({ useHandCursor: true });
      const name = this.add.text(cx - cardW / 2 + 16, y - 30, u.name, { fontFamily: FONT, fontSize: '17px', color: CSS.cyan }).setScrollFactor(0).setDepth(95);
      const lvText = this.add.text(cx + cardW / 2 - 14, y - 30, `LV ${lv} → ${lv + 1}/${u.max}`, { fontFamily: FONT, fontSize: '11px', color: CSS.textDim }).setOrigin(1, 0).setScrollFactor(0).setDepth(95);
      const desc = this.add.text(cx - cardW / 2 + 16, y + 2, u.desc, { fontFamily: FONT, fontSize: '13px', color: CSS.text, wordWrap: { width: cardW - 32 } }).setScrollFactor(0).setDepth(95);
      this.panelObjects.push(bg, name, lvText, desc);
      bg.on('pointerover', () => bg.setStrokeStyle(2, this.stage.accent, 1));
      bg.on('pointerout', () => bg.setStrokeStyle(1, this.stage.accent, 0.45));
      bg.on('pointerdown', () => this.pickUpgrade(u));
    });
  }

  private pickUpgrade(u: UpgradeDef): void {
    this.taken[u.id] = (this.taken[u.id] ?? 0) + 1;
    u.apply(this, this.player);
    sfx('ui');
    this.clearPanel();
    this.resumeRun();
    this.pendingLevels--;
    if (this.pendingLevels > 0) this.openLevelUp();
    this.checkAchv(false);
  }

  private clearPanel(): void {
    this.panelObjects.forEach((o) => o.destroy());
    this.panelObjects = [];
  }

  // ================= 暂停 =================

  private togglePause(): void {
    if (this.ended) return;
    if (this.pauseOpen) {
      this.pauseOpen = false;
      this.clearPanel();
      this.resumeRun();
    } else if (!this.paused) {
      this.openPause();
    }
  }

  private openPause(): void {
    this.pauseOpen = true;
    this.pauseRun();
    this.joystick?.hide();
    sfx('ui');
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.panelObjects.push(
      this.add.rectangle(cx, cy, cam.width + 2, cam.height + 2, 0x02030a, 0.78).setScrollFactor(0).setDepth(90),
    );
    this.panelObjects.push(
      this.add.text(cx, cy - 150, '>> 链路挂起 // 已暂停', { fontFamily: FONT, fontSize: '22px', color: this.stage.accent === PAL.neonCyan ? CSS.cyan : '#ffffff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(95),
    );
    const resumeBtn = this.add.text(cx, cy - 60, '[ 继续 ]', { fontFamily: FONT, fontSize: '20px', color: CSS.cyan })
      .setOrigin(0.5).setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    const soundBtn = this.add.text(cx, cy - 5, `[ 音效：${isMuted() ? '关' : '开'} ]`, { fontFamily: FONT, fontSize: '16px', color: CSS.text })
      .setOrigin(0.5).setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    const restartBtn = this.add.text(cx, cy + 50, '[ 重新接入 ]', { fontFamily: FONT, fontSize: '16px', color: CSS.text })
      .setOrigin(0.5).setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    const titleBtn = this.add.text(cx, cy + 105, '[ 返回标题 ]', { fontFamily: FONT, fontSize: '16px', color: CSS.text })
      .setOrigin(0.5).setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    const hover = (t: Phaser.GameObjects.Text, on: boolean) => t.setColor(on ? '#ffffff' : CSS.text);
    for (const btn of [soundBtn, restartBtn, titleBtn]) {
      btn.on('pointerover', () => hover(btn, true));
      btn.on('pointerout', () => hover(btn, false));
    }
    resumeBtn.on('pointerover', () => resumeBtn.setColor('#ffffff'));
    resumeBtn.on('pointerout', () => resumeBtn.setColor(CSS.cyan));
    resumeBtn.on('pointerdown', () => this.togglePause());
    soundBtn.on('pointerdown', () => {
      const m = toggleMute();
      soundBtn.setText(`[ 音效：${m ? '关' : '开'} ]`);
    });
    restartBtn.on('pointerdown', () => this.scene.restart());
    titleBtn.on('pointerdown', () => this.scene.start('Title'));
    this.panelObjects.push(resumeBtn, soundBtn, restartBtn, titleBtn);
  }

  // ================= 结算 =================

  private endGame(win: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.clearPanel(); // 防御：若升级面板还开着，先清掉避免叠层
    this.pauseRun();
    this.joystick?.hide();
    sfx(win ? 'win' : 'lose');
    this.cameras.main.flash(400, win ? 0 : 255, win ? 255 : 60, win ? 200 : 80);
    if (!win) this.burst(this.player.x, this.player.y, PAL.neonCyan, 24);

    // 纪录与生涯
    const recs = loadRecords();
    const rec = recs[this.stage.id] ?? { wins: 0, bestKills: 0, bestAlive: 0 };
    this.newRecord = this.kills > rec.bestKills;
    rec.wins += win ? 1 : 0;
    rec.bestKills = Math.max(rec.bestKills, this.kills);
    rec.bestAlive = Math.max(rec.bestAlive, Math.floor(this.elapsed));
    recs[this.stage.id] = rec;
    saveRecords(recs);
    this.winCountTotal += win ? 1 : 0;
    this.playCountTotal++;
    savePlayCount(this.playCountTotal);

    this.checkAchv(win);

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.panelObjects.push(
      this.add.rectangle(cx, cy, cam.width + 2, cam.height + 2, 0x02030a, 0.8).setScrollFactor(0).setDepth(90),
    );

    const title = win ? `>> 上传完成 · ${this.stage.name}` : `>> 连接已断开 · ${this.stage.name}`;
    this.panelObjects.push(
      this.add.text(cx, cy - 190, title, { fontFamily: FONT, fontSize: '26px', color: win ? CSS.cyan : CSS.red })
        .setOrigin(0.5).setScrollFactor(0).setDepth(95)
        .setShadow(0, 0, win ? '#00ffd5' : '#ff3860', 16, true, true),
    );
    const body = win
      ? `${this.stage.winLine}\n${WIN_LINES[2]}`
      : (Phaser.Utils.Array.GetRandom(DEATH_LINES) as string);
    this.panelObjects.push(
      this.add.text(cx, cy - 112, body, {
        fontFamily: FONT, fontSize: '15px', color: CSS.text, align: 'center',
        wordWrap: { width: Math.min(520, cam.width - 60) }, lineSpacing: 8,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(95),
    );
    this.panelObjects.push(
      this.add.text(cx, cy - 22, `存活 ${this.fmt(this.elapsed)}    击杀 ${this.kills}    等级 LV.${this.level}${this.newRecord ? '    ★ 击杀新纪录' : ''}`,
        { fontFamily: FONT, fontSize: '16px', color: this.newRecord ? '#ffe14d' : CSS.magenta }).setOrigin(0.5).setScrollFactor(0).setDepth(95),
    );
    this.addTextButton(cx, cy + 66, '[ 再次接入 ]', () => this.scene.restart());
    this.addTextButton(cx, cy + 126, '[ 返回标题 ]', () => this.scene.start('Title'));
  }

  private addTextButton(x: number, y: number, label: string, onClick: () => void): void {
    const t = this.add.text(x, y, label, { fontFamily: FONT, fontSize: '20px', color: CSS.cyan })
      .setOrigin(0.5).setScrollFactor(0).setDepth(95).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor('#ffffff'));
    t.on('pointerout', () => t.setColor(CSS.cyan));
    t.on('pointerdown', onClick);
    this.panelObjects.push(t);
  }

  // ================= 成就 =================

  private checkAchv(win: boolean): void {
    const p = this.player;
    const c: AchvCtx = {
      kills: this.kills,
      walls: this.achv.walls,
      level: this.level,
      dist: this.achv.dist,
      maxChain: this.achv.maxChain,
      playCount: this.playCountTotal,
      winCount: this.winCountTotal,
      orbitLv: p.orbitBlades,
      novaLv: p.novaLevel,
      arcLv: p.arcLevel,
      shardLv: p.shardLevel,
      wellLv: p.wellLevel,
      win,
      hpPctAtWin: p.hp / p.maxHp,
      hitTaken: this.achv.hitTaken,
    };
    for (const a of ACHIEVEMENTS) {
      if (this.unlockedAchv.has(a.id)) continue;
      if (!a.test(c)) continue;
      this.unlockedAchv.add(a.id);
      saveAchievements([...this.unlockedAchv]);
      this.toast.push(a);
    }
  }

  // ================= HUD 与消息 =================

  private layout(): void {
    const cam = this.cameras.main;
    if (!cam || !this.hud || !this.scan || !this.hud.scene) return;
    const s = Phaser.Math.Clamp(cam.width / 520, 0.72, 1);
    this.hud.setScale(s);
    this.timeText.setPosition(cam.width / 2, 26);
    this.message.setPosition(cam.width / 2, 62);
    this.message.setWordWrapWidth(cam.width - 60);
    this.muteHint.setPosition(cam.width - 34, cam.height - 8);
    this.pauseBtn.setPosition(cam.width - 16, 24);
    this.scan.setSize(cam.width, cam.height);
  }

  private showMessage(text: string, dur = 3.6): void {
    this.message.setText(text);
    this.messageTween?.stop();
    this.messageTween?.remove();
    this.message.setAlpha(0);
    this.messageTween = this.tweens.add({
      targets: this.message,
      alpha: { from: 0, to: 1 },
      duration: 250,
      yoyo: true,
      hold: dur * 1000,
      onComplete: () => this.message.setAlpha(0),
    });
  }

  private burst(x: number, y: number, tint: number, n: number): void {
    const em = this.add.particles(x, y, 'glow', {
      speed: { min: 40, max: 170 },
      lifespan: 420,
      scale: { start: 0.32, end: 0 },
      alpha: { start: 0.85, end: 0 },
      blendMode: 'ADD',
      tint,
      emitting: false,
    }).setDepth(16);
    em.explode(n);
    this.time.delayedCall(600, () => em.destroy());
  }

  private fmt(t: number): string {
    const s = Math.max(0, Math.floor(t));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
}
