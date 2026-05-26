"use client";

import type { ListItem } from "@/components/schedule/constructor-types";
import { CONSTRUCTOR_TEXT } from "@/components/schedule/constructor-text";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";

type ConstructorToolbarProps = {
  lists: ListItem[];
  selectedListId: number | null;
  selectedListIsActive: boolean;
  isShiftPressed: boolean;
  onSelectList: (value: number | null) => void;
  onActivateList: () => void;
  onCreateList: () => void;
  onRenameList: () => void;
  onDuplicateList: () => void;
  onDeleteList: () => void;
  onGenerateNewSchedule: () => void;
  onAppendSchedule: () => void;
};

export function ConstructorToolbar({
  lists,
  selectedListId,
  selectedListIsActive,
  isShiftPressed,
  onSelectList,
  onActivateList,
  onCreateList,
  onRenameList,
  onDuplicateList,
  onDeleteList,
  onGenerateNewSchedule,
  onAppendSchedule,
}: ConstructorToolbarProps) {
  const hasSelectedList = !!selectedListId;

  return (
    <div className="mb-5 flex w-full flex-wrap items-center gap-3">
      <Select
        className="max-w-[250px]"
        value={selectedListId || ""}
        onChange={(event) => {
          const value = event.target.value;
          onSelectList(value ? Number.parseInt(value, 10) : null);
        }}
      >
        <option value="">Выберите лист расписания...</option>
        {lists.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} {item.isActive ? "(активный лист)" : ""}
          </option>
        ))}
      </Select>

      <Button
        size="sm"
        variant="success"
        onClick={onActivateList}
        disabled={!selectedListId || selectedListIsActive}
      >
        <AppIcon name="check" className="h-4 w-4" />
        Сделать лист активным
      </Button>

      <Button size="sm" onClick={onCreateList}>
        <AppIcon name="add" className="h-4 w-4" />
        Создать новый лист
      </Button>

      <Button size="sm" onClick={onRenameList} disabled={!hasSelectedList}>
        <AppIcon name="edit" className="h-4 w-4" />
        Переименовать
      </Button>

      <Button size="sm" onClick={onDuplicateList} disabled={!hasSelectedList}>
        <AppIcon name="add" className="h-4 w-4" />
        Дублировать
      </Button>

      <Button size="sm" variant="danger" onClick={onDeleteList} disabled={!hasSelectedList}>
        <AppIcon name="delete" className="h-4 w-4" />
        Удалить
      </Button>

      <Button size="sm" variant="primary" onClick={onGenerateNewSchedule} disabled={!hasSelectedList}>
        <AppIcon name="schedule" className="h-4 w-4" />
        Сгенерировать новое расписание
      </Button>

      <Button size="sm" variant="success" onClick={onAppendSchedule} disabled={!hasSelectedList}>
        <AppIcon name="add" className="h-4 w-4" />
        Дополнить расписание
      </Button>

      <div className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-tertiary">
        <AppIcon name="warning" className="h-3 w-3" />
        {isShiftPressed
          ? CONSTRUCTOR_TEXT.shiftActiveHint
          : CONSTRUCTOR_TEXT.shiftHint}
      </div>
    </div>
  );
}
