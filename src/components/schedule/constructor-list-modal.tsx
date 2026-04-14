"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/Modal";

type ConstructorListModalProps = {
  isOpen: boolean;
  name: string;
  error: string | null;
  isSubmitting: boolean;
  title?: string;
  submitLabel?: string;
  placeholder?: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
};

export function ConstructorListModal({
  isOpen,
  name,
  error,
  isSubmitting,
  title = "Создать новый лист расписания",
  submitLabel = "Создать",
  placeholder = "Введите название листа...",
  onClose,
  onNameChange,
  onSubmit,
}: ConstructorListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      {error ? (
        <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {error}
        </div>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Input
          className="mb-4"
          placeholder={placeholder}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Сохранение..." : submitLabel}
          </Button>
          <Button size="sm" type="button" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </Modal>
  );
}
