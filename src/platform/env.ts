/** 运行环境检测：浏览器 / 微信小游戏 / 设备能力分级 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyWx = {
  getStorageSync?: (k: string) => string | undefined;
  setStorageSync?: (k: string, v: unknown) => void;
  removeStorageSync?: (k: string) => void;
  createWebAudioContext?: () => AudioContext;
  getSystemInfoSync?: () => unknown;
};

export function wx(): AnyWx | null {
  const w = (globalThis as Record<string, unknown>).wx as AnyWx | undefined;
  return w && w.getSystemInfoSync ? w : null;
}

export function isWechat(): boolean {
  return wx() !== null;
}

/** 触屏为主设备（手机/平板） */
export function isTouchPrimary(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  return 'ontouchstart' in window || coarse;
}

/** 短边小于 500 视为手机尺寸 */
export function isSmallScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return Math.min(window.innerWidth, window.innerHeight) < 500;
}

/** 低性能档：微信环境或触屏设备 —— 降低粒子与敌人上限 */
export function isLowPower(): boolean {
  return isWechat() || isTouchPrimary();
}

export interface SafeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const zeroInsets: SafeInsets = { top: 0, bottom: 0, left: 0, right: 0 };

/** 读取刘海屏/状态栏安全区（依赖 index.html 中的 #safe-area-probe 探针） */
export function safeInsets(): SafeInsets {
  if (typeof document === 'undefined') return zeroInsets;
  const el = document.getElementById('safe-area-probe');
  if (!el) return zeroInsets;
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(0, r.top),
    bottom: Math.max(0, (window.innerHeight || 0) - r.bottom),
    left: Math.max(0, r.left),
    right: Math.max(0, (window.innerWidth || 0) - r.right),
  };
}
