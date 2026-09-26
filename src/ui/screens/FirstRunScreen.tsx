import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View, type Role } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { IntroCardContent } from "../../data/content";
import { createLocalId } from "../../data/localId";
import { BeadSlider } from "../components/BeadSlider";
import { CoinText } from "../components/CoinText";
import { Pictogram } from "../components/Pictogram";
import { ScreenTitle } from "../components/ScreenTitle";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import type { RootStackParamList } from "../navigation/types";
import { COLOR_KEYS, SPECIES_KEYS, type ColorKey, type SpeciesKey } from "../pet/keys";
import { PetView } from "../pet/PetView";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "FirstRun">;
type Phase = "cards" | "pet" | "name";
type FirstRunDraft = {
  profileId: string;
  species: SpeciesKey;
  color: ColorKey;
  petName: string;
};

const TEXTBOX_ROLE = "textbox" as Role;
const NEW_PET_ACCESSORY = "a1";

export default function FirstRunScreen({ navigation }: Props) {
  const { content, firstRun } = useSession();
  const [phase, setPhase] = useState<Phase>("cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [draft, setDraft] = useState<FirstRunDraft>(() => ({
    profileId: createLocalId("profile"),
    species: "sp1",
    color: "c1",
    petName: "",
  }));
  const [petNameTouched, setPetNameTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "cards") {
        if (cardIndex === 0) return false;
        setCardIndex((current) => current - 1);
        return true;
      }
      if (phase === "pet") return false;
      setPhase("pet");
      return true;
    });
    return () => subscription.remove();
  }, [phase, cardIndex]);

  const completeFirstRun = () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      firstRun.complete({
        id: draft.profileId,
        name: draft.petName.trim(),
        petName: draft.petName.trim(),
        species: draft.species,
        color: draft.color,
        // Аксессуары open with Этап: a new Питомец starts without one.
        accessory: NEW_PET_ACCESSORY,
        contentVersion: content.contentVersion,
        goals: [],
      });
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch {
      setSaveError(strings.firstRunSaveFailed);
      setSaving(false);
    }
  };

  if (phase === "cards") {
    return (
      <OpeningCards
        cards={content.intro}
        index={cardIndex}
        onBack={() => {
          if (cardIndex === 0) BackHandler.exitApp();
          else setCardIndex((current) => current - 1);
        }}
        onNext={() => {
          if (cardIndex >= content.intro.length - 1) setPhase("pet");
          else setCardIndex((current) => current + 1);
        }}
      />
    );
  }

  if (phase === "pet") {
    return (
      <PetPhase
        draft={draft}
        onChange={(change) => setDraft((current) => ({ ...current, ...change }))}
        onNext={() => setPhase("name")}
      />
    );
  }

  return (
    <NamePhase
      draft={draft}
      petNameTouched={petNameTouched}
      error={saveError}
      busy={saving}
      onChange={(change) => setDraft((current) => ({ ...current, ...change }))}
      onPetNameBlur={() => setPetNameTouched(true)}
      onBack={() => setPhase("pet")}
      onNext={completeFirstRun}
    />
  );
}

