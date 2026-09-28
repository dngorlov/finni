import type { StyleProp, TextStyle } from "react-native";
import { screenTitleStyle } from "../theme";
import { CoinText } from "./CoinText";

/** Screen heading. Most titles use the pixel face; a few long lines stay the phone font. */
export function ScreenTitle({
  children,
  style,
  numberOfLines,
  plain,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Phone font. Tutorial titles are too long for the pixel face. */
  plain?: boolean;
}) {
  return (
    <CoinText
      text={children}
      numberOfLines={numberOfLines}
      style={plain ? style : [style, screenTitleStyle(children)]}
    />
  );
}
