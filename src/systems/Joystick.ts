import Phaser from 'phaser';

/**
 * 触屏虚拟摇杆：按下位置为原点，拖动方向即移动向量。
 * 仅响应触摸指针，桌面端使用键盘。
 */
export class Joystick {
  readonly vec = new Phaser.Math.Vector2(0, 0);

  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private maxDist = 48;
  private pid = -1;
  private originX = 0;
  private originY = 0;

  constructor(scene: Phaser.Scene) {
    this.base = scene.add.circle(0, 0, 56, 0xffffff, 0.05)
      .setStrokeStyle(2, 0x00ffd5, 0.3)
      .setScrollFactor(0).setDepth(140).setVisible(false);
    this.knob = scene.add.circle(0, 0, 24, 0x00ffd5, 0.28)
      .setScrollFactor(0).setDepth(141).setVisible(false);

    scene.input.addPointer(2);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!p.wasTouch || this.pid !== -1) return;
    this.pid = p.id;
    this.originX = p.x;
    this.originY = p.y;
    this.vec.set(0, 0);
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.knob.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pid) return;
    const dx = p.x - this.originX;
    const dy = p.y - this.originY;
    const d = Math.hypot(dx, dy);
    const k = d > this.maxDist ? this.maxDist / d : 1;
    this.knob.setPosition(this.originX + dx * k, this.originY + dy * k);
    if (d > 6) this.vec.set((dx * k) / this.maxDist, (dy * k) / this.maxDist);
    else this.vec.set(0, 0);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pid) return;
    this.pid = -1;
    this.vec.set(0, 0);
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  hide(): void {
    this.pid = -1;
    this.vec.set(0, 0);
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }
}
