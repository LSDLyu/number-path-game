import { type ReactNode, useEffect, useId, useRef } from "react";
import styles from "./NumberPathGame.module.css";

export function GameDialog({ open, title, closeLabel, onClose, children }: {
  open: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className={styles.dialogHeading}>
      <h2 id={titleId}>{title}</h2>
      <button type="button" onClick={onClose} autoFocus aria-label={closeLabel}>×</button>
    </div>
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}