function OpeningCards({
  cards,
  index,
  onBack,
  onNext,
}: {
  cards: IntroCardContent[];
  index: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const card = cards[index];
  if (!card) return null;
  const last = index >= cards.length - 1;
  const fraction = `${((index + 1) / cards.length) * 100}%` as const;

  return (
    <Screen
      header={
        <View style={styles.chrome}>
          <Pressable role="button" aria-label={strings.back} onPress={onBack} style={styles.back}>
            <Pictogram glyph={strings.backIcon} />
          </Pressable>
          <View accessibilityElementsHidden style={styles.track}>
            <View style={[styles.fill, { width: fraction }]} />
          </View>
          <Text style={styles.step}>{`${index + 1}/${cards.length}`}</Text>
        </View>
      }
      footer={<PrimaryButton label={last ? strings.done : strings.next} onPress={onNext} />}
    >
      <ScreenTitle style={styles.title}>{card.title}</ScreenTitle>
      <CoinText text={card.body} style={styles.body} />
    </Screen>
  );
}

function PetPhase({
  draft,
  onChange,
  onNext,
}: {
  draft: FirstRunDraft;
  onChange: (change: Partial<Pick<FirstRunDraft, "species" | "color">>) => void;
  onNext: () => void;
}) {
  return (
    <Screen footer={<PrimaryButton label={strings.next} onPress={onNext} />}>
      <ScreenTitle style={styles.title}>{strings.firstRunPet}</ScreenTitle>
      <PetView
        species={draft.species}
        color={draft.color}
        accessory={NEW_PET_ACCESSORY}
        pose="idle"
      />
      <View style={styles.sliders}>
        <BeadSlider
          legend={strings.speciesLegend}
          pictogram={strings.speciesPictogram}
          keys={SPECIES_KEYS}
          labelOf={strings.speciesName}
          value={draft.species}
          onChange={(species) => onChange({ species })}
        />
        <BeadSlider
          legend={strings.colorLegend}
          pictogram={strings.colorPictogram}
          keys={COLOR_KEYS}
          labelOf={strings.colorName}
          value={draft.color}
          onChange={(color) => onChange({ color })}
        />
      </View>
    </Screen>
  );
}

function blankIfWhitespace(value: string): string {
  return value.trim() === "" ? "" : value;
}

function NamePhase({
  draft,
  petNameTouched,
  error,
  busy,
  onChange,
  onPetNameBlur,
  onBack,
  onNext,
}: {
  draft: FirstRunDraft;
  petNameTouched: boolean;
  error: string | null;
  busy: boolean;
  onChange: (change: Partial<Pick<FirstRunDraft, "petName">>) => void;
  onPetNameBlur: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Screen
      keyboardShouldPersistTaps="handled"
      footer={
        <>
          <TextButton label={strings.back} onPress={onBack} />
          <PrimaryButton
            label={strings.next}
            disabled={!isValidName(draft.petName) || busy}
            onPress={onNext}
          />
        </>
      }
    >
      <View style={styles.petCluster}>
        <View style={styles.cloud}>
          <View style={styles.cloudCard}>
            <Text style={styles.body}>{strings.namePrompt}</Text>
            <View style={styles.chip}>
              <TextInput
                role={TEXTBOX_ROLE}
                aria-label={strings.namePrompt}
                placeholder={strings.nameBlank}
                placeholderTextColor={colors.subtle}
                value={blankIfWhitespace(draft.petName)}
                onChangeText={(petName) => onChange({ petName: blankIfWhitespace(petName) })}
                onBlur={onPetNameBlur}
                style={styles.chipInput}
              />
              <View pointerEvents="none" style={styles.pen}>
                <Pictogram glyph={strings.namePen} />
              </View>
            </View>
            <View
              pointerEvents="none"
              aria-hidden
              accessibilityElementsHidden
              style={styles.cloudTailSlot}
            >
              <View style={styles.cloudTail} />
            </View>
          </View>
        </View>
        <PetView
          species={draft.species}
          color={draft.color}
          accessory={NEW_PET_ACCESSORY}
          pose="idle"
        />
        {petNameTouched && !isValidName(draft.petName) ? (
          <Text style={styles.validation}>{strings.nameValidation}</Text>
        ) : null}
        {error ? (
          <Text role="alert" style={styles.validation}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function graphemeLength(value: string): number {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter("ru", { granularity: "grapheme" }).segment(value)).length;
  }
  return Array.from(value).length;
}

function isValidName(value: string): boolean {
  const length = graphemeLength(value.trim());
  return length >= 1 && length <= 20;
}

const styles = StyleSheet.create({
  chrome: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
  },
  track: {
    backgroundColor: colors.track,
    borderRadius: radius.card,
    flex: 1,
    height: spacing.s,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.fill,
    height: spacing.s,
  },
  step: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  back: {
    alignItems: "center",
    height: minTarget,
    justifyContent: "center",
    width: minTarget,
  },
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  petCluster: {
    alignItems: "center",
    alignSelf: "stretch",
    flexGrow: 1,
    gap: spacing.m,
    justifyContent: "center",
  },
  cloud: {
    alignItems: "center",
  },
  cloudCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.raisedEdge,
    borderRadius: radius.card,
    borderWidth: 3,
    flexDirection: "row",
    gap: spacing.s,
    padding: spacing.m,
  },
  cloudTailSlot: {
    alignItems: "center",
    bottom: -9,
    height: 14,
    left: 0,
    position: "absolute",
    right: 0,
  },
  cloudTail: {
    backgroundColor: colors.card,
    borderBottomColor: colors.raisedEdge,
    borderBottomWidth: 3,
    borderRightColor: colors.raisedEdge,
    borderRightWidth: 3,
    height: 14,
    transform: [{ rotate: "45deg" }],
    width: 14,
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    maxWidth: minTarget * 4 - spacing.l,
    minHeight: minTarget,
    minWidth: minTarget * 2 + spacing.l,
  },
  chipInput: {
    color: colors.text,
    fontSize: type.body,
    minHeight: minTarget,
    paddingLeft: spacing.s,
    paddingRight: minTarget,
    width: "100%",
  },
  pen: {
    fontSize: type.body,
    position: "absolute",
    right: spacing.s,
  },
  validation: {
    color: colors.text,
    fontSize: type.body,
    textAlign: "center",
  },
  sliders: {
    gap: spacing.l,
    paddingTop: spacing.s,
  },
});
