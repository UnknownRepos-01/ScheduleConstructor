import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/icons";

type TableRowActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
};

export function TableRowActions({ onEdit, onDelete }: TableRowActionsProps) {
  return (
    <div className="flex gap-1.5">
      <Button size="sm" onClick={onEdit} aria-label="Редактировать">
        <AppIcon name="edit" className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="danger" onClick={onDelete} aria-label="Удалить">
        <AppIcon name="delete" className="h-4 w-4" />
      </Button>
    </div>
  );
}
