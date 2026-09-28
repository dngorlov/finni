import almostSound from "../../../assets/sounds/almost.wav";
import completeSound from "../../../assets/sounds/complete.wav";
import correctSound from "../../../assets/sounds/correct.wav";
import wrongSound from "../../../assets/sounds/wrong.wav";
import { META_KEYS } from "../../data/metaKeys";
import { gainForVolume, readSoundVolume, type SoundCue } from "./cues";

type Player = {
  play: () => void;
  seekTo: (seconds: number) => Promise<void>;
  volume: number;
  loop: boolean;
};

type AudioApi = {
  createAudioPlayer: (source: number) => Player;
  setAudioModeAsync: (mode: {
    playsInSilentMode: boolean;
    interruptionMode: "mixWithOthers";
    allowsRecording: boolean;
    shouldPlayInBackground: boolean;
  }) => Promise<void>;
};

const players = new Map<SoundCue, Player>();
let audio: AudioApi | null | undefined;
let modeReady: Promise<void> | null = null;

function loadAudio(): AudioApi | null {
  if (audio !== undefined) return audio;
  try {
    // Lazy so a missing native player cannot block a lesson, and Jest can
    // install its mock before the first cue.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    audio = require("expo-audio") as AudioApi;
  } catch {
    audio = null;
  }
  return audio;
}

const SOURCES: Record<SoundCue, number> = {
  correct: correctSound,
  wrong: wrongSound,
  almost: almostSound,
  complete: completeSound,
};

/** Plays one cue at 0–100. Volume 0 is silence. Failures are swallowed. */
export function playCue(cue: SoundCue, volumePercent: number): Promise<void> {
  if (volumePercent <= 0) return Promise.resolve();
  const gain = gainForVolume(volumePercent);
  return (async () => {
    try {
      const api = loadAudio();
      if (!api) return;
      modeReady ??= api.setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
        shouldPlayInBackground: false,
      });
      await modeReady;
      let player = players.get(cue);
      if (!player) {
        player = api.createAudioPlayer(SOURCES[cue]);
        player.loop = false;
        players.set(cue, player);
      }
      player.volume = gain;
      await player.seekTo(0);
      player.play();
    } catch {
      modeReady = null;
    }
  })();
}

export function playStoredCue(
  cue: SoundCue,
  meta: { get(key: string): string | null },
): Promise<void> {
  return playCue(cue, readSoundVolume(meta.get(META_KEYS.soundVolume)));
}
