import React, { memo, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaCard } from "../hooks/useMediaCard";
import { PlayingStateIndicator, ProgressBar } from "./CardComponents";
import { UserInfo } from "./UserAvatar";
import { BaseMedia } from "../../types/media";
import { getTimeAgo } from "../../utils/dateUtils";

export interface ImageState {
  imageError: boolean;
  imageLoaded: boolean;
  setImageError: (error: boolean) => void;
  setImageLoaded: (loaded: boolean) => void;
}

interface BaseMediaCardProps<T extends BaseMedia> {
  item: T;
  index?: number;
  renderThumbnail: (item: T, imageState: ImageState) => React.ReactNode;
  renderMainContent: (item: T) => React.ReactNode;
  renderDetailHeader: (item: T) => React.ReactNode;
  renderDetailContent: (item: T) => React.ReactNode;
  progressPercentage: number;
  className?: string;
}

type CardContentProps<T extends BaseMedia> = {
  item: T;
  renderMainContent: (item: T) => React.ReactNode;
  timeAgo: string;
  userId: string;
  userAvatar?: string;
  avatarError: boolean;
  onAvatarError: () => void;
};

function CardContentComponent<T extends BaseMedia>(props: CardContentProps<T>) {
  const {
    item,
    renderMainContent,
    timeAgo,
    userId,
    userAvatar,
    avatarError,
    onAvatarError,
  } = props;

  return (
    <div className="p-4">
      {renderMainContent(item)}
      <UserInfo
        userId={userId}
        userAvatar={userAvatar}
        avatarError={avatarError}
        onAvatarError={onAvatarError}
        timeAgo={timeAgo}
      />
    </div>
  );
}

const CardContent = memo(CardContentComponent) as typeof CardContentComponent;

type DetailViewProps<T extends BaseMedia> = {
  item: T;
  showDetails: boolean;
  renderDetailHeader: (item: T) => React.ReactNode;
  renderDetailContent: (item: T) => React.ReactNode;
  contentMaxHeight: string;
  handleClose: () => void;
  handleCloseKeyDown: (e: KeyboardEvent) => void;
  headerRef: React.RefObject<HTMLDivElement | null>;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
};

function DetailViewComponent<T extends BaseMedia>(props: DetailViewProps<T>) {
  const {
    item,
    showDetails,
    renderDetailHeader,
    renderDetailContent,
    contentMaxHeight,
    handleClose,
    handleCloseKeyDown,
    headerRef,
    closeButtonRef,
  } = props;

  return (
    <AnimatePresence>
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="absolute inset-0 z-30 overflow-hidden rounded-lg shadow-xl bg-[#141414]/95 backdrop-blur-sm hardware-accelerated"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`detail-header-${item.id}`}
        >
          <div
            ref={headerRef}
            id={`detail-header-${item.id}`}
            className="flex justify-between items-start p-4 border-b border-gray-800/50"
          >
            {renderDetailHeader(item)}
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              onKeyDown={handleCloseKeyDown}
              className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] rounded"
              aria-label="Close details"
            >
              ×
            </button>
          </div>

          <div
            className="p-4 overflow-y-auto"
            style={{ maxHeight: contentMaxHeight }}
          >
            {renderDetailContent(item)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const DetailView = memo(DetailViewComponent) as typeof DetailViewComponent;

function BaseMediaCardComponent<T extends BaseMedia>({
  item,
  renderThumbnail,
  renderMainContent,
  renderDetailHeader,
  renderDetailContent,
  progressPercentage,
  className = "",
}: BaseMediaCardProps<T>) {
  const {
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
  } = useMediaCard();
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleCardClick = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    toggleDetails();
  }, [toggleDetails]);
  
  
  const handleCloseKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleDetails();
    }
  }, [toggleDetails]);
  
  const handleClose = useCallback(() => {
    toggleDetails();
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [toggleDetails]);

  useEffect(() => {
    const currentRef = cardRef.current;
    if (!currentRef) return;

    const touchStart = () => {};

    currentRef.addEventListener("touchstart", touchStart, {
      passive: true,
    } as EventListenerOptions);

    return () => {
      if (currentRef) {
        currentRef.removeEventListener("touchstart", touchStart);
      }
    };
  }, [cardRef]);
  
  useEffect(() => {
    if (showDetails && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [showDetails]);
  
  useEffect(() => {
    if (!showDetails) return;
    
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDetails, handleClose]);

  const timeAgo = getTimeAgo(new Date(item.startTime));
  const imageState = { imageError, imageLoaded, setImageError, setImageLoaded };

  return (
    <div
      ref={cardRef}
      className={`bg-[#1c1c1c] rounded-lg overflow-hidden shadow-md relative card-transition ${className}`}
      style={{
        opacity: 1,
        transform: "translateY(0)",
      }}
    >
      <div 
        className="cursor-pointer" 
        onClick={handleCardClick}
      >
        <div className="relative overflow-hidden">
          {renderThumbnail(item, imageState)}
          <PlayingStateIndicator state={item.state} />
        </div>

        <ProgressBar percentage={progressPercentage} />

        <CardContent
          item={item}
          renderMainContent={renderMainContent}
          timeAgo={timeAgo}
          userId={item.userId}
          userAvatar={item.userAvatar}
          avatarError={avatarError}
          onAvatarError={() => setAvatarError(true)}
        />
      </div>

      <DetailView
        item={item}
        showDetails={showDetails}
        renderDetailHeader={renderDetailHeader}
        renderDetailContent={renderDetailContent}
        contentMaxHeight={contentMaxHeight}
        handleClose={handleClose}
        handleCloseKeyDown={handleCloseKeyDown}
        headerRef={headerRef}
        closeButtonRef={closeButtonRef}
      />
    </div>
  );
}

export const BaseMediaCard = memo(
  BaseMediaCardComponent
) as typeof BaseMediaCardComponent;
