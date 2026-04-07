import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Spinner = ({ className }: { className?: string }) => (
  <div className={cn("animate-spin rounded-full h-8 w-8 border-b-2 border-clara-calm-text", className)} />
);
