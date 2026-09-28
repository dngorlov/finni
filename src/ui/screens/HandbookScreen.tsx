import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { TaskContent } from "../../core/tasks";
import { META_KEYS } from "../../data/metaKeys";
import { BackButton } from "../components/BackButton";
import { BottomSheet } from "../components/BottomSheet";
import { CoinText } from "../components/CoinText";
import { Pictogram, PixelIcon } from "../components/Pictogram";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenTitle } from "../components/ScreenTitle";
import { Screen } from "../components/Screen";
import { StatusStrip } from "../components/StatusStrip";
import type { PixelIconName } from "../pixelIconXml";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { homeStrings } from "../stringsHome";
import { handbookLessons, handbookSections, teachingCards } from "../tasks/handbook";
import { completedTaskIds, type TaskTopic } from "../tasks/model";
import { colors, minTarget, spacing, type } from "../theme";
import { TOPIC_TINT } from "../topicStyle";

type Tab = "words" | "lessons";

const TABS: { id: Tab; label: string; icon: PixelIconName }[] = [
  { id: "words", label: strings.tabWords, icon: "book-open" },
  { id: "lessons", label: strings.tabLessons, icon: "clipboard" },
];

/** Word tiles cycle through the warm palette so the grid reads as a game board. */
const TILE_FILLS = [colors.badgeFill, colors.fill, colors.highlight, colors.accent] as const;

/** 25% ink over the cream page, kept opaque so the tile lip never starts transparent. */
const TILE_LIP = "#C8C1BC";

const TOPIC_ICON: Record<TaskTopic, string> = {
  budget: strings.taskTopicBudgetIcon,
  savings: strings.taskTopicSavingsIcon,
  payments: strings.taskTopicPaymentsIcon,
};

function withPet(text: string, petName: string): string {
  return text.split("{pet}").join(petName);
}

