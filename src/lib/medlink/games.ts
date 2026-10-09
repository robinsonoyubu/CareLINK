/**
 * Earn games catalogue. Every title uses an original name and original or
 * licensed assets. Ads appear only at natural breaks, never mid-play.
 */
export interface GameInfo {
  slug: string;
  title: string;
  tagline: string;
  status: "playable" | "in_development";
  /** Launch blocker that must be cleared before release, if any. */
  launchNote?: string;
}

export const GAMES: GameInfo[] = [
  { slug: "snake", title: "Classic Snake", tagline: "Retro snake — eat, grow, go faster. Touch and keyboard controls.", status: "playable" },
  { slug: "highway-survival", title: "Highway Zombie Survival: Lagos Route", tagline: "Ikorodu to Obalende — checkpoints, signboards and fictional, non-graphic zombie encounters.", status: "in_development", launchNote: "Needs original/licensed art for route signboards and characters." },
  { slug: "word-link", title: "Word Link", tagline: "Connect letters to fill the grid. Progressive levels and daily challenges.", status: "in_development" },
  { slug: "card-match", title: "Card Match (WHOT!-style)", tagline: "Matching-card play, solo first, multiplayer later.", status: "in_development", launchNote: "Obtain rights to the WHOT! name/artwork or ship under an original, legally reviewed identity." },
  { slug: "lagos-life", title: "Lagos Life: Healthcare Careers", tagline: "Shifts, navigation, patient assistance and ethical choices as a nurse, doctor, pharmacist and more.", status: "in_development", launchNote: "Content review: no unsafe medical instruction." },
  { slug: "marble-chain", title: "Marble Chain", tagline: "Colour-matching chain puzzle with original levels and effects.", status: "in_development" },
];

/** Frequency cap for interstitial ads at natural breaks. */
export const GAME_BREAK_EVERY_N_ROUNDS = 3;
export const GAME_BREAK_MIN_INTERVAL_MS = 3 * 60 * 1000;

export function shouldShowBreakAd(roundsSinceAd: number, lastAdAt: number | null, now = Date.now()) {
  if (roundsSinceAd < GAME_BREAK_EVERY_N_ROUNDS) return false;
  return lastAdAt == null || now - lastAdAt >= GAME_BREAK_MIN_INTERVAL_MS;
}
