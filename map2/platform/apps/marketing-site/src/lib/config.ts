/**
 * Central config for the marketing site.
 * In production: APP_URL = https://app.terrascan.ai
 * In local dev:  APP_URL = http://localhost:3100
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.terrascan.ai';
