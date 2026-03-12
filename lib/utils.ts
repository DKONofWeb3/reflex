  // lib/utils.ts
// Shared utility functions used across components
// cn() merges Tailwind class names cleanly — handles conditionals and conflicts
// Usage: cn("text-white", isActive && "bg-cyan-500", "p-4")

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}