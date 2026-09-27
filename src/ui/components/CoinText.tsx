import { Fragment } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { strings } from "../strings";
import { colors, type } from "../theme";
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
  /** This line is an amount even when it never says «монета». Ignored when there is no number. */
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
  const color = typeof flat?.color === "string" ? flat.color : colors.text;
  const size = typeof flat?.fontSize === "number" ? flat.fontSize : type.body;
  const spoken = labelled ? { accessible: true as const, accessibilityLabel: label ?? text } : {};
  // Flex belongs to the row. On each word it collapses the word to a zero-width
  // column, so «Разбор дня» becomes tall empty text and one coin icon.
  const wordStyle = withoutFlex(style);

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
      {words ? (
        parts.map((part, index) =>
          part.kind === "coin" ? (
            <Pictogram key={index} glyph={strings.balanceIcon} size={size} color={color} />
          ) : (
            <Fragment key={index}>{renderWords(part.value, wordStyle, index)}</Fragment>
          ),
        )
      ) : (
        <Text style={wordStyle}>{text}</Text>
      )}
      {!words && amountLine ? <Pictogram glyph={strings.balanceIcon} size={size} color={color} /> : null}
    </View>
  );
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

/** One text node per word so the row can wrap mid-sentence. */
function renderWords(value: string, style: StyleProp<TextStyle> | undefined, key: number) {
  return value.split(/(\s+)/).map((bit, index) =>
    bit.length === 0 ? null : (
      <Text key={`${key}-${index}`} style={style}>
        {bit}
      </Text>
    ),
  );
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
  oneLine: {
    flexWrap: "nowrap",
    overflow: "hidden",
  },
});
