import '@testing-library/jest-dom';

/* ------------------------------------------------------------------ *
 * matchMedia — używane przez motywy i przyszłe useMediaQuery
 * ------------------------------------------------------------------ */
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/* ------------------------------------------------------------------ *
 * Polyfille pod prymitywy Radix UI.
 *
 * jsdom nie implementuje Pointer Capture API ani ResizeObservera, a Radix
 * używa obu w Dialogu, Sliderze i Select. Bez tego testy tych komponentów
 * wywalają się na `element.hasPointerCapture is not a function`.
 * ------------------------------------------------------------------ */
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!window.DOMRect) {
    window.DOMRect = class DOMRect {
      constructor(
        public x = 0,
        public y = 0,
        public width = 0,
        public height = 0
      ) {}
      get top() { return this.y; }
      get left() { return this.x; }
      get right() { return this.x + this.width; }
      get bottom() { return this.y + this.height; }
      static fromRect(r?: DOMRectInit) {
        return new DOMRect(r?.x, r?.y, r?.width, r?.height);
      }
      toJSON() { return { ...this }; }
    };
  }

  const proto = window.Element.prototype;

  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
  }
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = () => {};
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = () => {};
  }
  if (!proto.scrollIntoView) {
    proto.scrollIntoView = () => {};
  }
}
