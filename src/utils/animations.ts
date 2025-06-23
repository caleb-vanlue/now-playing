export const ANIMATION_CONFIG = {
  ACTIVE_TAB: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },

  COUNT_BADGE: {
    initial: { scale: 0 },
    animate: { scale: 1 },
  },

  TAB_INDICATOR: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },

  PAGE_TRANSITION: {
    duration: 0.2,
    ease: "easeInOut" as const,
  },

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

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let timeout: NodeJS.Timeout;
  
  const debouncedFunction = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  debouncedFunction.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFunction;
}
