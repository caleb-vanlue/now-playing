// Shared animation configurations for consistent motion design
export const ANIMATION_CONFIG = {
  // Spring animation for active tab indicator
  ACTIVE_TAB: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },
  
  // Scale animation for count badges
  COUNT_BADGE: {
    initial: { scale: 0 },
    animate: { scale: 1 },
  },
  
  // Opacity animation for tab indicators
  TAB_INDICATOR: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  
  // Page transition timings
  PAGE_TRANSITION: {
    duration: 0.2,
    ease: "easeInOut" as const,
  },
  
  // Advanced page transition variants
  ADVANCED_PAGE_TRANSITION: {
    initial: {
      opacity: 0,
      y: 8,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1.0],
        when: "beforeChildren" as const,
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      y: 8,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  },
} as const;

// Debounce utility function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}