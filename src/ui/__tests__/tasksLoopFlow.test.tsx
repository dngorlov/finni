import { render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { passAdultGate } from "../testSupport/flowHelpers";

const content = loadContent();
const candy = content.catalog.find((item) => item.id === "candy")!;
const iceCream = content.catalog.find((item) => item.id === "ice-cream")!;

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

async function backToMain(user: ReturnType<typeof userEvent.setup>) {
  const home = screen.queryByRole("button", { name: "Дом" });
  if (home) await user.press(home);
  if (screen.queryByRole("button", { name: "Магазин" })) return;
  for (let i = 0; i < 8; i += 1) {
    if (screen.queryByRole("button", { name: "Магазин" })) return;
    const back = screen.queryByRole("button", { name: "Назад" });
    if (!back) throw new Error("Не удалось вернуться на главный экран");
    await user.press(back);
  }
  throw new Error("Не удалось вернуться на главный экран");
}

describe("Задания combined loop", () => {
  it(
    "reaches the map from the hub and from BlockedSheet, and Демо-режим opens every mission",
    async () => {
      const ports = createFakePorts();
      const profileId = seedReturningChild(ports);
      const { user } = await renderApp(ports);

      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.getByRole("button", { name: "Что такое бюджет?, открыто" })).toBeOnTheScreen();
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
      expect(screen.getAllByRole("button", { name: /, закрыто$/ })).toHaveLength(6);
      expect(screen.queryByRole("button", { name: /, скоро$/ })).not.toBeOnTheScreen();
      expect(screen.queryByText("Почини рюкзак")).not.toBeOnTheScreen();
      await backToMain(user);

      const day = ports.game.dayState(profileId);
      while (ports.game.getProfile(profileId).balance >= iceCream.price) {
        ports.game.purchase(profileId, day.dayId, candy);
      }

      await user.press(screen.getByRole("button", { name: "Магазин" }));
      await user.press(screen.getByRole("button", { name: "Желаемое" }));
      await user.press(screen.getByRole("button", { name: /^Мороженое/ }));
      expect(screen.queryByRole("button", { name: "Купить" })).not.toBeOnTheScreen();
      expect(screen.getByLabelText(/Не хватает/)).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Выполнить задание" }));
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Дом" }));

      await passAdultGate(user);
      await user.press(screen.getByRole("button", { name: "Демо-режим" }));
      await user.press(screen.getByRole("button", { name: "Готово" }));

      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.queryByRole("button", { name: /, закрыто$/ })).not.toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: /, скоро$/ })).not.toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Что такое бюджет?, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Покупки, открыто" })).toBeOnTheScreen();
    },
    30000,
  );
});
