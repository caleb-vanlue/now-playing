import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

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

export default function NavigationTabs({
  items,
  onTabClick,
  activeTab,
}: NavigationTabsProps) {
  const pathname = usePathname();

  if (!onTabClick) {
    return (
      <nav className="relative flex space-x-8 border-b border-gray-800/50 mb-0">
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
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              />
            )}
          </Link>
        ))}
      </nav>
    );
  }

  const currentActive = activeTab || items[0]?.href;

  return (
    <nav className="relative flex justify-center sm:justify-start space-x-8 border-b border-gray-800/50 mb-0">
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
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
