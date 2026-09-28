import { cueForVerdict, gainForVolume, readSoundVolume, stepVolume } from "./cues";

describe("громкость", () => {
  it("maps the slider on a decibel curve: equal steps sound like equal changes", () => {
    expect(gainForVolume(0)).toBe(0);
    expect(gainForVolume(100)).toBe(1);
    // Every 10 steps is the same 3 dB change, top to bottom.
    const db = (v: number) => 20 * Math.log10(gainForVolume(v));
    for (const v of [20, 40, 60, 80, 100]) expect(db(v) - db(v - 10)).toBeCloseTo(3, 5);
    // Half the slider is clearly quieter than full, not «almost the same».
    expect(gainForVolume(50)).toBeLessThan(0.2);
    expect(gainForVolume(1)).toBeGreaterThan(0);
  });

  it("starts at 80 when nothing is stored, and keeps an explicit mute", () => {
    expect(readSoundVolume(null)).toBe(80);
    expect(readSoundVolume("")).toBe(80);
    expect(readSoundVolume("нет")).toBe(80);
    expect(readSoundVolume("0")).toBe(0);
    expect(readSoundVolume("70")).toBe(70);
    expect(readSoundVolume("140")).toBe(100);
    expect(readSoundVolume("-4")).toBe(0);
  });

  it("steps by 10 and stops at the ends", () => {
    expect(stepVolume(80, -1)).toBe(70);
    expect(stepVolume(80, 1)).toBe(90);
    expect(stepVolume(3, -1)).toBe(0);
    expect(stepVolume(96, 1)).toBe(100);
  });
});

describe("cue for a verdict", () => {
  it("maps a right answer, a priced answer, and a miss", () => {
    expect(cueForVerdict("good")).toBe("correct");
    expect(cueForVerdict("warn")).toBe("almost");
    expect(cueForVerdict("bad")).toBe("wrong");
  });
});
