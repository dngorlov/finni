/** Type scale and spacing; body and button ≥16 sp (UX constraints). */
export const type = {
  title: 28,
  section: 20,
  body: 16,
  button: 16,
} as const;

export const spacing = {
  s: 8,
  m: 16,
  l: 24,
} as const;

/**
 * Andrei's Material 3 light scheme (seed export from the team chat, 2026-09-20).
 * Each token names its M3 source so a re-export maps one-to-one.
 * Text-on-fill pairs are checked for WCAG AA: onRaised on raisedFace 4.6:1,
 * accentText on background 6.1:1, text on background 12.9:1 (AAA; 13.5:1 on card,
 * 10.5:1 on highlight, 9.1:1 on badgeFill).
 */
export const colors = {
  /** surface */
  background: "#FFF8F4",
  /** on-surface, warmed from #221A12 to a very dark brown (testers: less black). */
  text: "#3E2A1C",
  /** on-surface-variant */
  subtle: "#534434",
  /** surface-container-lowest */
  card: "#FFFFFF",
  /** primary-container — fills, borders, selected beads (not text) */
  accent: "#F7A115",
  /** primary — link-style text on background */
  accentText: "#855400",
  /** primary-container — raised button face */
  raisedFace: "#F7A115",
  /** primary — raised button edge */
  raisedEdge: "#855400",
  /** on-primary-container — label on raisedFace */
  onRaised: "#633D00",
  /** outline-variant */
  disabledFace: "#D8C3AD",
  /** secondary-container */
  badgeFill: "#FECB8F",
  /** surface-container-high */
  track: "#F5E6D7",
  /** tertiary-container — meter and progress fill (numbers always sit beside it) */
  fill: "#ACBD33",
  /** primary-fixed */
  highlight: "#FFDDB7",
  /**
   * Big dark fill behind the money hero cards (Копилка, План, Банк, Итоги),
   * the achievement plaques, and the Обязательные chart slice. The team wants
   * it replaced; Andrei sends the new hex — change it here only. White text
   * sits on it, so keep it dark enough for 4.5:1 against #FFFFFF.
   */
  heroFill: "#855400",
} as const;

export const radius = {
  card: 20,
} as const;

/** Dim over the screen while a modal is open. One value, so every window darkens the same way. */
export const modalScrim = "rgba(34, 26, 18, 0.45)";

/**
 * Text props for titles that must wrap only between words. Android otherwise
 * hyphenates or splits a long Russian word («при / надлежности») mid-word.
 */
export const wholeWords = {
  android_hyphenationFrequency: "none",
  textBreakStrategy: "simple",
} as const;

/** Minimum touch target (UX constraints). */
export const minTarget = 48;

/** Loaded in FinPetApp. Pixel stays the app face; the other three belong to the Этап card. */
export const font = {
  pixel: "PressStart2P_400Regular",
  novice: "Nunito_800ExtraBold",
  pro: "Unbounded_700Bold",
  millionaire: "CormorantGaramond_600SemiBold",
} as const;

/** Titles that stay the phone font. Press Start 2P is too wide for this line. */
const PHONE_SCREEN_TITLES = new Set(["Карта заданий"]);

/** Pixel face for screen titles. Long lines use 16 sp so they still fit. */
export function screenTitleStyle(label: string) {
  if (PHONE_SCREEN_TITLES.has(label)) return null;
  return {
    fontFamily: font.pixel,
    fontSize: label.length > 12 ? 16 : 24,
    fontWeight: "400" as const,
  };
}
