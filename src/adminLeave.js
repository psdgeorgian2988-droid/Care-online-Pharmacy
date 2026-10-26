import { createContext, useContext, useEffect, useRef } from "react";

export const AdminLeaveContext = createContext({
  openSection: "",
  toggleSection() {},
  setGuard() {},
});

export function AdminSectionGuard({ dirty, save }) {
  const { setGuard } = useContext(AdminLeaveContext);
  const dirtyRef = useRef(dirty);
  const saveRef = useRef(save);
  dirtyRef.current = dirty;
  saveRef.current = save;
  useEffect(() => {
    setGuard({
      dirty: () => Boolean(dirtyRef.current),
      save: () => saveRef.current?.(),
    });
    return () => setGuard(null);
  }, [setGuard]);
  return null;
}
