import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  // 基础属性（升级系统直接修改这些字段）
  maxHp = 100;
  hp = 100;
  speed = 210;
  damageMul = 1;
  rateMul = 1;
  fireInterval = 0.5;
  projSpeed = 520;
  extraProj = 0;
  pierce = 0;
  pickupRange = 90;

  // 轨道刃
  orbitBlades = 0;
  orbitDmg = 16;
  orbitRadius = 78;
  orbitSpeed = 2.8;

  // 脉冲新星
  novaLevel = 0;
  novaInterval = 5.5;
  novaDmg = 35;
  novaRadius = 140;

  invuln = 0;
  fireCooldown = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(20);
    this.body.setCircle(9, 4, 4);
    this.setCollideWorldBounds(true);
  }
}
