import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { writeAnimationsOn } from "../motion";
import { BackHandler } from "react-native";
import type { CatalogItem } from "../../core/economy";
import { META_KEYS } from "../../data/metaKeys";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

function buyGoal(ports: ReturnType<typeof createFakePorts>, item: CatalogItem) {
  const profileId = ports.meta.get(META_KEYS.activeProfileId)!;
  const day = ports.game.dayState(profileId);
  ports.game.applyTaskStep(profileId, day.dayId, {
    next: "exit",
    verdict: "good",
    explanation: "чек",
    effects: [{ coins: item.price }],
  });
  ports.game.setActiveGoal(profileId, item);
  const moved = ports.game.transferToSavings(profileId, day.dayId, item.price);
  if (moved.status !== "ok") throw new Error("Копилка не приняла сумму");
  const bought = ports.game.purchaseFromSavings(profileId, day.dayId, item);
  if (bought.status !== "ok") throw new Error("Цель не купилась");
}

const goal = (id: string, price: number): CatalogItem => ({
  id,
  kind: "optional",
  price,
  effect: { meter: "mood", delta: 12 },
  once: true,
});

describe("Этап на панели", () => {
  it("opens the tucked stage and hides it with Закрыть", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" }));
    expect(screen.getByRole("button", { name: "Закрыть" })).toBeOnTheScreen();
    expect(screen.getByText("Новичок")).toBeOnTheScreen();
    expect(screen.queryByText("1 из 3")).not.toBeOnTheScreen();
    expect(screen.getByText("Скейтборд")).toBeOnTheScreen();
    expect(screen.getByText("0 / 90")).toBeOnTheScreen();
    expect(screen.getByText("Пух")).toBeOnTheScreen();
    expect(screen.getByText("Финни")).toBeOnTheScreen();
    expect(screen.queryByText(/•/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дом" })).toBeSelected();
  });

  it("slides the open card back down instead of dropping it, and drops it at once with Анимация off", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);
    const stage = "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90";

    await user.press(screen.getByRole("button", { name: stage }));
    await user.press(screen.getByRole("button", { name: "Закрыть" }));
    // Still drawn while it slides, but out of reach for touch and the screen reader.
    expect(screen.getByTestId("stage-card-tucking", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: stage }),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.queryByTestId("stage-card-tucking", { includeHiddenElements: true })).not.toBeOnTheScreen(),
    );

    await act(async () => {
      writeAnimationsOn(ports.meta, false);
    });
    await user.press(screen.getByRole("button", { name: stage }));
    await user.press(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByTestId("stage-card-tucking", { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it("tucks from the dim layer and leaves Настройки unopened", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" }));
    expect(screen.queryByRole("button", { name: "Настройки" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дом" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Закрыть окно" }));
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Настройки" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дом" })).toBeSelected();
  });

  it("tucks when a tab is pressed, including the current one", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" }));
    await user.press(screen.getByRole("button", { name: "Дом" }));
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Дом" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Магазин" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" }));
    await user.press(screen.getByRole("button", { name: "Карта" }));
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" })).toBeOnTheScreen();
  });

  it("tucks on Android back and stays on the same tab", async () => {
    type BackPress = (event?: unknown) => boolean | null | undefined;
    const handlers: BackPress[] = [];
    const add = jest.spyOn(BackHandler, "addEventListener").mockImplementation((event, handler) => {
      if (event !== "hardwareBackPress") return { remove: () => undefined };
      const press = handler as (event?: unknown) => boolean | null | undefined;
      handlers.push(press);
      return {
        remove: () => {
          const index = handlers.indexOf(press);
          if (index !== -1) handlers.splice(index, 1);
        },
      };
    });
    const exit = jest.spyOn(BackHandler, "exitApp").mockImplementation(() => undefined);
    try {
      const ports = createFakePorts();
      seedReturningChild(ports);
      const { user } = await renderApp(ports);

      await user.press(screen.getByRole("button", { name: "Карта" }));
      await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" }));
      await act(() => {
        for (let index = handlers.length - 1; index >= 0; index -= 1) {
          if (handlers[index]()) return;
        }
      });

      expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
      expect(exit).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Карта" })).toBeSelected();
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
    } finally {
      add.mockRestore();
      exit.mockRestore();
    }
  });

  it("hides the stage off the play shell and shows it tucked on return", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Итоги" }));
    expect(screen.queryByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Цель: Скейтборд, 0 из 90" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
  });

  it("shows the new stage title tucked after the Цель is bought", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    buyGoal(ports, goal("skateboard", 90));
    const { user } = await renderApp(ports);

    expect(screen.getByRole("button", { name: "Этап 2 из 3, Про" })).toBeOnTheScreen();
    expect(screen.queryByText("Выбери цель")).not.toBeOnTheScreen();
    expect(screen.getByText("Про")).toBeOnTheScreen();
    expect(screen.getByText("Пух")).toBeOnTheScreen();
    expect(screen.getByText("Финни")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
    expect(screen.queryByText("Теперь ты Про!")).not.toBeOnTheScreen();

    buyGoal(ports, goal("art-set", 120));
    await user.press(screen.getByRole("button", { name: "Настройки" }));
    await user.press(screen.getByRole("button", { name: "Назад" }));

    expect(screen.getByRole("button", { name: "Этап 3 из 3, Миллионер" })).toBeOnTheScreen();
    expect(screen.queryByText("Выбери цель")).not.toBeOnTheScreen();
    expect(screen.getByText("Миллионер")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закрыть" })).not.toBeOnTheScreen();
  });

  it("lists the stage typefaces under Шрифты", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    await user.press(screen.getByRole("button", { name: "Об авторах и источниках" }));
    expect(screen.getByText("Шрифты")).toBeOnTheScreen();
    expect(screen.getByText("Nunito")).toBeOnTheScreen();
    expect(screen.getByText("Unbounded")).toBeOnTheScreen();
    expect(screen.getByText("Cormorant Garamond")).toBeOnTheScreen();
  });
});
