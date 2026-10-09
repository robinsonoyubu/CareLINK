/**
 * Earn — rewards rules.
 *  - 1 valid completed eligible advert = 1 coin (enforced server-side in SQL).
 *  - Withdrawal opens at MIN_WITHDRAWAL_COINS; the full balance is paid out and
 *    the wallet resets to 0, starting a new cycle.
 *  - The coin→naira rate must be configured by RGH before payouts are enabled.
 */

export const COINS_PER_COMPLETED_AD = 1;
export const MIN_WITHDRAWAL_COINS = 100;

export type WithdrawalStatus = "processing" | "successful" | "failed";

export function canWithdraw(balance: number, minCoins = MIN_WITHDRAWAL_COINS) {
  return Number.isFinite(balance) && balance >= minCoins;
}

export function coinsToNaira(coins: number, nairaPerCoin: number | null | undefined): number | null {
  if (nairaPerCoin == null || !(nairaPerCoin > 0)) return null;
  return Math.round(coins * nairaPerCoin * 100) / 100;
}

/** 8031234567 → "******4567". Never show the full payout number in the UI. */
export function maskAccountNumber(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return "*".repeat(digits.length - 4) + digits.slice(-4);
}

export function withdrawalProgress(balance: number, minCoins = MIN_WITHDRAWAL_COINS) {
  return Math.max(0, Math.min(100, Math.round((balance / minCoins) * 100)));
}
