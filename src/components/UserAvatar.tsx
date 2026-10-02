import React, { useState } from "react";
import Image from "next/image";
import { TimeAgo } from "./TimeAgo";
import type { Stream } from "../../types/media";
import { formatNames, uniqueViewers } from "../../utils/mediaCardUtils";

interface UserAvatarProps {
  userId: string;
  userAvatar?: string;
  avatarError: boolean;
  onAvatarError: () => void;
  size?: "small" | "medium";
}

export const UserAvatar = React.memo(function UserAvatar({
  userId,
  userAvatar,
  avatarError,
  onAvatarError,
  size = "medium",
}: UserAvatarProps) {
  const sizeClasses = {
    small: { wrapper: "w-5 h-5", text: "text-xs" },
    medium: { wrapper: "w-8 h-8", text: "text-xs" },
  };

  const classes = sizeClasses[size];

  if (userAvatar && !avatarError) {
    return (
      <div
        className={`relative ${classes.wrapper} rounded-full overflow-hidden`}
      >
        <Image
          src={userAvatar}
          alt={userId}
          fill
          sizes={size === "small" ? "20px" : "32px"}
          className="object-cover"
          onError={onAvatarError}
        />
      </div>
    );
  }

  return (
    <div
      className={`${classes.wrapper} rounded-full bg-gray-700 flex items-center justify-center ${classes.text}`}
    >
      {userId.charAt(0)}
    </div>
  );
});

export function SelfContainedUserAvatar({
  userId,
  userAvatar,
  size,
}: Pick<UserAvatarProps, "userId" | "userAvatar" | "size">) {
  const [avatarError, setAvatarError] = useState(false);
  return (
    <UserAvatar
      userId={userId}
      userAvatar={userAvatar}
      avatarError={avatarError}
      onAvatarError={() => setAvatarError(true)}
      size={size}
    />
  );
}

interface UserInfoProps {
  userId: string;
  userAvatar?: string;
  avatarError: boolean;
  onAvatarError: () => void;
  since: string;
  // Present when the card merges several sessions of the same item
  streams?: Stream[];
}

const MAX_STACKED_AVATARS = 3;

export const UserInfo = React.memo(function UserInfo({
  userId,
  userAvatar,
  avatarError,
  onAvatarError,
  since,
  streams,
}: UserInfoProps) {
  const viewers = streams ? uniqueViewers(streams) : [];
  const names = viewers.map((v) => v.userId);

  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      {viewers.length > 1 ? (
        <div className="flex items-center min-w-0" title={names.join(", ")}>
          <div className="flex -space-x-2 shrink-0">
            {viewers.slice(0, MAX_STACKED_AVATARS).map((viewer) => (
              <div
                key={viewer.userId}
                className="rounded-full ring-2 ring-[var(--card-background)]"
              >
                <SelfContainedUserAvatar userId={viewer.userId} userAvatar={viewer.userAvatar} />
              </div>
            ))}
          </div>
          <span className="ml-2 truncate">{formatNames(names)}</span>
        </div>
      ) : (
        <div className="flex items-center min-w-0">
          <UserAvatar
            userId={userId}
            userAvatar={userAvatar}
            avatarError={avatarError}
            onAvatarError={onAvatarError}
          />
          <span className="ml-2 truncate max-w-[80px]" title={userId}>
            {userId}
          </span>
          {streams && (
            <span
              className="ml-1.5 text-xs text-gray-500 whitespace-nowrap"
              title={streams.map((s) => s.player).join(", ")}
            >
              · {streams.length} devices
            </span>
          )}
        </div>
      )}
      <TimeAgo date={new Date(since)} className="text-xs text-gray-500 shrink-0" />
    </div>
  );
});
