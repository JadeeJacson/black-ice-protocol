import Phaser from 'phaser';
import { CSS, FONT } from '../themes';

/** 漂浮伤害数字：世界坐标，对象池复用 */
export class DamageNumbers {
  private pool: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, size = 18) {
    for (let i = 0; i < size; i++) {
      const t = scene.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '11px', color: CSS.text,
      }).setOrigin(0.5).setDepth(30).setAlpha(0).setActive(false);
      this.pool.push(t);
    }
  }

  show(x: number, y: number, value: number, crit: boolean): void {
    const t = this.pool.find((p) => !p.active);
    if (!t) return; // 池满则跳过
    t.setActive(true)
      .setPosition(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-6, 2))
      .setText(crit ? `${value}!` : `${value}`)
      .setColor(crit ? '#ffe14d' : CSS.text)
      .setFontSize(crit ? 15 : 11)
      .setAlpha(1)
      .setDepth(crit ? 31 : 30);
    this.scene.tweens.add({
      targets: t,
      y: t.y - 26,
      alpha: 0,
      duration: crit ? 550 : 420,
      ease: 'Cubic.Out',
      onComplete: () => t.setActive(false),
    });
  }

  private get scene(): Phaser.Scene {
    return this.pool[0].scene;
  }
}
