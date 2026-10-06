import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Collapse past this scroll offset, but expand again only near the top so the
// header can't flicker at the boundary
const COLLAPSE_AT = 48;
const EXPAND_AT = 8;

export function useCollapsingHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setCollapsed((was) => (was ? y > EXPAND_AT : y > COLLAPSE_AT));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The header is fixed, so the page reserves its expanded height. Measuring only
  // while expanded keeps the content from shifting as the header shrinks
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el || collapsed) return;
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    observer.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, [collapsed]);

  // Keep focused and scrolled-to elements out from under the header
  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollPaddingTop = `${headerHeight}px`;
    return () => {
      root.style.scrollPaddingTop = "";
    };
  }, [headerHeight]);

  return { headerRef, collapsed, headerHeight };
}