/** Словарик: «Слова» and «Уроки» of finished Уроки. Демо-режим shows every one. */
export default function HandbookScreen() {
  const { game, meta, content } = useSession();
  const [tab, setTab] = useState<Tab>("words");
  const [openWordId, setOpenWordId] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [lessons, setLessons] = useState<TaskContent[]>([]);

  useFocusEffect(
    useCallback(() => {
      const profileId = meta.get(META_KEYS.activeProfileId);
      if (!profileId) return;
      const profile = game.getProfile(profileId);
      const progress = game.listTaskProgress(profileId);
      setPetName(profile.petName);
      setLessons(handbookLessons(content.tasks, completedTaskIds(progress), profile.isDemo));
    }, [content.tasks, game, meta]),
  );

  const sections = handbookSections(lessons);
  const openWord = sections.flatMap((section) => section.words).find((word) => word.id === openWordId) ?? null;
  const openLesson = lessons.find((task) => task.id === openLessonId) ?? null;

  function selectTab(next: Tab) {
    setTab(next);
    setOpenWordId(null);
    setOpenLessonId(null);
  }

  return (
    <Screen header={<StatusStrip />}>
      <BackButton />
      <ScreenTitle style={styles.title}>{strings.glossaryTitle}</ScreenTitle>
      <View style={styles.segments}>
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              role="button"
              aria-label={item.label}
              aria-selected={selected}
              onPress={() => selectTab(item.id)}
              style={[styles.segment, selected ? styles.segmentOn : null]}
            >
              <View style={[styles.segmentFace, selected ? styles.segmentFaceOn : null]}>
                <PixelIcon name={item.icon} color={selected ? colors.onRaised : colors.subtle} />
                <Text style={[styles.segmentLabel, selected ? styles.segmentLabelOn : null]}>
                  {item.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {tab === "words" ? (
        sections.length === 0 ? (
          <Text style={styles.hint}>{homeStrings.handbookEmptyWords}</Text>
        ) : (
          <>
            <Text style={styles.hint}>{homeStrings.handbookWordsHint}</Text>
            <View style={styles.sections}>
              {sections.map((section) => (
                <View key={section.id} style={styles.section}>
                  <Text role="heading" style={styles.sectionTitle}>
                    {section.title}
                  </Text>
                  <View style={styles.grid}>
                    {section.words.map((word, index) => (
                      <Pressable
                        key={word.id}
                        role="button"
                        aria-label={`${word.title}, ${section.title}`}
                        onPress={() => setOpenWordId(word.id)}
                        style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
                      >
                        <View style={[styles.tileFace, { backgroundColor: TILE_FILLS[index % TILE_FILLS.length] }]}>
                          <Text style={styles.tileLabel}>{word.title}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        )
      ) : lessons.length === 0 ? (
        <Text style={styles.hint}>{homeStrings.handbookEmptyLessons}</Text>
      ) : (
        <>
          <Text style={styles.hint}>{homeStrings.handbookLessonsHint}</Text>
          <View style={styles.lessonList}>
            {lessons.map((task) => (
              <Pressable
                key={task.id}
                role="button"
                aria-label={task.title}
                onPress={() => setOpenLessonId(task.id)}
                style={({ pressed }) => [styles.lessonRow, pressed ? styles.lessonRowPressed : null]}
              >
                <View style={[styles.lessonMark, { backgroundColor: TOPIC_TINT[task.topic] }]}>
                  <Pictogram glyph={TOPIC_ICON[task.topic]} size={18} />
                </View>
                <Text style={styles.lessonRowLabel}>{task.title}</Text>
                <PixelIcon name="arrow-right" size={16} color={colors.subtle} />
              </Pressable>
            ))}
          </View>
        </>
      )}
      <BottomSheet
        visible={openWord !== null}
        onClose={() => setOpenWordId(null)}
        footer={<PrimaryButton label={strings.gotIt} onPress={() => setOpenWordId(null)} />}
      >
        {openWord ? (
          <>
            <Text style={styles.sheetTerm}>{openWord.title}</Text>
            <CoinText text={withPet(openWord.text, petName)} style={styles.sheetDefinition} />
          </>
        ) : null}
      </BottomSheet>
      <BottomSheet
        visible={openLesson !== null}
        onClose={() => setOpenLessonId(null)}
        footer={<PrimaryButton label={strings.gotIt} onPress={() => setOpenLessonId(null)} />}
      >
        {openLesson ? (
          <>
            <Text style={styles.sheetTerm}>{openLesson.title}</Text>
            {teachingCards(openLesson).map((card) => (
              <View key={card.id} style={styles.lessonCard}>
                {card.title ? (
                  <CoinText text={withPet(card.title, petName)} style={styles.cardTitle} />
                ) : null}
                <CoinText text={withPet(card.text, petName)} style={styles.body} />
              </View>
            ))}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  segments: {
    backgroundColor: colors.track,
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.s,
    padding: 6,
  },
  segment: {
    backgroundColor: colors.track,
    borderRadius: 12,
    flex: 1,
    paddingBottom: 4,
  },
  segmentOn: {
    backgroundColor: colors.raisedEdge,
  },
  segmentFace: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "center",
    minHeight: 56,
  },
  segmentFaceOn: {
    backgroundColor: colors.raisedFace,
  },
  segmentLabel: {
    color: colors.subtle,
    fontSize: 18,
    fontWeight: "700",
  },
  segmentLabelOn: {
    color: colors.onRaised,
  },
  hint: {
    color: colors.subtle,
    fontSize: type.body,
  },
  sections: {
    gap: spacing.l,
  },
  section: {
    gap: spacing.s,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s + 4,
  },
  tile: {
    backgroundColor: TILE_LIP,
    borderRadius: 16,
    flexBasis: "46%",
    flexGrow: 1,
    minWidth: minTarget,
    paddingBottom: 5,
  },
  tilePressed: {
    paddingBottom: 0,
    paddingTop: 5,
  },
  tileFace: {
    alignItems: "center",
    borderRadius: 16,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 91,
    padding: spacing.m,
  },
  tileLabel: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "800",
    textAlign: "center",
  },
  lessonList: {
    gap: spacing.s,
  },
  lessonRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  lessonRowPressed: {
    opacity: 0.7,
  },
  lessonMark: {
    alignItems: "center",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  lessonRowLabel: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    fontWeight: "700",
  },
  lessonCard: {
    borderLeftColor: colors.track,
    borderLeftWidth: 4,
    gap: 4,
    paddingLeft: spacing.s + 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
    lineHeight: 22,
  },
  sheetTerm: {
    color: colors.accentText,
    fontSize: type.title,
    fontWeight: "800",
  },
  sheetDefinition: {
    color: colors.text,
    fontSize: type.section,
    lineHeight: 28,
  },
});
