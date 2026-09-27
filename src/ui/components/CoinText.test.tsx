import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { CoinText, splitMoney } from "./CoinText";

function kinds(text: string): string {
  return splitMoney(text)
    .map((part) => (part.kind === "coin" ? "🪙" : part.value))
    .join("");
}

describe("splitMoney", () => {
  it("spells a money word that is not next to a number", () => {
    expect(kinds("Потому что ты положил монеты в копилку.")).toBe("Потому что ты положил монеты в копилку.");
    expect(kinds("В «Деньгах» можно разделить монеты на сегодня.")).toBe(
      "В «Деньгах» можно разделить монеты на сегодня.",
    );
    expect(kinds("Ты собрал все монеты за это задание")).toBe("Ты собрал все монеты за это задание");
    expect(kinds("Новых монет нет — это не лучше прошлого результата.")).toBe(
      "Новых монет нет — это не лучше прошлого результата.",
    );
  });

  it("draws the icon when the word sits next to a number", () => {
    expect(kinds("12 монет")).toBe("12 🪙");
    expect(kinds("Награда: до 30 монет")).toBe("Награда: до 30 🪙");
    expect(kinds("Лучший результат: 23 из 30 монет")).toBe("Лучший результат: 23 из 30 🪙");
    expect(kinds("+10 монет")).toBe("+10 🪙");
    expect(kinds("20 монет уйдут в день 5.")).toBe("20 🪙 уйдут в день 5.");
    expect(kinds("В копилке станет 40 монет. Мечта отодвинется на 3 дн.")).toBe(
      "В копилке станет 40 🪙. Мечта отодвинется на 3 дн.",
    );
    expect(kinds("Сэкономил 5 монет!")).toBe("Сэкономил 5 🪙!");
  });

  it("keeps a written coin emoji as the icon", () => {
    expect(kinds("получи 🪙")).toBe("получи 🪙");
  });
});

describe("CoinText", () => {
  it("shows the written word in a sentence", async () => {
    await render(<CoinText text="Потому что ты положил монеты в копилку." />);
    expect(screen.getByText("Потому что ты положил монеты в копилку.")).toBeOnTheScreen();
  });

  it("hides the word beside an amount and keeps it for the screen reader", async () => {
    await render(<CoinText text="после покупки: 88 монет" />);
    expect(screen.getByLabelText("после покупки: 88 монет")).toBeOnTheScreen();
    expect(screen.queryByText("монет")).not.toBeOnTheScreen();
    expect(screen.getByText("88")).toBeOnTheScreen();
  });

  it("adds the icon after a bare amount", async () => {
    await render(<CoinText coin text="За лучший ответ можно получить ещё 7" />);
    expect(screen.getByLabelText("За лучший ответ можно получить ещё 7")).toBeOnTheScreen();
    expect(screen.getByText("За лучший ответ можно получить ещё 7")).toBeOnTheScreen();
  });

  it("spells the word when a coin line has no number", async () => {
    await render(<CoinText coin text="Ты собрал все монеты за это задание" />);
    expect(screen.getByText("Ты собрал все монеты за это задание")).toBeOnTheScreen();
  });

  it("keeps a flexed amount sentence as words beside the icon", async () => {
    await render(
      <CoinText
        coin
        labelled={false}
        text="Ты отложил 10 монет в Копилку."
        style={{ flex: 1, fontSize: 16, lineHeight: 22 }}
      />,
    );

    const word = screen.getByText("отложил");
    expect(word).toBeOnTheScreen();
    expect(screen.getByText("10")).toBeOnTheScreen();
    expect(screen.queryByText("монет")).not.toBeOnTheScreen();
    expect(StyleSheet.flatten(word.props.style).flex).toBeUndefined();
    expect(StyleSheet.flatten(word.parent?.props.style).flex).toBe(1);
  });
});
