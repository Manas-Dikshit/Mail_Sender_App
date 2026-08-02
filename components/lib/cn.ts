import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind class lists, resolving conflicts (e.g. "px-2" vs "px-4"). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
