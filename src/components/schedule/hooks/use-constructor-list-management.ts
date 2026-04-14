"use client";

import { useCallback, useMemo, useState } from "react";

import type { ListItem, ScheduleEntry } from "@/components/schedule/constructor-types";
import {
  useActivateListMutation,
  useCreateListMutation,
  useDeleteListMutation,
  useDuplicateListMutation,
  useUpdateListMutation,
} from "@/lib/react-query";

type UseConstructorListManagementParams = {
  selectedListId: number | null;
  selectedList: ListItem | undefined;
  setSelectedListId: (id: number | null) => void;
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
};

export function useConstructorListManagement({
  selectedListId,
  selectedList,
  setSelectedListId,
  setSchedule,
}: UseConstructorListManagementParams) {
  const [listModalMode, setListModalMode] = useState<"create" | "rename" | "duplicate" | null>(null);
  const [listModalName, setListModalName] = useState("");
  const [listModalError, setListModalError] = useState<string | null>(null);

  const createListMutation = useCreateListMutation();
  const activateListMutation = useActivateListMutation();
  const updateListMutation = useUpdateListMutation();
  const duplicateListMutation = useDuplicateListMutation();
  const deleteListMutation = useDeleteListMutation();

  const handleActivateList = useCallback(async () => {
    if (!selectedListId) return;

    try {
      await activateListMutation.mutateAsync(selectedListId);
    } catch (error: any) {
      alert(error.message);
    }
  }, [activateListMutation, selectedListId]);

  const openCreateListModal = useCallback(() => {
    setListModalMode("create");
    setListModalName("");
    setListModalError(null);
  }, []);

  const openRenameListModal = useCallback(() => {
    if (!selectedList) return;
    setListModalMode("rename");
    setListModalName(selectedList.name);
    setListModalError(null);
  }, [selectedList]);

  const openDuplicateListModal = useCallback(() => {
    if (!selectedList) return;
    setListModalMode("duplicate");
    setListModalName(`${selectedList.name} (копия)`);
    setListModalError(null);
  }, [selectedList]);

  const closeListModal = useCallback(() => {
    setListModalMode(null);
    setListModalName("");
    setListModalError(null);
  }, []);

  const handleListModalSubmit = useCallback(async () => {
    if (!listModalName.trim() || !listModalMode) return;
    setListModalError(null);

    try {
      if (listModalMode === "create") {
        const payload = await createListMutation.mutateAsync({ name: listModalName.trim() });
        if (payload.insertId) setSelectedListId(payload.insertId);
      } else if (listModalMode === "rename") {
        if (!selectedListId) return;
        await updateListMutation.mutateAsync({ id: selectedListId, payload: { name: listModalName.trim() } });
      } else if (listModalMode === "duplicate") {
        if (!selectedListId) return;
        const payload = await duplicateListMutation.mutateAsync({ id: selectedListId, name: listModalName.trim() });
        if (payload.insertId) setSelectedListId(payload.insertId);
      }
      closeListModal();
    } catch (error: any) {
      setListModalError(error.message || "Не удалось выполнить операцию с листом");
    }
  }, [
    closeListModal,
    createListMutation,
    duplicateListMutation,
    listModalMode,
    listModalName,
    selectedListId,
    setSelectedListId,
    updateListMutation,
  ]);

  const handleDeleteList = useCallback(async () => {
    if (!selectedListId || !selectedList) return;
    if (!confirm(`Удалить лист «${selectedList.name}»?`)) return;

    try {
      await deleteListMutation.mutateAsync(selectedListId);
      setSelectedListId(null);
      setSchedule([]);
    } catch (error: any) {
      alert(error.message || "Не удалось удалить лист");
    }
  }, [deleteListMutation, selectedList, selectedListId, setSchedule, setSelectedListId]);

  const listModalTitle = useMemo(() => {
    if (listModalMode === "rename") return "Переименовать лист";
    if (listModalMode === "duplicate") return "Дублировать лист";
    return "Создать новый лист расписания";
  }, [listModalMode]);

  const listModalSubmitLabel = useMemo(() => {
    if (listModalMode === "rename") return "Сохранить";
    if (listModalMode === "duplicate") return "Дублировать";
    return "Создать";
  }, [listModalMode]);

  const isListModalSubmitting =
    createListMutation.isPending || updateListMutation.isPending || duplicateListMutation.isPending;

  const listMutationsSaving =
    createListMutation.isPending ||
    activateListMutation.isPending ||
    updateListMutation.isPending ||
    duplicateListMutation.isPending ||
    deleteListMutation.isPending;

  return {
    listModalMode,
    listModalName,
    listModalError,
    setListModalName,
    listModalTitle,
    listModalSubmitLabel,
    isListModalSubmitting,
    listMutationsSaving,
    handleActivateList,
    openCreateListModal,
    openRenameListModal,
    openDuplicateListModal,
    closeListModal,
    handleListModalSubmit,
    handleDeleteList,
  };
}
