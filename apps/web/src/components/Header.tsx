import { RobotIcon } from "./RobotIcon";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="border-b px-4 py-3 flex items-center gap-3">
      <RobotIcon />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
