import { Modal, type ModalProps } from "react-native";
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
  return (
    <Modal animationType={useModalAnimation(animation)} {...rest}>
      <InModal>{children}</InModal>
    </Modal>
  );
}
