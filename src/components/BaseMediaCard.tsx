import React, { memo } from "react";
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

function BaseMediaCardComponent<T extends BaseMedia>({
  item,
  index = 0,
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
      <div className="cursor-pointer" onClick={toggleDetails}>
        <div className="relative overflow-hidden">
          {renderThumbnail(item, imageState)}
          <PlayingStateIndicator state={item.state} />
        </div>

        <ProgressBar percentage={progressPercentage} />

        <div className="p-4">
          {renderMainContent(item)}
          <UserInfo
            userId={item.userId}
            userAvatar={item.userAvatar}
            avatarError={avatarError}
            onAvatarError={() => setAvatarError(true)}
            timeAgo={timeAgo}
          />
        </div>
      </div>

      {showDetails && (
        <div className="absolute inset-0 z-30 overflow-hidden rounded-lg shadow-xl bg-[#141414]/95 backdrop-blur-sm fade-in">
          <div
            ref={headerRef}
            className="flex justify-between items-start p-4 border-b border-gray-800/50"
          >
            {renderDetailHeader(item)}
            <button
              onClick={toggleDetails}
              className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center transition-colors"
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
        </div>
      )}
    </div>
  );
}

export const BaseMediaCard = memo(
  BaseMediaCardComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.state === nextProps.item.state &&
      prevProps.item.viewOffset === nextProps.item.viewOffset &&
      prevProps.progressPercentage === nextProps.progressPercentage
    );
  }
) as typeof BaseMediaCardComponent;
