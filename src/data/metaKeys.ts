/** Stable keys shared by persistence and first-run session routing. */
export const META_KEYS = {
  activeProfileId: "activeProfileId",
  onboardingDone: "onboardingDone",
  /** Acquaintance tour step id, or "done" after Finny finishes it. */
  finnyTour: "finnyTour",
  childProfileId: "childProfileId",
  demoProfileId: "demoProfileId",
  /** Device-wide громкость, 0–100. Missing means the default in `readSoundVolume`. */
  soundVolume: "soundVolume",
} as const;
