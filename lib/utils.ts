import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMatchDateParts(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  const date = d
    .toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\.$/, '')
    .replace(/\.,/g, '')
    .replace(/,/g, '')
    .trim();
  const time = d
    .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toLowerCase()
    .trim();
  return { date, time };
}

export function isMatchOpen(prediction_closes_at: string): boolean {
  return new Date(prediction_closes_at) > new Date();
}
