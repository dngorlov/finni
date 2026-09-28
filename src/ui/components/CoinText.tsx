import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { strings } from "../strings";
import { font as fonts, type } from "../theme";
import { Pictogram } from "./Pictogram";

/**
 * «монета» / «деньги» and the coin emoji, as a whole word.
 * Cyrillic is not a JS word character, so the edges are letter lookarounds.
 */
const MONEY_WORD =
  /(?<![A-Za-zА-Яа-яЁё])(?:🪙|монет(?:ами|ах|ам|ой|ою|у|е|ы|а)?|деньг(?:ами|ах|ам|ой|ою|у|е|и)?|денег)(?![A-Za-zА-Яа-яЁё])/gi;

type Part = { kind: "text"; value: string } | { kind: "coin" };

/** The word labels an amount («12 монет», «монет 12»), not a sentence about coins. */
function besideAmount(text: string, start: number, end: number): boolean {
  return /\d[\s\u00A0]*$/.test(text.slice(0, start)) || /^[\s\u00A0]*\d/.test(text.slice(end));
}

export function splitMoney(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(MONEY_WORD)) {
    const index = match.index ?? 0;
    const raw = match[0];
    if (index > last) parts.push({ kind: "text", value: text.slice(last, index) });
    // The emoji is already a coin mark. A word becomes one only next to a number.
    const icon = raw.includes("🪙") || besideAmount(text, index, index + raw.length);
    parts.push(icon ? { kind: "coin" } : { kind: "text", value: raw });
    last = index + raw.length;
  }
  if (last < text.length || parts.length === 0) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

/** A piece of a line: a word, the space between words, or an amount with its coin. */
export type CoinToken =
  | { kind: "text"; value: string }
  | { kind: "amount"; number: string; tail: string };

type Piece = { kind: "word" | "space"; value: string } | { kind: "coin" };

const DIGIT_END = /\d$/;
/** The number at the start of a word: «12», «+5», «−3», «(40». */
const LEADING_NUMBER = /^([^\s\dA-Za-zА-Яа-яЁё]{0,2}\d+)(.*)$/;
/** Punctuation right after the coin («12 🪙?», «40 🪙.»). */
const LEADING_PUNCT = /^([^\sA-Za-zА-Яа-яЁё\d«]+)(.*)$/;
/** The last amount in a word, with what trails it («12?» → «12» + «?»). */
const LAST_NUMBER = /^(.*\d)(\D*)$/;

function pieces(parts: readonly Part[]): Piece[] {
  const out: Piece[] = [];
  for (const part of parts) {
    if (part.kind === "coin") {
      out.push({ kind: "coin" });
      continue;
    }
    for (const bit of part.value.split(/([\s\u00A0]+)/)) {
      if (bit.length === 0) continue;
      out.push({ kind: /^[\s\u00A0]+$/.test(bit) ? "space" : "word", value: bit });
    }
  }
  return out;
}

/**
 * Lays a line out as words and amounts. Every coin sits right after its number
 * («100 🪙», «+5 🪙», «12 🪙?»), whatever order the sentence wrote them in.
 * With `coin`, a line that never says «монета» gets the coin after its last number.
 */
