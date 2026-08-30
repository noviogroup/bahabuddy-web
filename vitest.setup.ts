import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('server-only', () => ({}));

vi.mock('next/image', () => ({
  default: React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }>(function MockNextImage({ fill, priority: _priority, unoptimized, ...props }, ref) {
    const source = typeof props.src === 'string' ? props.src : '';
    const renderedSource = !unoptimized && source.startsWith('/')
      ? `/_next/image?url=${encodeURIComponent(source)}&w=3840&q=75`
      : source;

    return React.createElement('img', {
      ...props,
      ref,
      'data-nimg': fill ? 'fill' : '1',
      src: renderedSource,
    });
  }),
}));

beforeEach(() => {
  const store = new Map<string, string>();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
    },
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

// Auto-unmount React trees after each test to prevent state bleed.
afterEach(() => {
  cleanup();
});
