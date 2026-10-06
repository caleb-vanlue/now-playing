"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import { SiPlex, SiJellyfin } from "react-icons/si";
import { HiDotsHorizontal } from "react-icons/hi";
import { useHoverLoopDetector } from "../hooks/useHoverLoopDetector";

const BURST_INTERVAL_MS = 200;
const CONFETTI_COLORS = ["#e5a00d", "#00a4dc", "#aa5cc3", "#ffffff"];

export default function ServiceLinksMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { stuck, onToggle } = useHoverLoopDetector();

  const handleEnter = useCallback(
    (e: MouseEvent) => {
      setOpen(true);
      onToggle(e);
    },
    [onToggle]
  );

  const handleLeave = useCallback(
    (e: MouseEvent) => {
      setOpen(false);
      onToggle(e);
    },
    [onToggle]
  );

  // Easter egg: confetti while the menu is stuck in its hover loop
  useEffect(() => {
    if (!stuck) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const burst = () => {
        const rect = menuRef.current?.getBoundingClientRect();
        if (!rect) return;
        confetti({
          particleCount: 15,
          spread: 60,
          startVelocity: 35,
          angle: 125,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
          },
          colors: CONFETTI_COLORS,
          disableForReducedMotion: true,
        });
      };
      burst();
      interval = setInterval(burst, BURST_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stuck]);

  return (
    <div
      ref={menuRef}
      className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))] z-50 flex items-center transition-all duration-300 rounded-full backdrop-blur-md [mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_90%)] ${open ? "gap-3 px-8 py-4 bg-[var(--background)]/85 opacity-100" : "px-5 py-3 bg-[var(--background)]/65 opacity-50 hover:opacity-100"}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Ellipsis — collapsed trigger */}
      <div className={`transition-all duration-200 flex items-center justify-center overflow-hidden ${open ? "w-0 opacity-0 pointer-events-none" : "w-5 h-5 opacity-100"}`}>
        <HiDotsHorizontal className="w-5 h-5 text-gray-400 shrink-0" />
      </div>

      {/* Service links — expanded state */}
      <a
        href="https://www.plex.tv"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Plex website"
        className={`transition-all duration-200 text-[#e5a00d] hover:opacity-80 overflow-hidden shrink-0 ${open ? "w-7 h-7 opacity-100" : "w-0 h-0 opacity-0 pointer-events-none"}`}
      >
        <SiPlex style={{ width: "100%", height: "100%", display: "block" }} />
      </a>
      <a
        href="https://github.com/caleb-vanlue/now-playing"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View project on GitHub"
        className={`transition-all duration-200 hover:opacity-80 overflow-hidden shrink-0 ${open ? "w-9 h-9 opacity-100" : "w-0 h-0 opacity-0 pointer-events-none"}`}
      >
        <Image src="/images/logos/github-mark-white.svg" alt="GitHub" width={36} height={36} className="w-full h-full" />
      </a>
      <a
        href="https://jellyfin.org"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Jellyfin website"
        className={`transition-all duration-200 text-[#00a4dc] hover:opacity-80 overflow-hidden shrink-0 ${open ? "w-[22px] h-[22px] opacity-100" : "w-0 h-0 opacity-0 pointer-events-none"}`}
      >
        <SiJellyfin style={{ width: "100%", height: "100%", display: "block" }} />
      </a>
    </div>
  );
}
