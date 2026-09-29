import { StyleSheet, Text, View } from "react-native";
import { PetView } from "../pet/PetView";
import { petStrings } from "../stringsPet";
import { colors, radius, spacing, type } from "../theme";
import { AppModal } from "./AppModal";
import { PrimaryButton } from "./PrimaryButton";
import { SpeechBubble } from "./SpeechBubble";

/** The pet says the journey is complete, and that play can go on. Shown once at Миллионер. */
export function StageFinaleCard({
  pet,
  onDone,
}: {
  pet: { species: string; color: string; accessory: string; petName: string };
  onDone: () => void;
}) {
  const spoken = `${petStrings.finaleTitle} ${petStrings.finaleBody}`;
  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <PetView
            species={pet.species}
            color={pet.color}
            accessory={pet.accessory}
            petName={pet.petName}
            pose="happy"
            size={160}
          />
          <SpeechBubble accessibilityLabel={spoken}>
            <Text role="heading" style={styles.title}>
              {petStrings.finaleTitle}
            </Text>
            <Text style={styles.body}>{petStrings.finaleBody}</Text>
          </SpeechBubble>
          <PrimaryButton label={petStrings.finaleDone} onPress={onDone} />
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
  title: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
    textAlign: "center",
  },
});
