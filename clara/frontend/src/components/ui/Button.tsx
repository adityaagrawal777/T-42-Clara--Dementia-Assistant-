import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-clara-primary text-white shadow-glow-sm border border-clara-primary/40 hover:bg-clara-primary-light hover:shadow-glow-lg",
      secondary: "bg-white/[0.05] text-white border border-white/[0.08] hover:bg-white/[0.1] shadow-dark-sm",
      outline: "bg-transparent border border-white/[0.15] text-white hover:bg-white/[0.05] hover:border-white/[0.25]",
      ghost: "bg-transparent border-transparent text-clara-text-secondary hover:bg-white/[0.05] hover:text-white",
      danger: "bg-danger text-white shadow-glow-sm border border-danger/40 hover:bg-danger/80",
      success: "bg-success text-white shadow-glow-sm border border-success/40 hover:bg-success/80",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs font-black uppercase tracking-widest",
      md: "px-5 py-2.5 text-sm font-bold tracking-tight",
      lg: "px-8 py-4 text-base font-black tracking-tight",
      xl: "px-10 py-5 text-lg font-black tracking-tight rounded-[2rem]",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:grayscale disabled:scale-100",
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
