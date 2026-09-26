import {
  accessoryRank,
  accessoryUnlocked,
  clampAccessory,
  newestAccessory,
  pendingAccessoryUnlock,
  unlockedAccessories,
} from "../accessories";

describe("Аксессуар opens with Этап", () => {
  it("gives Новичок nothing, Про очки, and Миллионер the шапочка", () => {
    expect(unlockedAccessories("novice")).toEqual(["a1"]);
    expect(unlockedAccessories("pro")).toEqual(["a1", "a2"]);
    expect(unlockedAccessories("millionaire")).toEqual(["a1", "a2", "a3"]);
    expect(newestAccessory("novice")).toBe("a1");
    expect(newestAccessory("pro")).toBe("a2");
    expect(newestAccessory("millionaire")).toBe("a3");
  });

  it("locks what a later Этап opens and rejects unknown keys", () => {
    expect(accessoryUnlocked("a2", "novice")).toBe(false);
    expect(accessoryUnlocked("a3", "pro")).toBe(false);
    expect(accessoryUnlocked("a1", "millionaire")).toBe(true);
    expect(accessoryUnlocked("a9", "millionaire")).toBe(false);
    expect(accessoryRank("a9")).toBe(0);
  });

  it("clamps a stored key down to the best one the Этап allows, keeping a chosen lower one", () => {
    expect(clampAccessory("a3", "novice")).toBe("a1");
    expect(clampAccessory("a3", "pro")).toBe("a2");
    expect(clampAccessory("a2", "novice")).toBe("a1");
    expect(clampAccessory("a1", "millionaire")).toBe("a1");
    expect(clampAccessory("a2", "millionaire")).toBe("a2");
    expect(clampAccessory("hat", "millionaire")).toBe("a1");
  });

  it("owes one card per newly opened Аксессуар", () => {
    expect(pendingAccessoryUnlock("novice", 0)).toBeNull();
    expect(pendingAccessoryUnlock("pro", 0)).toBe("a2");
    expect(pendingAccessoryUnlock("pro", 1)).toBeNull();
    expect(pendingAccessoryUnlock("millionaire", 1)).toBe("a3");
    // Skipping straight past Про still shows the newest one once.
    expect(pendingAccessoryUnlock("millionaire", 0)).toBe("a3");
    expect(pendingAccessoryUnlock("millionaire", 2)).toBeNull();
  });
});
