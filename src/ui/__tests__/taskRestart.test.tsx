import { render, screen, userEvent } from "@testing-library/react-native";
import type { TaskStepResult } from "../../core/tasks";
import { FinPetApp } from "../FinPetApp";
import { withoutSceneCoins } from "../screens/TaskRunScreen";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

type User = ReturnType<typeof userEvent.setup>;

async function openShopGame(): Promise<User> {
  const ports = createFakePorts();
  const profileId = seedReturningChild(ports);
  const day = ports.game.dayState(profileId);
  ports.game.claimTaskReward(profileId, day.dayId, "payments_shop", 35);
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  await user.press(screen.getByRole("button", { name: "Карта" }));
  await user.press(screen.getByRole("button", { name: "Мини-игры" }));
  await user.press(screen.getByRole("button", { name: "Играть: Скидка или ловушка" }));
  await user.press(screen.getByRole("button", { name: "Начать" }));
  return user;
}

/** Clears round 1 whichever answer is right this visit. */
async function clearRound(user: User) {
  await user.press(screen.getByRole("button", { name: "Купить" }));
  if (screen.queryByRole("button", { name: "Попробовать ещё" })) {
    await user.press(screen.getByRole("button", { name: "Попробовать ещё" }));
    await user.press(screen.getByRole("button", { name: "Пройти мимо" }));
  }
  await user.press(screen.getByRole("button", { name: "Дальше" }));
}

describe("Начать заново", () => {
  it("asks first, then restarts the mini-game from round 1 with a clean score and purse", async () => {
    const user = await openShopGame();
    await clearRound(user);
    expect(screen.getByText("Раунд 2 из 3")).toBeOnTheScreen();
    expect(screen.getByText("Верно: 1")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Начать заново" }));
    expect(screen.getByText("Начать заново?")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Продолжить" }));
    expect(screen.queryByText("Начать заново?")).not.toBeOnTheScreen();
    expect(screen.getByText("Раунд 2 из 3")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Начать заново" }));
    await user.press(screen.getByRole("button", { name: "Да, начать заново" }));
    expect(screen.queryByText("Начать заново?")).not.toBeOnTheScreen();
    // Back on the game's first node: its intro card.
    await user.press(screen.getByRole("button", { name: "Начать" }));
    expect(screen.getByText("Раунд 1 из 3")).toBeOnTheScreen();
    expect(screen.getByText("Верно: 0")).toBeOnTheScreen();
    expect(screen.getByText("Сэкономлено: 0 монет")).toBeOnTheScreen();
  }, 20000);

  it("keeps a scene's lesson and meters but drops coins it already paid", () => {
    const step = {
      verdict: "good",
      explanation: "Сдача верная.",
      effects: [{ coins: 5 }, { meter: "mood", delta: 3 }],
      next: "exit",
    } as TaskStepResult;
    const again = withoutSceneCoins(step);
    expect(again.explanation).toBe("Сдача верная.");
    expect(again.effects.some((effect) => effect.coins)).toBe(false);
    expect(again.effects).toContainEqual({ meter: "mood", delta: 3 });
  });
});
