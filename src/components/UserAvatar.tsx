import React from "react";
import Image from "next/image";

interface UserAvatarProps {
  userId: string;
  userAvatar?: string;
  avatarError: boolean;
  onAvatarError: () => void;
  size?: "small" | "medium";
}

export function UserAvatar({
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
}

interface UserInfoProps {
  userId: string;
  userAvatar?: string;
  avatarError: boolean;
  onAvatarError: () => void;
  timeAgo: string;
}

export function UserInfo({
  userId,
  userAvatar,
  avatarError,
  onAvatarError,
  timeAgo,
}: UserInfoProps) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center">
        <UserAvatar
          userId={userId}
          userAvatar={userAvatar}
          avatarError={avatarError}
          onAvatarError={onAvatarError}
        />
        <span className="ml-2 truncate max-w-[80px]" title={userId}>
          {userId}
        </span>
      </div>
      <span className="text-xs text-gray-500">{timeAgo}</span>
    </div>
  );
}
