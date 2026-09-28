import { Linking, StyleSheet, Text, View } from "react-native";
import { BackButton } from "../components/BackButton";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import {
  AI_MODELS,
  TEAM,
  DEV_TOOLS,
  EDUCATIONAL_CONTENT,
  FONTS,
  ICONS,
  IMAGES,
  REFERENCES,
  RUNTIME_LIBRARIES,
  type Credit,
  type LibraryCredit,
} from "../credits";
import { homeStrings } from "../stringsHome";
import { colors, screenTitleStyle, type } from "../theme";

const CREDIT_GROUPS: { title: string; items: readonly Credit[] }[] = [
  { title: homeStrings.creditsTeam, items: TEAM },
  { title: homeStrings.creditsAi, items: AI_MODELS },
  { title: homeStrings.creditsFonts, items: FONTS },
  { title: homeStrings.creditsIcons, items: ICONS },
  { title: homeStrings.creditsImages, items: IMAGES },
  { title: homeStrings.creditsReferences, items: REFERENCES },
  { title: homeStrings.creditsContent, items: EDUCATIONAL_CONTENT },
];

/** Об авторах и источниках, opened from the Настройки row. */
export default function CreditsScreen() {
  return (
    <Screen>
      <BackButton />
      <Text role="heading" style={[styles.title, screenTitleStyle(homeStrings.creditsTitle)]}>
        {homeStrings.creditsTitle}
      </Text>
      {CREDIT_GROUPS.slice(0, 1).map((group) => (
        <CreditGroup key={group.title} title={group.title} items={group.items} />
      ))}
      <LibraryGroup title={homeStrings.creditsLibraries} items={RUNTIME_LIBRARIES} />
      <LibraryGroup title={homeStrings.creditsDevTools} items={DEV_TOOLS} />
      {CREDIT_GROUPS.slice(1).map((group) => (
        <CreditGroup key={group.title} title={group.title} items={group.items} />
      ))}
    </Screen>
  );
}

function CreditGroup({ title, items }: { title: string; items: readonly Credit[] }) {
  return (
    <Card>
      <Text role="heading" style={styles.groupTitle}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={item.what} style={styles.row}>
          <Text style={styles.rowName}>{item.what}</Text>
          <Text style={styles.rowMeta}>{item.source}</Text>
          {item.links?.map((link) => (
            <Text
              key={link.url}
              role="link"
              style={styles.link}
              onPress={() => {
                void Linking.openURL(link.url);
              }}
            >
              {`${link.label}: ${link.url}`}
            </Text>
          ))}
        </View>
      ))}
    </Card>
  );
}

function LibraryGroup({ title, items }: { title: string; items: readonly LibraryCredit[] }) {
  return (
    <Card>
      <Text role="heading" style={styles.groupTitle}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={item.pkg} style={styles.row}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowMeta}>{homeStrings.creditsLibraryLine(item.version, item.license)}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  groupTitle: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    borderTopColor: colors.track,
    borderTopWidth: 1,
    gap: 2,
    paddingTop: 6,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  rowMeta: {
    color: colors.subtle,
    fontSize: 14,
  },
  link: {
    color: colors.accentText,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
