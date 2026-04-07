import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-clara-calm-bg text-clara-calm-text border-clara-calm-border hover:opacity-90",
      secondary: "bg-clara-neutral-bg text-clara-neutral-text border-clara-neutral-border hover:bg-slate-100",
      outline: "bg-transparent border-2 border-current hover:bg-slate-50",
      ghost: "bg-transparent border-transparent hover:bg-slate-100",
      danger: "bg-clara-distressed-bg text-clara-distressed-text border-clara-distressed-border hover:bg-rose-100",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg font-medium",
      xl: "px-8 py-4 text-xl font-bold rounded-2xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center border-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
