import { useEffect, useRef, useState } from "react";

export const useCategoryNavState = (onRename: (id: string, name: string) => void) => {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sharingCategoryId, setSharingCategoryId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const submitRename = () => {
    const name = renameValue.trim();
    if (name && renamingId) onRename(renamingId, name);
    setRenamingId(null);
  };

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  };

  return {
    adding,
    setAdding,
    newName,
    setNewName,
    renamingId,
    renameValue,
    setRenameValue,
    sharingCategoryId,
    setSharingCategoryId,
    submitRename,
    startRename,
    renameRef,
  };
};
