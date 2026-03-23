import { RobotIcon } from "./icons/RobotIcon";

export function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="animate-pulse">
        <RobotIcon size={120} />
      </div>
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  );
}
