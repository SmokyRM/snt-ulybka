"use client";

import { useState, type ReactNode } from "react";

type ConfirmActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  plotId: string;
  confirmText: string;
  buttonClassName: string;
  children: ReactNode;
  pendingLabel?: string;
};

export default function ConfirmActionForm({
  action,
  plotId,
  confirmText,
  buttonClassName,
  children,
  pendingLabel = "Выполняется...",
}: ConfirmActionFormProps) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
          return;
        }
        setSubmitting(true);
      }}
    >
      <input type="hidden" name="plotId" value={plotId} />
      <button type="submit" className={buttonClassName} disabled={submitting}>
        {submitting ? pendingLabel : children}
      </button>
    </form>
  );
}
