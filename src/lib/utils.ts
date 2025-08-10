import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length < 10) {
    return phoneNumber; // Return original if it's not a valid-looking number
  }
  const countryCode = phoneNumber.slice(0, 3); // Assumes +91
  const lastFour = phoneNumber.slice(-4);
  const middle = 'X'.repeat(phoneNumber.length - 7);
  return `${countryCode}${middle}${lastFour}`;
}
