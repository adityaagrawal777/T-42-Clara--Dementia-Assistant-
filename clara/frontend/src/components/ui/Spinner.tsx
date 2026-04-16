import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Spinner = ({ className }: { className?: string }) => (
  <div className={cn("inline-block animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-clara-primary border-r-clara-primary/30", className)} />
);
