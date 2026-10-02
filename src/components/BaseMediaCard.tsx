import React, { memo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaCard } from "../hooks/useMediaCard";
import { PlayingStateIndicator, ProgressBar, SourceIcon } from "./CardComponents";
import { UserInfo } from "./UserAvatar";
import { BaseMedia } from "../../types/media";

interface BaseMediaCardProps<T extends BaseMedia> {
  item: T;
  renderThumbnail: (item: T) => React.ReactNode;
  renderMainContent: (item: T) => React.ReactNode;
  renderDetailHeader: (item: T) => React.ReactNode;
  renderDetailContent: (item: T) => React.ReactNode;
  transcodeProgress?: number;
}

type CardContentProps<T extends BaseMedia> = {
  item: T;
  renderMainContent: (item: T) => React.ReactNode;
  userId: string;
  userAvatar?: string;
  avatarError: boolean;
  onAvatarError: () => void;
};

function CardContentComponent<T extends BaseMedia>(props: CardContentProps<T>) {
  const {
    item,
    renderMainContent,
    userId,
    userAvatar,
    avatarError,
    onAvatarError,
  } = props;

  return (
    <div className="p-4 relative flex flex-col flex-1">
      <div className="absolute top-4 right-4">
        <SourceIcon source={item.source} size={28} />
      </div>
      <div className="pr-8 flex-1">
        {renderMainContent(item)}
      </div>
      <UserInfo
        userId={userId}
        userAvatar={userAvatar}
        avatarError={avatarError}
        onAvatarError={onAvatarError}
        since={item.startTime}
        streams={item.streams}
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
    headerRef,
    closeButtonRef,
  } = props;

  const overlayRef = useRef<HTMLDivElement>(null);

  // Native listeners — React synthetic stopPropagation fires after react-swipeable's
  // native listener on the parent, so we need to intercept at the DOM level instead.
  useEffect(() => {
    if (!showDetails) return;
    const el = overlayRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => e.stopPropagation();
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [showDetails]);

  return (
    <AnimatePresence>
      {showDetails && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="absolute inset-0 z-30 overflow-hidden rounded-lg shadow-xl theme-bg-header backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`detail-header-${item.sessionId}`}
        >
          <div
            ref={headerRef}
            id={`detail-header-${item.sessionId}`}
            className="flex justify-between items-start p-4 border-b border-gray-800/50"
          >
            {renderDetailHeader(item)}
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded"
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
  transcodeProgress,
}: BaseMediaCardProps<T>) {
  const {
    showDetails,
    avatarError,
    cardRef,
    headerRef,
    contentMaxHeight,
    toggleDetails,
    setAvatarError,
  } = useMediaCard();
  
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleCardClick = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    toggleDetails();
  }, [toggleDetails]);

  const handleClose = useCallback(() => {
    toggleDetails();
    previousFocusRef.current?.focus();
  }, [toggleDetails]);

  useEffect(() => {
    if (showDetails && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [showDetails]);

  useEffect(() => {
    if (!showDetails) return;

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showDetails, handleClose]);

  const handleAvatarError = useCallback(() => setAvatarError(true), [setAvatarError]);

  // A merged card is "playing" while any of its streams is; progress still follows the primary
  const groupState = item.streams?.some((s) => s.state === "playing") ? "playing" : item.state;

  return (
    <div
      ref={cardRef}
      className="bg-[var(--card-background)] rounded-lg overflow-hidden shadow-md relative card-transition flex flex-col"
    >
      <div
        className="cursor-pointer flex flex-col flex-1"
        onClick={handleCardClick}
      >
        <div className="relative overflow-hidden">
          {renderThumbnail(item)}
          <PlayingStateIndicator state={groupState} />
        </div>

        <ProgressBar item={item} transcodeProgress={transcodeProgress} />

        <CardContent
          item={item}
          renderMainContent={renderMainContent}
          userId={item.userId}
          userAvatar={item.userAvatar}
          avatarError={avatarError}
          onAvatarError={handleAvatarError}
        />
      </div>

      <DetailView
        item={item}
        showDetails={showDetails}
        renderDetailHeader={renderDetailHeader}
        renderDetailContent={renderDetailContent}
        contentMaxHeight={contentMaxHeight}
        handleClose={handleClose}
        headerRef={headerRef}
        closeButtonRef={closeButtonRef}
      />
    </div>
  );
}

export const BaseMediaCard = memo(
  BaseMediaCardComponent
) as typeof BaseMediaCardComponent;
