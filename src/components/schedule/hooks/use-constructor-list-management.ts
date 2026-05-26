"use client";

import { useCallback, useState } from "react";

import { CONSTRUCTOR_TEXT } from "@/components/schedule/constructor-text";
import type { ListItem, ScheduleEntry } from "@/components/schedule/constructor-types";
import {
  useActivateListMutation,
  useCreateListMutation,
  useDeleteListMutation,
  useDuplicateListMutation,
  useUpdateListMutation,
} from "@/lib/react-query";

type ListModalMode = "create" | "rename" | "duplicate";

const LIST_MODAL_TITLES: Record<ListModalMode, string> = {
  create: "Создать новый лист расписания",
  rename: "Переименовать лист",
  duplicate: "Дублировать лист",
};

const LIST_MODAL_SUBMIT_LABELS: Record<ListModalMode, string> = {
  create: "Создать",
  rename: "Сохранить",
  duplicate: "Дублировать",
};

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
  const [listModalMode, setListModalMode] = useState<ListModalMode | null>(null);
  const [listModalName, setListModalName] = useState("");
  const [listModalError, setListModalError] = useState<string | null>(null);

  const createListMutation = useCreateListMutation();
  const activateListMutation = useActivateListMutation();
  const updateListMutation = useUpdateListMutation();
  const duplicateListMutation = useDuplicateListMutation();
  const deleteListMutation = useDeleteListMutation();

  const resetListModalState = useCallback(() => {
    setListModalMode(null);
    setListModalName("");
    setListModalError(null);
  }, []);

  const openListModal = useCallback((mode: ListModalMode, initialName: string) => {
    setListModalMode(mode);
    setListModalName(initialName);
    setListModalError(null);
  }, []);

  const handleActivateList = useCallback(async () => {
    if (!selectedListId) return;

    try {
      await activateListMutation.mutateAsync(selectedListId);
    } catch (error: any) {
      alert(error.message || CONSTRUCTOR_TEXT.listActionError);
    }
  }, [activateListMutation, selectedListId]);

  const openCreateListModal = useCallback(() => {
    openListModal("create", "");
  }, [openListModal]);

  const openRenameListModal = useCallback(() => {
    if (!selectedList) return;
    openListModal("rename", selectedList.name);
  }, [openListModal, selectedList]);

  const openDuplicateListModal = useCallback(() => {
    if (!selectedList) return;
    openListModal("duplicate", `${selectedList.name}${CONSTRUCTOR_TEXT.listDuplicateSuffix}`);
  }, [openListModal, selectedList]);

  const handleListModalSubmit = useCallback(async () => {
    const trimmedName = listModalName.trim();
    if (!trimmedName || !listModalMode) return;

    setListModalError(null);

    try {
      if (listModalMode === "create") {
        const payload = await createListMutation.mutateAsync({ name: trimmedName });
        if (payload.insertId) {
          setSelectedListId(payload.insertId);
        }
      }

      if (listModalMode === "rename") {
        if (!selectedListId) return;
        await updateListMutation.mutateAsync({ id: selectedListId, payload: { name: trimmedName } });
      }

      if (listModalMode === "duplicate") {
        if (!selectedListId) return;
        const payload = await duplicateListMutation.mutateAsync({ id: selectedListId, name: trimmedName });
        if (payload.insertId) {
          setSelectedListId(payload.insertId);
        }
      }

      resetListModalState();
    } catch (error: any) {
      setListModalError(error.message || CONSTRUCTOR_TEXT.listActionError);
    }
  }, [
    createListMutation,
    duplicateListMutation,
    listModalMode,
    listModalName,
    resetListModalState,
    selectedListId,
    setSelectedListId,
    updateListMutation,
  ]);

  const handleDeleteList = useCallback(async () => {
    if (!selectedListId || !selectedList) return;
    if (!confirm(CONSTRUCTOR_TEXT.listDeleteConfirm(selectedList.name))) return;

    try {
      await deleteListMutation.mutateAsync(selectedListId);
      setSelectedListId(null);
      setSchedule([]);
    } catch (error: any) {
      alert(error.message || CONSTRUCTOR_TEXT.listDeleteError);
    }
  }, [deleteListMutation, selectedList, selectedListId, setSchedule, setSelectedListId]);

  const listModalTitle = listModalMode ? LIST_MODAL_TITLES[listModalMode] : LIST_MODAL_TITLES.create;
  const listModalSubmitLabel = listModalMode
    ? LIST_MODAL_SUBMIT_LABELS[listModalMode]
    : LIST_MODAL_SUBMIT_LABELS.create;

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
    closeListModal: resetListModalState,
    handleListModalSubmit,
    handleDeleteList,
  };
}
