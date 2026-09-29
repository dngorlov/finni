import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { PIXEL_ICON_XML, type PixelIconName } from "../pixelIconXml";
import { colors, spacing } from "../theme";
import { PixelSprite, type SpriteName } from "./PixelSprite";

/** Outline names drawn as coloured pixel sprites in design/icons. */
const SPRITE_ICON: Partial<Record<PixelIconName, SpriteName>> = {
  check: "check",
  lock: "locked",
  "shopping-cart": "shop",
  clipboard: "task",
};

/** Emoji (variation selectors stripped) that have a free pixelarticons outline. */
const GLYPH_ICON: Record<string, PixelIconName> = {
  "←": "arrow-left",
  "☀": "sun",
  "☺": "smile",
  "!": "square-alert",
  "⚙": "gear",
  "⏳": "hourglass",
  "✏": "pencil",
  "✓": "check",
  "✅": "check",
  "⚠": "warning-diamond",
  "🎯": "target",
  "🎨": "colors-swatch",
  "🎉": "party-popper",
  "👤": "user",
  "📚": "book-open",
  "📋": "clipboard",
  "🔒": "lock",
  "🛒": "shopping-cart",
};

const hidden = {
  "aria-hidden": true as const,
  accessibilityElementsHidden: true as const,
  importantForAccessibility: "no-hide-descendants" as const,
};

export function Pictogram({ glyph, size = 24, color = colors.text }: { glyph: string; size?: number; color?: string }) {
  const bare = glyph.replace(/\uFE0F/g, "");
  if (bare === "🪙") return <PixelSprite name="coin" size={size} />;
  if (bare === "🐷") return <PixelSprite name="pig" size={size} />;
  if (bare === "🏦") return;
  const name = GLYPH_ICON[bare];
  if (!name) {
    return (
      <Text {...hidden} style={{ color, fontSize: size }}>
        {glyph}
      </Text>
    );
  }
  return <PixelIcon name={name} size={size} color={color} />;
}

export function PixelIcon({
  name,
  size = 24,
  color = colors.text,
}: {
  name: PixelIconName;
  size?: number;
  color?: string;
}) {
  const sprite = SPRITE_ICON[name];
  if (sprite) return <PixelSprite name={sprite} size={size} />;
  return (
    <View {...hidden}>
      <SvgXml xml={PIXEL_ICON_XML[name].replaceAll("currentColor", color)} width={size} height={size} />
    </View>
  );
}

/** A decoration glyph beside a word. The word stays the readable text. */
export function GlyphLabel({
  glyph,
  label,
  labelStyle,
  size = 24,
  color,
}: {
  glyph: string;
  label: string;
  labelStyle: StyleProp<TextStyle>;
  size?: number;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <Pictogram glyph={glyph} size={size} color={color} />
      <Text style={labelStyle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
});
