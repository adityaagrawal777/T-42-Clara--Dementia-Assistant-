import { useClaraStore } from "@/store/claraStore";

export interface MoodConfig {
  bgColor: string;
  textColor: string;
  borderColor: string;
  fontSize: string;
  transitionClass: string;
}

export const useMoodUI = (): MoodConfig => {
  const currentMood = useClaraStore((state) => state.current.mood);

  const getMoodColors = (mood: string) => {
    switch (mood) {
      case "calm":
        return {
          bg: "bg-clara-calm-bg",
          text: "text-clara-calm-text",
          border: "border-clara-calm-border",
        };
      case "happy":
        return {
          bg: "bg-clara-happy-bg",
          text: "text-clara-happy-text",
          border: "border-clara-happy-border",
        };
      case "confused":
        return {
          bg: "bg-clara-confused-bg",
          text: "text-clara-confused-text",
          border: "border-clara-confused-border",
        };
      case "distressed":
        return {
          bg: "bg-clara-distressed-bg",
          text: "text-clara-distressed-text",
          border: "border-clara-distressed-border",
        };
      default:
        return {
          bg: "bg-clara-neutral-bg",
          text: "text-clara-neutral-text",
          border: "border-clara-neutral-border",
        };
    }
  };

  const getFontSize = (mood: string) => {
    switch (mood) {
      case "confused":
        return "text-clara-large";
      case "distressed":
        return "text-clara-xl";
      default:
        return "text-clara-base";
    }
  };

  const colors = getMoodColors(currentMood);
  const fontSize = getFontSize(currentMood);

  return {
    bgColor: colors.bg,
    textColor: colors.text,
    borderColor: colors.border,
    fontSize,
    transitionClass: "transition-all duration-700 ease-in-out",
  };
};
