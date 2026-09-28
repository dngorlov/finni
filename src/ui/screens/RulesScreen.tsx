import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BackButton } from "../components/BackButton";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { buildRuleSections, type RuleLine } from "../rules";
import { useSession } from "../session/SessionProvider";
import { rulesStrings } from "../stringsRules";
import { colors, radius, screenTitleStyle, spacing, type } from "../theme";

/** «Как всё считается», opened from the Настройки row: every formula, numbers from the code. */
export default function RulesScreen() {
  const { content } = useSession();
  const sections = useMemo(() => buildRuleSections(content), [content]);
  return (
    <Screen>
      <BackButton />
      <Text role="heading" style={[styles.title, screenTitleStyle(rulesStrings.title)]}>
        {rulesStrings.title}
      </Text>
      <Text style={styles.intro}>{rulesStrings.intro}</Text>
      {sections.map((section) => (
        <Card key={section.title}>
          <Text role="heading" style={styles.groupTitle}>
            {section.title}
          </Text>
          {section.lines.map((line, index) => (
            <Line key={`${index}-${line.text}`} line={line} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function Line({ line }: { line: RuleLine }) {
  if (line.kind === "formula") {
    return (
      <View style={styles.formula}>
        <Text style={styles.formulaText}>{line.text}</Text>
      </View>
    );
  }
  if (line.kind === "item") {
    return (
      <View style={styles.itemRow}>
        <Text aria-hidden style={styles.bullet}>
          •
        </Text>
        <Text style={styles.body}>{line.text}</Text>
      </View>
    );
  }
  return <Text style={line.kind === "example" ? styles.example : styles.body}>{line.text}</Text>;
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  intro: {
    color: colors.subtle,
    fontSize: type.body,
  },
  groupTitle: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    flexShrink: 1,
    fontSize: type.body,
  },
  example: {
    color: colors.subtle,
    fontSize: type.body,
    fontStyle: "italic",
  },
  formula: {
    backgroundColor: colors.track,
    borderRadius: radius.card,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  formulaText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    gap: spacing.s,
  },
  bullet: {
    color: colors.accentText,
    fontSize: type.body,
    fontWeight: "700",
  },
});
