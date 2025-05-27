export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: index * 0.05,
    },
  }),
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.2 },
  },
};

export const imageVariants = {
  hover: {
    scale: 1.05,
    transition: { duration: 0.4 },
  },
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatDuration = (duration: number): string => {
  const minutes = Math.round(duration / 60000);
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

export const formatDurationMMSS = (duration: number): string => {
  const minutes = Math.floor((duration / 60000) % 60);
  const seconds = Math.floor((duration / 1000) % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const formatQuality = (
  videoResolution?: string,
  audioCodec?: string
): string => {
  const parts = [];
  if (videoResolution) {
    parts.push(videoResolution.toUpperCase());
  }
  if (audioCodec) {
    parts.push(audioCodec.toUpperCase());
  }
  return parts.join(" • ");
};

export const calculateProgress = (
  viewOffset?: number,
  duration?: number
): number => {
  return viewOffset && duration ? (viewOffset / duration) * 100 : 0;
};

export const calculateFinishTime = (
  duration: number,
  viewOffset: number = 0
): Date => {
  const currentTime = new Date();
  const remainingMs = duration - viewOffset;
  return new Date(currentTime.getTime() + remainingMs);
};

export const getRatingSource = (rating: {
  image?: string;
  type: string;
}): string => {
  if (!rating.image) return rating.type;

  const imageUrl = rating.image.toLowerCase();

  if (imageUrl.includes("imdb")) return "IMDB";
  if (imageUrl.includes("rottentomatoes")) {
    if (imageUrl.includes("spilled")) return "Rotten Tomatoes (Audience)";
    if (imageUrl.includes("ripe")) return "Rotten Tomatoes (Critics)";
    return "Rotten Tomatoes";
  }
  if (imageUrl.includes("themoviedb")) return "TMDB";

  return rating.type;
};

export const formatAudioChannels = (
  channels: number | undefined,
  channelLayout?: string
): string => {
  if (!channels) return "";

  // If we have channel layout info, use that for more accurate display
  if (channelLayout) {
    const layoutMatch = channelLayout.match(/(\d+\.\d+)/);
    if (layoutMatch) {
      return layoutMatch[1];
    }
  }

  switch (channels) {
    case 1:
      return "1.0"; // Mono
    case 2:
      return "2.0"; // Stereo
    case 6:
      return "5.1"; // 5.1 Surround
    case 8:
      return "7.1"; // 7.1 Surround
    default:
      return `${channels}.0`; // Default format
  }
};
