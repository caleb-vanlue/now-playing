import React, { useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ANIMATION_CONFIG } from "../utils/animations";

interface NavItem {
  href: string;
  label: string;
  count: number;
}

interface NavigationTabsProps {
  items: NavItem[];
  onTabClick?: (href: string) => void;
  activeTab?: string;
}

const NavigationTabs = React.memo(function NavigationTabs({
  items,
  onTabClick,
  activeTab,
}: NavigationTabsProps) {
  const pathname = usePathname();
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (
    event: KeyboardEvent,
    currentIndex: number,
    isLink: boolean = false
  ) => {
    let nextIndex = currentIndex;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case "ArrowLeft":
        event.preventDefault();
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    tabRefs.current[nextIndex]?.focus();
    if (!isLink && onTabClick && nextIndex !== currentIndex) {
      onTabClick(items[nextIndex].href);
    }
  };

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, items.length);
  }, [items.length]);

  useEffect(() => {
    const current = activeTab || items[0]?.href;
    const index = items.findIndex((item) => item.href === current);
    if (index !== -1) {
      tabRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
        block: "nearest",
      });
    }
  }, [activeTab, items]);

  if (!onTabClick) {
    return (
      <nav
        className="relative flex border-b border-gray-800/50 theme-bg-nav backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide"
        aria-label="Main navigation"
      >
        <div
          role="tablist"
          ref={tabListRef}
          className="flex space-x-8"
          aria-orientation="horizontal"
        >
          {items.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, index, true)}
                className={`relative py-3 px-1 whitespace-nowrap scroll-mx-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded ${
                  isActive ? "text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <div className="flex items-center">
                  <span className="relative z-10">{item.label}</span>
                  {item.count > 0 && (
                    <motion.span
                      {...ANIMATION_CONFIG.COUNT_BADGE}
                      className="ml-1 text-xs bg-[var(--accent)] px-1.5 py-0.5 rounded-full"
                      aria-label={`${item.count} active`}
                    >
                      {item.count}
                    </motion.span>
                  )}
                </div>
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                    layoutId="activeTab"
                    {...ANIMATION_CONFIG.TAB_INDICATOR}
                    transition={ANIMATION_CONFIG.ACTIVE_TAB}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  const currentActive = activeTab || items[0]?.href;

  return (
    <nav
      className="relative flex border-b border-gray-800/50 theme-bg-nav backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide"
      aria-label="Media type navigation"
    >
      <div role="tablist" ref={tabListRef} className="flex space-x-8">
        {items.map((item, index) => {
          const isActive = currentActive === item.href;
          return (
            <button
              key={item.href}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${item.href}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabClick(item.href)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`relative py-3 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded ${
                isActive ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center">
                <span className="relative z-10">{item.label}</span>
                {item.count > 0 && (
                  <motion.span
                    {...ANIMATION_CONFIG.COUNT_BADGE}
                    className="ml-1 text-xs bg-[var(--accent)] px-1.5 py-0.5 rounded-full"
                    aria-label={`${item.count} active`}
                  >
                    {item.count}
                  </motion.span>
                )}
              </div>
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                  layoutId="activeTab"
                  {...ANIMATION_CONFIG.TAB_INDICATOR}
                  transition={ANIMATION_CONFIG.ACTIVE_TAB}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export default NavigationTabs;
