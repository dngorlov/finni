import { Modal, type ModalProps } from "react-native";
import { useContext } from "react";
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider } from "react-native-safe-area-context";
import { useModalAnimation } from "../motion";
import { InModal } from "./safeBottom";

/**
 * A sheet or card. `animation` is skipped when Настройки has turned motion off.
 * Children learn they are in a modal, so footers can clear the navigation bar.
 */
export function AppModal({
  animation,
  children,
  ...rest
}: Omit<ModalProps, "animationType"> & { animation: "fade" | "slide" }) {
  // Seed the modal's provider with the root values so it renders at once; it
  // then re-measures inside the modal window.
  const insets = useContext(SafeAreaInsetsContext);
  const frame = useContext(SafeAreaFrameContext);
  const initial = insets && frame ? { insets, frame } : null;
  return (
    <Modal animationType={useModalAnimation(animation)} {...rest}>
      {/* A modal is its own native window: measure its insets there, not in the
          root window, or a sheet can slide under the navigation bar / home indicator. */}
      {initial ? (
        <SafeAreaProvider initialMetrics={initial}>
          <InModal>{children}</InModal>
        </SafeAreaProvider>
      ) : (
        <InModal>{children}</InModal>
      )}
    </Modal>
  );
}
