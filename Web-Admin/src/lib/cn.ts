import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional Tailwind classes, resolving conflicts (later wins).
 * Usage: cn('p-4', isActive && 'bg-emerald-500', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