export function coinTokens(text: string, coin = false): CoinToken[] {
  const list = pieces(splitMoney(text));
  const hasCoin = list.some((piece) => piece.kind === "coin");
  const tokens: CoinToken[] = [];

  const takeTail = (from: number): [string, number] => {
    const next = list[from];
    if (next?.kind !== "word") return ["", from];
    const match = LEADING_PUNCT.exec(next.value);
    if (!match) return ["", from];
    const rest = match[2] ?? "";
    if (rest.length > 0) {
      list[from] = { kind: "word", value: rest };
      return [match[1] ?? "", from];
    }
    return [match[1] ?? "", from + 1];
  };

  for (let i = 0; i < list.length; i += 1) {
    const piece = list[i]!;
    if (piece.kind !== "coin") {
      // «ещё 7» on a coin line: the last number carries the coin.
      if (!hasCoin && coin && piece.kind === "word" && i === lastNumberWord(list)) {
        const match = LAST_NUMBER.exec(piece.value);
        tokens.push({ kind: "amount", number: match?.[1] ?? piece.value, tail: match?.[2] ?? "" });
        continue;
      }
      tokens.push({ kind: "text", value: piece.value });
      continue;
    }
    // Number before the coin: «30 монет» → fold the word (and the space) into the amount.
    const prevToken = tokens.at(-1);
    const beforeSpace = prevToken?.kind === "text" && /^[\s\u00A0]+$/.test(prevToken.value);
    const numberToken = beforeSpace ? tokens.at(-2) : prevToken;
    if (numberToken?.kind === "text" && DIGIT_END.test(numberToken.value)) {
      if (beforeSpace) tokens.pop();
      tokens.pop();
      const [tail, next] = takeTail(i + 1);
      tokens.push({ kind: "amount", number: numberToken.value, tail });
      i = next - 1;
      continue;
    }
    // Number after the coin: «монет 12» → «12 🪙».
    const after = list[i + 1]?.kind === "space" ? i + 2 : i + 1;
    const afterPiece = list[after];
    const lead = afterPiece?.kind === "word" ? LEADING_NUMBER.exec(afterPiece.value) : null;
    if (lead) {
      tokens.push({ kind: "amount", number: lead[1] ?? "", tail: lead[2] ?? "" });
      i = after;
      continue;
    }
    const [tail, next] = takeTail(i + 1);
    tokens.push({ kind: "amount", number: "", tail });
    i = next - 1;
  }
  return tokens;
}

function lastNumberWord(list: readonly Piece[]): number {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const piece = list[i]!;
    if (piece.kind === "word" && /\d/.test(piece.value)) return i;
  }
  return -1;
}

function hasCoinWord(parts: readonly Part[]): boolean {
  return parts.some((part) => part.kind === "coin");
}

function mentionsMoney(text: string): boolean {
  return new RegExp(MONEY_WORD.source, "i").test(text);
}

/**
 * Draws the coin icon where an amount is shown («12 монет», «ещё 7»).
 * A money word in a sentence stays written («положил монеты в копилку»).
 * The spoken label keeps «монеты» / «деньги» for the screen reader.
 * The coin always sits right of its number with one fixed gap, and the number,
 * the coin, and the punctuation after it never wrap apart.
 */
export function CoinText({
  text,
  style,
  labelled = true,
  coin = false,
  inline = false,
  label,
  numberOfLines,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Expose the original sentence to the screen reader. Off inside a control that already has a name. */
  labelled?: boolean;
  /** This line is an amount even when it never says «монета»: the coin goes after its last number. */
  coin?: boolean;
  /** Sit in a row (a button label) instead of stretching to the full line. */
  inline?: boolean;
  /** Spoken name when it should differ from the visible sentence. */
  label?: string;
  numberOfLines?: number;
}) {
  const parts = splitMoney(text);
  const words = hasCoinWord(parts);
  const amountLine = coin && /\d/.test(text);
  if (!words && !amountLine) {
    // A spelled «монеты» / «деньги» stays one sentence for the screen reader.
    if (!labelled || !mentionsMoney(text)) {
      return (
        <Text style={style} numberOfLines={numberOfLines}>
          {text}
        </Text>
      );
    }
    return (
      <Text style={style} numberOfLines={numberOfLines} accessibilityLabel={label ?? text}>
        {text}
      </Text>
    );
  }

  const flat = StyleSheet.flatten(style);
  const size = coinSize(flat);
  const spoken = labelled ? { accessible: true as const, accessibilityLabel: label ?? text } : {};
  // Flex belongs to the row. On each word it collapses the word to a zero-width
  // column, so «Разбор дня» becomes tall empty text and one coin icon.
  const wordStyle = withoutFlex(style);
  const lineHeight = typeof flat?.lineHeight === "number" ? flat.lineHeight : undefined;

  return (
    <View
      {...spoken}
      style={[
        styles.line,
        inline ? styles.inline : styles.block,
        flexLayout(style),
        numberOfLines === 1 ? styles.oneLine : null,
      ]}
    >
      {coinTokens(text, coin).map((token, index) =>
        token.kind === "text" ? (
          <Text key={index} style={wordStyle}>
            {token.value}
          </Text>
        ) : (
          <View key={index} style={[styles.amount, lineHeight ? { minHeight: lineHeight } : null]}>
            {token.number ? <Text style={wordStyle}>{token.number}</Text> : null}
            <View style={token.number ? { marginLeft: coinGap(size) } : null}>
              <Pictogram glyph={strings.balanceIcon} size={size} />
            </View>
            {token.tail ? <Text style={wordStyle}>{token.tail}</Text> : null}
          </View>
        ),
      )}
    </View>
  );
}

