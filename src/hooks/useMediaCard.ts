import { useState, useRef, useEffect } from "react";
import { debounce } from "../utils/animations";

export function useMediaCard() {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [contentMaxHeight, setContentMaxHeight] = useState("calc(100% - 60px)");

  useEffect(() => {
    if (!showDetails) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDetails]);

  useEffect(() => {
    if (showDetails && headerRef.current) {
      const updateContentHeight = () => {
        const headerHeight = headerRef.current?.offsetHeight || 0;
        setContentMaxHeight(`calc(100% - ${headerHeight}px)`);
      };

      const debouncedUpdateContentHeight = debounce(updateContentHeight, 150);

      updateContentHeight();
      window.addEventListener("resize", debouncedUpdateContentHeight);

      return () => window.removeEventListener("resize", debouncedUpdateContentHeight);
    }
  }, [showDetails]);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return {
    showDetails,
    imageError,
    imageLoaded,
    avatarError,
    cardRef,
    headerRef,
    contentMaxHeight,
    toggleDetails,
    setImageError,
    setImageLoaded,
    setAvatarError,
  };
}
