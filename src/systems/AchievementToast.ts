import Phaser from 'phaser';
import type { AchvDef } from '../data/achievements';
import { sfx } from '../audio';
import { PAL, CSS, FONT } from '../themes';

/** Steam 风格成就弹窗：右上角滑入停留滑出，队列播放 */
export class AchievementToast {
  private queue: AchvDef[] = [];
  private showing = false;
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene) {}

  push(def: AchvDef): void {
    if (this.showing || this.objs.length > 0 || this.queue.length >= 2) {
      if (this.queue.length < 3) this.queue.push(def);
      return;
    }
    this.play(def);
  }

  private tryNext(): void {
    const next = this.queue.shift();
    if (next) this.play(next);
  }

  private play(def: AchvDef): void {
    this.showing = true;
    const cam = this.scene.cameras.main;
    const w = Math.min(264, cam.width - 24);
    const h = 64;
    const y = 54;
    const anchor = cam.width - 12; // 右对齐锚点
    const xOff = cam.width + w + 20; // 屏幕外初始位

    const bg = this.scene.add.rectangle(anchor, y + h / 2, w, h, PAL.panel, 0.95)
      .setOrigin(1, 0.5).setStrokeStyle(1, PAL.neonYellow, 0.7)
      .setScrollFactor(0).setDepth(110);
    const label = this.scene.add.text(anchor - 12, y + 9, '// 成就解锁', {
      fontFamily: FONT, fontSize: '10px', color: '#ffe14d',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(111);
    const name = this.scene.add.text(anchor - 12, y + 21, `「${def.name}」`, {
      fontFamily: FONT, fontSize: '15px', color: '#ffffff',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(111);
    const desc = this.scene.add.text(anchor - 12, y + 41, def.desc, {
      fontFamily: FONT, fontSize: '10px', color: CSS.textDim,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(111);

    this.objs = [bg, label, name, desc];
    sfx('achv');
    const finalXs = [anchor, anchor - 12, anchor - 12, anchor - 12];
    finalXs.forEach((fx, i) => {
      this.scene.tweens.add({ targets: this.objs[i], x: fx, duration: 280, ease: 'Cubic.Out' });
    });
    // 用 tween 计时（time.paused 时 Clock 的 delayedCall 会冻结，tween 仍随渲染循环走）
    const timer = { t: 0 };
    this.scene.tweens.add({
      targets: timer,
      t: 1,
      duration: 3400,
      onComplete: () => {
        for (const o of this.objs) {
          this.scene.tweens.add({ targets: o, x: xOff, duration: 260, ease: 'Cubic.In' });
        }
        const out = { t: 0 };
        this.scene.tweens.add({
          targets: out,
          t: 1,
          duration: 300,
          onComplete: () => {
            this.objs.forEach((o) => o.destroy());
            this.objs = [];
            this.showing = false;
            this.tryNext();
          },
        });
      },
    });
  }
}
