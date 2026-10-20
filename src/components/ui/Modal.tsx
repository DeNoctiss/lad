import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  wide = false,
  className = "",
  headerActions,
  eyebrow = "ВАША МУЗЫКАЛЬНАЯ БИБЛИОТЕКА",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  headerActions?: ReactNode;
  eyebrow?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? "modal-wide" : ""} ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="modal-header-actions">
          {headerActions}
          <button
            type="button"
            className="btn-icon"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      {children}
    </dialog>
  );
}