/**
 * A number drawn by hand with the coin on its right («100 🪙»): the same gap and
 * coin size as CoinText. Decorative; the control around it carries the label.
 */
export function CoinAmount({
  value,
  style,
  size,
  hidden,
}: {
  value: number | string;
  /** Hide from the screen reader when the control around it already says the amount. */
  hidden?: boolean;
  style?: StyleProp<TextStyle>;
  /** Coin size when it should differ from the digits (a hero number). */
  size?: number;
}) {
  const flat = StyleSheet.flatten(style);
  const coinPx = size ?? coinSize(flat);
  const text = String(value);
  return (
    <View aria-hidden={hidden} style={[styles.amount, styles.amountFixed]}>
      {/* One line that never shrinks: Android measured the wide pixel digits short and cut «107» to «1». */}
      <Text numberOfLines={1} style={[style, styles.amountFixed, { minWidth: pixelTextWidth(text, flat) }]}>
        {text}
      </Text>
      <View style={{ marginLeft: coinGap(coinPx) }}>
        <Pictogram glyph={strings.balanceIcon} size={coinPx} />
      </View>
    </View>
  );
}

/**
 * Press Start 2P is monospaced at exactly 1 em per glyph, so a pixel-font line is
 * never narrower than its length × font size. Other fonts: no floor.
 */
export function pixelTextWidth(text: string, flat: TextStyle | undefined): number | undefined {
  if (flat?.fontFamily !== fonts.pixel) return undefined;
  const size = typeof flat.fontSize === "number" ? flat.fontSize : type.body;
  const spacing = typeof flat.letterSpacing === "number" ? flat.letterSpacing : 0;
  return Math.ceil(text.length * (size + spacing));
}

/** The coin is as tall as the digits: a touch under the font size, never under 12. */
export function coinSize(flat: TextStyle | undefined): number {
  const font = typeof flat?.fontSize === "number" ? flat.fontSize : type.body;
  return Math.max(12, Math.round(font * 0.9));
}

/** One gap for every amount: a quarter of the coin, at least 3 px. */
export function coinGap(size: number): number {
  return Math.max(3, Math.round(size / 4));
}

function flexLayout(style: StyleProp<TextStyle> | undefined): TextStyle | undefined {
  const flat = StyleSheet.flatten(style);
  if (!flat) return undefined;
  const layout: TextStyle = {};
  if (flat.flex != null) layout.flex = flat.flex;
  if (flat.flexGrow != null) layout.flexGrow = flat.flexGrow;
  if (flat.flexShrink != null) layout.flexShrink = flat.flexShrink;
  if (flat.flexBasis != null) layout.flexBasis = flat.flexBasis;
  return Object.keys(layout).length > 0 ? layout : undefined;
}

function withoutFlex(style: StyleProp<TextStyle> | undefined): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  const next: TextStyle = { ...flat };
  delete next.flex;
  delete next.flexGrow;
  delete next.flexShrink;
  delete next.flexBasis;
  return next;
}

const styles = StyleSheet.create({
  line: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  block: {
    alignSelf: "stretch",
  },
  inline: {
    flexGrow: 1,
    flexShrink: 1,
  },
  /** Number, coin, and trailing punctuation: one unit that never wraps apart. */
  amount: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  amountFixed: {
    flexShrink: 0,
  },
  oneLine: {
    flexWrap: "nowrap",
    overflow: "hidden",
  },
});
