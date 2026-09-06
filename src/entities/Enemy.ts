import Phaser from 'phaser';

export type EnemyKind = 'chaser' | 'fast' | 'wall';

interface EnemyConf {
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
  tex: string;
  tint: number;
  radius: number;
}

export const ENEMY_CONF: Record<EnemyKind, EnemyConf> = {
  chaser: { hp: 18, speed: 95,  dmg: 10, xp: 1, tex: 'e_chaser', tint: 0xff3860, radius: 8 },
  fast:   { hp: 10, speed: 170, dmg: 8,  xp: 1, tex: 'e_fast',   tint: 0xffe14d, radius: 7 },
  wall:   { hp: 95, speed: 55,  dmg: 18, xp: 5, tex: 'e_wall',   tint: 0x8b5cff, radius: 15 },
};

/** ICE 构装体：由对象池复用，spawn 时重置状态 */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  kind: EnemyKind = 'chaser';
  hp = 1;
  maxHp = 1;
  speed = 0;
  dmg = 0;
  xp = 1;
  wobble = 0;
  /** 轨道刃伤害的个体冷却 */
  orbitTick = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'e_chaser');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(15);
  }

  spawn(kind: EnemyKind, x: number, y: number, hpScale: number, speedScale: number): void {
    const c = ENEMY_CONF[kind];
    this.kind = kind;
    this.enableBody(true, x, y, true, true);
    this.setTexture(c.tex);
    this.hp = this.maxHp = Math.max(1, Math.round(c.hp * hpScale));
    this.speed = c.speed * speedScale;
    this.dmg = c.dmg;
    this.xp = c.xp;
    this.wobble = Math.random() * Math.PI * 2;
    this.orbitTick = 0;
    this.setTint(c.tint);
    this.setAlpha(1);
    this.setScale(Phaser.Math.FloatBetween(0.92, 1.15));
    const r = c.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
  }

  hitFlash(): void {
    const tint = ENEMY_CONF[this.kind].tint;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.active) this.setTint(tint);
    });
  }
}
