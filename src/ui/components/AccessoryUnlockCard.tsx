import { StyleSheet, Text, View } from "react-native";
import type { Stage } from "../../core/stages";
import { PetView } from "../pet/PetView";
import { MoneyCard, moneyColors } from "../screens/moneyParts";
import { petStrings } from "../stringsPet";
import { colors, radius, spacing, type } from "../theme";
import { AppModal } from "./AppModal";
import { PrimaryButton } from "./PrimaryButton";
import { TextButton } from "./TextButton";

/** «Новый аксессуар: очки!» — the pet already wearing what the new Этап opened. */
export function AccessoryUnlockCard({
  accessory,
  stage,
  pet,
  onDone,
  onAppearance,
}: {
  accessory: string;
  stage: Stage;
  pet: { species: string; color: string; petName: string };
  onDone: () => void;
  onAppearance: () => void;
}) {
  const title = petStrings.unlockTitle(accessory);
  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.hero}>
            <Text style={styles.caption}>{petStrings.unlockCaption}</Text>
            <PetView
              species={pet.species}
              color={pet.color}
              accessory={accessory}
              petName={pet.petName}
              pose="happy"
              size={160}
            />
            <Text role="heading" style={styles.title}>
              {title}
            </Text>
          </View>
          <MoneyCard>
            <Text style={styles.body}>{petStrings.unlockBody(pet.petName, stage)}</Text>
          </MoneyCard>
          <PrimaryButton label={petStrings.unlockDone} onPress={onDone} />
          <TextButton label={petStrings.appearanceTitle} onPress={onAppearance} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.l,
  },
  sheet: {
    alignSelf: "stretch",
    backgroundColor: colors.background,
    borderRadius: radius.card + 4,
    gap: spacing.m,
    maxWidth: 400,
    padding: spacing.m,
  },
  hero: {
    alignItems: "center",
    backgroundColor: moneyColors.heroFace,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m,
  },
  caption: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  title: {
    color: moneyColors.heroText,
    fontSize: type.section,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
});
