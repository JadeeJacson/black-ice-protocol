import Phaser from 'phaser';

/**
 * 程序化贴图：所有美术资源在启动时用 Canvas 绘制生成，
 * 不依赖外部图片文件（霓虹几何风）。
 */
export function makeTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('glow')) return;

  const mk = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): void => {
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) return;
    const c = tex.getContext();
    draw(c);
    tex.refresh();
  };

  // 通用辉光（粒子 / 子弹芯）
  mk('glow', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });

  // 脉冲弹
  mk('bullet', 20, 20, (c) => {
    const g = c.createRadialGradient(10, 10, 0, 10, 10, 10);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 20, 20);
  });

  // 经验晶片（菱形）
  mk('gem', 12, 12, (c) => {
    c.beginPath();
    c.moveTo(6, 0); c.lineTo(12, 6); c.lineTo(6, 12); c.lineTo(0, 6);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.fill();
  });

  // 医疗包（十字）
  mk('med', 14, 14, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.fillRect(5, 1, 4, 12);
    c.fillRect(1, 5, 12, 4);
  });

  // 玩家（骇客进程尖梭，朝上）：外框 + 内脊线 + 翼缺口
  mk('player', 30, 30, (c) => {
    c.beginPath();
    c.moveTo(15, 1); c.lineTo(27, 26); c.lineTo(15, 19); c.lineTo(3, 26);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
    c.beginPath(); // 内脊线
    c.moveTo(15, 5); c.lineTo(15, 16);
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.stroke();
    c.beginPath(); // 翼线
    c.moveTo(7, 22); c.lineTo(12, 18);
    c.moveTo(23, 22); c.lineTo(18, 18);
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.stroke();
  });

  // 玩家外围虚环（进程光环，代码中旋转）
  mk('ringSeg', 56, 56, (c) => {
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.beginPath(); // 两段对置圆弧
    c.arc(28, 28, 22, -0.5, 0.5 + Math.PI * 0.6);
    c.stroke();
    c.beginPath();
    c.arc(28, 28, 22, Math.PI - 0.5, Math.PI + 0.5 + Math.PI * 0.6);
    c.stroke();
    c.lineWidth = 2;
    // 四个刻度
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
      c.beginPath();
      c.moveTo(28 + Math.cos(a) * 24, 28 + Math.sin(a) * 24);
      c.lineTo(28 + Math.cos(a) * 28, 28 + Math.sin(a) * 28);
      c.stroke();
    }
  });

  // 蚀刻飞刃（细长菱形，横向）
  mk('shard', 18, 6, (c) => {
    c.beginPath();
    c.moveTo(9, 0); c.lineTo(18, 3); c.lineTo(9, 6); c.lineTo(0, 3);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
  });

  // 追猎进程（三角）
  mk('e_chaser', 18, 18, (c) => {
    c.beginPath();
    c.moveTo(9, 1); c.lineTo(17, 16); c.lineTo(1, 16);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
  });

  // 拦截蜂群（细菱形）
  mk('e_fast', 16, 16, (c) => {
    c.beginPath();
    c.moveTo(8, 0); c.lineTo(16, 8); c.lineTo(8, 16); c.lineTo(0, 8);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
  });

  // 黑冰墙（六边形）
  mk('e_wall', 34, 34, (c) => {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = 17 + Math.cos(a) * 15;
      const y = 17 + Math.sin(a) * 15;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
  });

  // 轨道刃（横向菱形长条）
  mk('blade', 30, 10, (c) => {
    c.beginPath();
    c.moveTo(15, 0); c.lineTo(30, 5); c.lineTo(15, 10); c.lineTo(0, 5);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
  });

  // 冲击波圆环
  mk('ring', 256, 256, (c) => {
    c.beginPath();
    c.arc(128, 128, 120, 0, Math.PI * 2);
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(255,255,255,1)';
    c.stroke();
    c.beginPath();
    c.arc(128, 128, 120, 0, Math.PI * 2);
    c.lineWidth = 14;
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.stroke();
  });

  // 地面网格
  mk('grid', 128, 128, (c) => {
    c.fillStyle = '#070a14';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(80,120,220,0.14)';
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, 127, 127);
    c.fillStyle = 'rgba(0,255,213,0.12)';
    c.fillRect(0, 0, 2, 2);
  });

  // 看守者（双环六边形，64px）
  mk('e_boss', 64, 64, (c) => {
    for (const [r, w, a] of [[29, 3, 1], [22, 2, 0.5]] as const) {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i - Math.PI / 6;
        const x = 32 + Math.cos(ang) * r;
        const y = 32 + Math.sin(ang) * r;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
      c.fillStyle = `rgba(255,255,255,${0.12 * a})`;
      c.fill();
      c.lineWidth = w;
      c.strokeStyle = `rgba(255,255,255,${a})`;
      c.stroke();
    }
    c.beginPath();
    c.arc(32, 32, 6, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fill();
  });

  // 低血量警告晕影（红边）
  mk('vignette', 512, 512, (c) => {
    const g = c.createRadialGradient(256, 256, 140, 256, 256, 300);
    g.addColorStop(0, 'rgba(255,40,80,0)');
    g.addColorStop(0.75, 'rgba(255,40,80,0.12)');
    g.addColorStop(1, 'rgba(255,40,80,0.55)');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
  });

  // CRT 扫描线
  mk('scan', 4, 4, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.02)';
    c.fillRect(0, 0, 4, 1);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(0, 3, 4, 1);
  });
}
