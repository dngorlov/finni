import { META_KEYS } from "../../data/metaKeys";
import type { GameContent } from "../../data/content";
import type { CreateProfileInput } from "../../data/repositories/gameRepository";
import type { SessionGame, SessionMeta } from "./types";

function profileExists(game: SessionGame, profileId: string): boolean {
  try {
    game.getProfile(profileId);
    return true;
  } catch {
    return false;
  }
}

function identityInput(
  content: GameContent,
  profile: { name: string; petName: string; species: string; color: string; accessory: string },
): CreateProfileInput {
  return {
    name: profile.name,
    petName: profile.petName,
    species: profile.species,
    color: profile.color,
    accessory: profile.accessory,
    contentVersion: content.contentVersion,
    goals: [],
  };
}

/** Keep names and appearance; restore initial child economy. */
export function resetChildProgress(game: SessionGame, meta: SessionMeta, content: GameContent): void {
  const activeId = meta.get(META_KEYS.activeProfileId);
  if (!activeId) return;
  const current = game.getProfile(activeId);
  if (current.isDemo) return;
  game.deleteProfile(activeId);
  const id = game.createProfile(identityInput(content, current));
  meta.set(META_KEYS.activeProfileId, id);
  meta.set(META_KEYS.childProfileId, id);
}

/** Take the child's pet off the device, including a leftover demo profile. */
export function deleteChildAndDemo(game: SessionGame, meta: SessionMeta): void {
  const activeId = meta.get(META_KEYS.activeProfileId);
  if (!activeId) return;
  const current = game.getProfile(activeId);
  if (current.isDemo) return;
  game.deleteProfile(activeId);
  const demoId = meta.get(META_KEYS.demoProfileId);
  if (demoId && demoId !== activeId && profileExists(game, demoId)) {
    game.deleteProfile(demoId);
  }
  meta.remove(META_KEYS.activeProfileId);
  meta.remove(META_KEYS.childProfileId);
  meta.remove(META_KEYS.demoProfileId);
  meta.remove(META_KEYS.onboardingDone);
  meta.remove(META_KEYS.finnyTour);
}
