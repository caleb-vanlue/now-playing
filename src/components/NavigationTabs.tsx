import React from "react";
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

  if (!onTabClick) {
    return (
      <nav className="relative flex space-x-8 border-b border-gray-800/50 bg-[#141414]/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative py-3 px-1 ${
              pathname === item.href
                ? "text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div className="flex items-center">
              <span className="relative z-10">{item.label}</span>
              {item.count > 0 && (
                <motion.span
                  {...ANIMATION_CONFIG.COUNT_BADGE}
                  className="ml-1 text-xs bg-orange-500 px-1.5 py-0.5 rounded-full"
                >
                  {item.count}
                </motion.span>
              )}
            </div>
            {pathname === item.href && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                layoutId="activeTab"
                {...ANIMATION_CONFIG.TAB_INDICATOR}
                transition={ANIMATION_CONFIG.ACTIVE_TAB}
              />
            )}
          </Link>
        ))}
      </nav>
    );
  }

  const currentActive = activeTab || items[0]?.href;

  return (
    <nav className="relative flex justify-center sm:justify-start space-x-8 border-b border-gray-800/50 bg-[#141414]/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      {items.map((item) => (
        <button
          key={item.href}
          onClick={() => onTabClick(item.href)}
          className={`relative py-3 px-1 ${
            currentActive === item.href
              ? "text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <span className="relative z-10">{item.label}</span>
            {item.count > 0 && (
              <motion.span
                {...ANIMATION_CONFIG.COUNT_BADGE}
                className="ml-1 text-xs bg-orange-500 px-1.5 py-0.5 rounded-full"
              >
                {item.count}
              </motion.span>
            )}
          </div>
          {currentActive === item.href && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
              layoutId="activeTab"
              {...ANIMATION_CONFIG.TAB_INDICATOR}
              transition={ANIMATION_CONFIG.ACTIVE_TAB}
            />
          )}
        </button>
      ))}
    </nav>
  );
});

export default NavigationTabs;
