const DEFAULT_API_URL = "http://localhost:3000";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? DEFAULT_API_URL;

export const DEVICE_API_KEY = process.env.EXPO_PUBLIC_DEVICE_KEY ?? "";

export function authUrl(path: string): string {
  return `${API_URL}${path}`;
}