import { render, screen, userEvent } from "@testing-library/react-native";
import type { DailyRewardCell } from "../../core/dailyReward";
import { FinPetApp } from "../FinPetApp";
import { DailyRewardCalendar } from "../screens/DailyRewardSheet";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const ROUND: DailyRewardCell[] = [
  { day: 1, coins: 5, status: "claimed" },
  { day: 2, coins: 5, status: "claimed" },
  { day: 3, coins: 10, status: "current" },
  { day: 4, coins: 10, status: "locked" },
  { day: 5, coins: 15, status: "locked" },
  { day: 6, coins: 15, status: "locked" },
  { day: 7, coins: 20, status: "locked" },
];

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("Ежедневный подарок", () => {
  it("ticks earlier steps, highlights only the current gift, and locks the rest", async () => {
    const user = userEvent.setup();
    const onClaim = jest.fn();
    await render(<DailyRewardCalendar cells={ROUND} onClose={() => {}} onClaim={onClaim} />);

    expect(screen.getByText("Подарки")).toBeOnTheScreen();
    expect(screen.getByText("Один подарок в день. Пропущенный день не сбрасывает.")).toBeOnTheScreen();
    const current = screen.getByRole("button", { name: "Забрать подарок, 10 монет" });
    expect(current).toBeSelected();
    expect(screen.getAllByText("10")).toHaveLength(1);
    expect(screen.queryByText("15")).not.toBeOnTheScreen();
    expect(screen.queryByText("20")).not.toBeOnTheScreen();
    expect(screen.getByLabelText("День 1, уже получен")).toBeOnTheScreen();
    expect(screen.getByLabelText("День 2, уже получен")).toBeOnTheScreen();
    expect(screen.getByLabelText("День 4, закрыт")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "День 4, закрыт" })).not.toBeOnTheScreen();

    await user.press(current);
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it("shows Подарок on Дом, pays it once, and hides the button", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    expect(screen.getByRole("button", { name: "Магазин" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Итоги" })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подарок" }));
    expect(screen.getByRole("button", { name: "Забрать подарок, 5 монет" })).toBeSelected();
    expect(screen.getByLabelText("День 2, закрыт")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Забрать подарок, 5 монет" }));
    expect(screen.getByText("Вот твой подарок")).toBeOnTheScreen();
    expect(screen.getByLabelText("Тебе 5 монет")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Подарок" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText("Тебе 5 монет")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Подарок" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Баланс 105" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Магазин" })).toBeOnTheScreen();
  });

  it("keeps Подарок when the calendar is closed without taking the gift", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Подарок" }));
    await user.press(screen.getByRole("button", { name: "Закрыть окно" }));
    expect(screen.queryByText("Подарки")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подарок" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Баланс 100" })).toBeOnTheScreen();
  });
});
