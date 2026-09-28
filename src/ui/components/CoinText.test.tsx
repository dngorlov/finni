import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { CoinText, coinGap, coinSize, coinTokens, splitMoney } from "./CoinText";

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

/** Tokens as a readable line: an amount is «[number·🪙tail]», a standalone coin «[🪙]». */
function laid(text: string, coin = false): string {
  return coinTokens(text, coin)
    .map((token) => (token.kind === "text" ? token.value : `[${token.number}${token.number ? "·" : ""}🪙${token.tail}]`))
    .join("");
}

describe("coinTokens", () => {
  it("puts the coin right after the number, with punctuation after the coin", () => {
    expect(laid("12 монет?")).toBe("[12·🪙?]");
    expect(laid("Первые 100 монет")).toBe("Первые [100·🪙]");
    expect(laid("+5 монет.")).toBe("[+5·🪙.]");
    expect(laid("Сэкономил 5 монет!")).toBe("Сэкономил [5·🪙!]");
    expect(laid("В копилке станет 40 монет. Мечта отодвинется на 3 дн.")).toBe(
      "В копилке станет [40·🪙.] Мечта отодвинется на 3 дн.",
    );
  });

  it("handles every plural of «монета»", () => {
    expect(laid("1 монета")).toBe("[1·🪙]");
    expect(laid("2 монеты")).toBe("[2·🪙]");
    expect(laid("5 монет")).toBe("[5·🪙]");
  });

  it("marks each amount in a sentence", () => {
    expect(laid("Было 10 монет, стало 25 монет.")).toBe("Было [10·🪙,] стало [25·🪙.]");
  });

  it("keeps «монет» without a number as a word", () => {
    expect(laid("Новых монет нет.")).toBe("Новых монет нет.");
  });

  it("moves a coin written before its number to the number's right", () => {
    expect(laid("монет 12")).toBe("[12·🪙]");
    expect(laid("🪙 7!")).toBe("[7·🪙!]");
  });

  it("treats the emoji like the word", () => {
    expect(laid("12 🪙?")).toBe("[12·🪙?]");
    expect(laid("получи 🪙")).toBe("получи [🪙]");
  });

  it("puts a coin-line icon after the last number, before its punctuation", () => {
    expect(laid("Купить Мороженое за 12?", true)).toBe("Купить Мороженое за [12·🪙?]");
    expect(laid("За лучший ответ можно получить ещё 7", true)).toBe("За лучший ответ можно получить ещё [7·🪙]");
    expect(laid("Цель станет Самокат. В копилке останется 40.", true)).toBe(
      "Цель станет Самокат. В копилке останется [40·🪙.]",
    );
  });

  it("sizes the coin and the gap from the font", () => {
    expect(coinSize({ fontSize: 16 })).toBe(14);
    expect(coinSize(undefined)).toBe(14);
    expect(coinSize({ fontSize: 8 })).toBe(12);
    expect(coinGap(14)).toBe(4);
    expect(coinGap(12)).toBe(3);
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
    expect(screen.getByText("получить")).toBeOnTheScreen();
    expect(screen.getByText("7")).toBeOnTheScreen();
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

  it("keeps the number, the coin, and the question mark in one unit", async () => {
    await render(<CoinText coin text="Купить Мороженое за 12?" />);
    const number = screen.getByText("12");
    const mark = screen.getByText("?");
    expect(number.parent).toBe(mark.parent);
    expect(StyleSheet.flatten(number.parent?.props.style)).toMatchObject({ flexDirection: "row", flexWrap: "nowrap" });
  });
});
