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
  /** Device-wide. Missing means on. `"0"` keeps the pet still and opens windows at once. */
  animationsOn: "animationsOn",
} as const;
