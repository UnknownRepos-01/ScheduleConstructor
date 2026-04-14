export const CONSTRUCTOR_TEXT = {
  pageTitle: "Конструктор расписания",
  saving: "Сохранение...",
  listLabel: "Лист",
  listActiveLabel: "активный",
  emptySelectList: "Выберите или создайте лист расписания",
  emptyAddClasses: "Сначала добавьте классы в разделе «Классы»",
  listDeleteConfirm: (name: string) => `Удалить лист «${name}»?`,
  listDuplicateSuffix: " (копия)",
  listActionError: "Не удалось выполнить операцию с листом",
  listDeleteError: "Не удалось удалить лист",
  scheduleMoveError: "Не удалось переместить запись",
  scheduleDeleteError: "Не удалось удалить запись",
  shiftHint:
    "Удерживайте Shift при перетаскивании, чтобы быстро переносить занятия между ячейками",
  shiftActiveHint:
    "Shift зажат: можно перетаскивать занятия между ячейками без открытия модального окна",
} as const;
