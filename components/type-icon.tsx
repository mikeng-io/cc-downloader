/**
 * TypeIcon Component
 * Displays Material 3 icons for different download/media types
 */

interface TypeIconProps {
  type: string;
  className?: string;
}

export function TypeIcon({ type, className = "" }: TypeIconProps) {
  const getTypeIcon = (): { icon: string; color: string } => {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case "video":
      case "youtube":
      case "vimeo":
        return {
          icon: "play_circle",
          color: "text-red-600 dark:text-red-400",
        };

      case "audio":
      case "soundcloud":
        return {
          icon: "music_note",
          color: "text-purple-600 dark:text-purple-400",
        };

      case "image":
      case "unsplash":
        return {
          icon: "image",
          color: "text-green-600 dark:text-green-400",
        };

      case "pdf":
        return {
          icon: "picture_as_pdf",
          color: "text-orange-600 dark:text-orange-400",
        };

      case "text":
        return {
          icon: "description",
          color: "text-blue-600 dark:text-blue-400",
        };

      default:
        return {
          icon: "download",
          color: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const { icon, color } = getTypeIcon();

  return (
    <span
      className={`material-symbols-outlined ${color} ${className}`}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
}
