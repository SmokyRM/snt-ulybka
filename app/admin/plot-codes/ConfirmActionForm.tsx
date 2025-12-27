"use client";

import type { ReactNode } from "react";

type ConfirmActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  plotId: string;
  confirmText: string;
  buttonClassName: string;
  children: ReactNode;
};

export default function ConfirmActionForm({ action, plotId, confirmText, buttonClassName, children }: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="plotId" value={plotId} />
      <button type="submit" className={buttonClassName}>
        {children}
      </button>
    </form>
  );
}
