import { useEffect, useRef, KeyboardEvent } from 'react';

interface UseGridKeyboardNavigationProps {
  itemCount: number;
  columns: number;
  onItemSelect?: (index: number) => void;
}

export function useGridKeyboardNavigation({
  itemCount,
  columns,
  onItemSelect,
}: UseGridKeyboardNavigationProps) {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const currentIndexRef = useRef<number>(-1);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  const setItemRef = (index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  };

  const focusItem = (index: number) => {
    if (index >= 0 && index < itemCount) {
      itemRefs.current[index]?.focus();
      currentIndexRef.current = index;
    }
  };

  const handleKeyDown = (event: KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    const row = Math.floor(currentIndex / columns);
    const col = currentIndex % columns;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (col < columns - 1 && currentIndex + 1 < itemCount) {
          nextIndex = currentIndex + 1;
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (col > 0) {
          nextIndex = currentIndex - 1;
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex + columns < itemCount) {
          nextIndex = currentIndex + columns;
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (row > 0) {
          nextIndex = currentIndex - columns;
        }
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = itemCount - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onItemSelect) {
          onItemSelect(currentIndex);
        }
        break;
      default:
        return;
    }

    if (nextIndex !== currentIndex) {
      focusItem(nextIndex);
    }
  };

  return {
    setItemRef,
    handleKeyDown,
    focusItem,
  };
}