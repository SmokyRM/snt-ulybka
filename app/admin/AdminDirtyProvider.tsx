"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type AdminDirtyContextValue = {
  isDirty: boolean;
  setDirty: (next: boolean) => void;
  confirmIfDirty: (cb: () => void) => void;
};

const AdminDirtyContext = createContext<AdminDirtyContextValue>({
  isDirty: false,
  setDirty: () => {},
  confirmIfDirty: (cb) => cb(),
});

export function useAdminDirty() {
  return useContext(AdminDirtyContext);
}

export default function AdminDirtyProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const setDirty = useCallback((next: boolean) => {
    setIsDirty(next);
  }, []);

  const confirmIfDirty = useCallback(
    (cb: () => void) => {
      if (!isDirty) {
        cb();
        return;
      }
      pendingAction.current = cb;
      setDialogOpen(true);
    },
    [isDirty]
  );

  const handleConfirm = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    setDialogOpen(false);
    setIsDirty(false);
    action?.();
  };

  const handleCancel = () => {
    pendingAction.current = null;
    setDialogOpen(false);
  };

  return (
    <AdminDirtyContext.Provider value={{ isDirty, setDirty, confirmIfDirty }}>
      {children}
      <ConfirmDialog
        open={dialogOpen}
        title="Есть несохранённые изменения"
        description="Покинуть страницу без сохранения?"
        confirmText="Покинуть"
        destructive
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AdminDirtyContext.Provider>
  );
}
