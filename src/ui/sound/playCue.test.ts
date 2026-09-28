import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { playCue } from "./playCue";

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    volume: 1,
    loop: false,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

const createPlayer = jest.mocked(createAudioPlayer);
const setMode = jest.mocked(setAudioModeAsync);

describe("playCue", () => {
  beforeEach(() => {
    createPlayer.mockClear();
    setMode.mockClear();
  });

  it("stays quiet at volume 0 and plays above it", async () => {
    await playCue("correct", 0);
    expect(createPlayer).not.toHaveBeenCalled();

    await playCue("wrong", 40);
    expect(setMode).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
      }),
    );
    expect(createPlayer).toHaveBeenCalledTimes(1);
    const player = createPlayer.mock.results[0]?.value as { play: jest.Mock; volume: number };
    expect(player.volume).toBeCloseTo(Math.pow(10, -0.9), 5);
    expect(player.play).toHaveBeenCalledTimes(1);

    await playCue("wrong", 80);
    expect(createPlayer).toHaveBeenCalledTimes(1);
    expect(player.volume).toBeCloseTo(Math.pow(10, -0.3), 5);
    expect(player.play).toHaveBeenCalledTimes(2);
  });
});
