import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/alert-dialog";
import { RotateCcw } from "lucide-react";

type ResetDialogProps = {
  onReset: () => void;
};

export function ResetDialog({ onReset }: ResetDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        aria-label="Reset"
        className="text-muted-foreground transition-colors cursor-pointer hover:text-orange-500"
      >
        <span className="flex flex-col items-center gap-0.5">
          <RotateCcw className="h-5 w-5" />
          <span className="hidden sm:inline text-xs">Reset</span>
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear your current chat history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onReset}>Reset</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
