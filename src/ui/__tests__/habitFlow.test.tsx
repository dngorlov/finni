import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { buildRuleSections } from "../rules";
import { rulesStrings } from "../stringsRules";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const content = loadContent();

type User = ReturnType<typeof userEvent.setup>;
type Ports = ReturnType<typeof createFakePorts>;

/** Filled segments of the one habit bar on the open tab. */
function filledSegments(): number {
  return screen.queryAllByTestId("habit-segment-on", { includeHiddenElements: true }).length;
}

function allSegments(): number {
  return filledSegments() + screen.queryAllByTestId("habit-segment-off", { includeHiddenElements: true }).length;
}

/** Buy through the drawer; return the Счастье the pet got, read off the meter. */
async function buy(user: User, ports: Ports, profileId: string, name: string, spoken: string): Promise<number> {
  const before = ports.game.getProfile(profileId).mood;
  await user.press(screen.getByRole("button", { name: `Купить ${name}` }));
  // The drawer says the streak in one line.
  expect(screen.getByLabelText(spoken)).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Купить" }));
  const gained = ports.game.getProfile(profileId).mood - before;
  // The receipt shows the same number the meter moved by.
  expect(screen.getByLabelText(`Счастье +${gained}`)).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Понятно" }));
  return gained;
}

/** Демо-режим style (as in bankFlow): the day closes in Магазин, Дом opens the next one, back to Магазин. */
async function nextDay(user: User, ports: Ports, profileId: string) {
  await act(async () => {
    ports.game.closeDay(profileId, content.catalog, content.bills);
  });
  await user.press(screen.getByRole("button", { name: "Назад" }));
  await user.press(screen.getByRole("button", { name: "Магазин" }));
}

describe("Привычки в Магазине", () => {
  it("are written out in «Как всё считается» from the catalog", () => {
    const shop = buildRuleSections(content).find((section) => section.title === rulesStrings.shopTitle)!;
    const lines = shop.lines.map((line) => line.text);
    expect(lines).toContain("Витамины — бонус за подряд: Счастье = 2 + 1 за каждый день подряд, но не больше 5.");
    expect(lines).toContain("Мороженое — меньше за подряд: Счастье = 5 − 1 за каждый день подряд, но не меньше 1.");
    expect(lines).toContain(rulesStrings.habitIntro);
  });

  it(
    "Витамины give more Счастье each day in a row; Мороженое gives less and recovers after a skipped day",
    async () => {
      const ports = createFakePorts();
      const profileId = seedReturningChild(ports, { isDemo: true, name: "Демо", petName: "Демо" });
      const user = userEvent.setup();
      await render(<FinPetApp ports={ports} />);
      await user.press(screen.getByRole("button", { name: "Магазин" }));

      // Day 1: nothing in a row yet.
      const vitaminsRow = () => screen.getByRole("button", { name: /^Витамины\. 5 монет/ });
      expect(vitaminsRow()).toHaveAccessibleName(
        "Витамины. 5 монет. Сытость +5. Счастье +2. Витамины подряд 0 дней: счастье +2",
      );
      expect(allSegments()).toBe(3);
      expect(filledSegments()).toBe(0);
      expect(within(vitaminsRow()).getByText("Бонус за подряд: +2", { includeHiddenElements: true })).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Купить Витамины" }));
      expect(screen.getByText("Чтобы питомец был бодрым. Каждый день подряд — больше счастья")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));
      expect(await buy(user, ports, profileId, "Витамины", "Витамины подряд 0 дней: счастье +2")).toBe(2);
      // A second purchase the same day gives the same.
      expect(await buy(user, ports, profileId, "Витамины", "Витамины подряд 0 дней: счастье +2")).toBe(2);

      await user.press(screen.getByRole("button", { name: "Желаемое" }));
      const iceRow = () => screen.getByRole("button", { name: /^Мороженое\. 4 монеты/ });
      expect(allSegments()).toBe(4);
      expect(within(iceRow()).getByText("Меньше за подряд: +5", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await buy(user, ports, profileId, "Мороженое", "Мороженое подряд 0 дней: счастье +5")).toBe(5);

      // Day 2: one day in a row.
      await nextDay(user, ports, profileId);
      expect(screen.getByRole("button", { name: "Необходимое" })).toBeSelected();
      expect(vitaminsRow()).toHaveAccessibleName(
        "Витамины. 5 монет. Сытость +5. Счастье +3. Витамины подряд 1 день: счастье +3",
      );
      expect(filledSegments()).toBe(1);
      expect(within(vitaminsRow()).getByText("+3 счастье", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(within(vitaminsRow()).getByText("Бонус за подряд: +3", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await buy(user, ports, profileId, "Витамины", "Витамины подряд 1 день: счастье +3")).toBe(3);

      await user.press(screen.getByRole("button", { name: "Желаемое" }));
      expect(filledSegments()).toBe(1);
      expect(within(iceRow()).getByText("+4 счастье", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(within(iceRow()).getByText("Меньше за подряд: +4", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await buy(user, ports, profileId, "Мороженое", "Мороженое подряд 1 день: счастье +4")).toBe(4);

      // Day 3: vitamins keep growing; no ice cream today.
      await nextDay(user, ports, profileId);
      expect(filledSegments()).toBe(2);
      expect(within(vitaminsRow()).getByText("Бонус за подряд: +4", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(await buy(user, ports, profileId, "Витамины", "Витамины подряд 2 дня: счастье +4")).toBe(4);

      // Day 4: the skipped day starts Мороженое over.
      await nextDay(user, ports, profileId);
      expect(within(vitaminsRow()).getByText("Бонус за подряд: +5", { includeHiddenElements: true })).toBeOnTheScreen();
      expect(filledSegments()).toBe(3);
      await user.press(screen.getByRole("button", { name: "Желаемое" }));
      expect(filledSegments()).toBe(0);
      expect(within(iceRow()).getByText("Меньше за подряд: +5", { includeHiddenElements: true })).toBeOnTheScreen();
    },
    30000,
  );
});
