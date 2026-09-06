/**
 * 存储抽象：浏览器 localStorage / 微信小游戏 wx storage 统一接口。
 * 全部读写带 try/catch（隐私模式、storage 被禁等场景静默失败）。
 */

import { wx } from './env';

interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function lsStore(): KVStore {
  return {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* 忽略 */
      }
    },
    removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* 忽略 */
      }
    },
  };
}

function wxStore(): KVStore {
  const w = wx()!;
  return {
    getItem(key) {
      try {
        const v = w.getStorageSync!(key);
        return v === undefined || v === '' ? null : String(v);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        w.setStorageSync!(key, value);
      } catch {
        /* 忽略 */
      }
    },
    removeItem(key) {
      try {
        w.removeStorageSync!(key);
      } catch {
        /* 忽略 */
      }
    },
  };
}

function pick(): KVStore {
  const w = wx();
  if (w && w.getStorageSync && w.setStorageSync && w.removeStorageSync) {
    return wxStore();
  }
  return lsStore();
}

export const storage: KVStore = pick();
