import { FileDown, RotateCcw } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "./icons/BrandIcons";
import { RobotIcon } from "./icons/RobotIcon";

type HeaderProps = {
  title: string;
  onReset: () => void;
};

type NavItemSharedProps = {
  label: string;
  tooltip: string;
  tooltipAlign?: "center" | "right";
  className?: string;
  children: React.ReactNode;
};

const tooltipClass = (align: "center" | "right") =>
  `absolute top-full mt-1 ${align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"} whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`;

function NavItemContent({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {children}
      <span className="hidden sm:inline text-xs">{label}</span>
    </span>
  );
}

type NavLinkProps = NavItemSharedProps & {
  href: string;
  download?: boolean;
};

function NavLink({ href, label, tooltip, tooltipAlign = "center", download, className, children }: NavLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      download={download}
      className={`relative group text-muted-foreground transition-colors ${className ?? ""}`}
    >
      <NavItemContent label={label}>{children}</NavItemContent>
      <span className={tooltipClass(tooltipAlign)}>{tooltip}</span>
    </a>
  );
}

type NavButtonProps = NavItemSharedProps & {
  onClick: () => void;
};

function NavButton({ label, tooltip, tooltipAlign = "center", className, onClick, children }: NavButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative group flex items-center gap-1.5 text-muted-foreground transition-colors cursor-pointer ${className ?? ""}`}
    >
      <NavItemContent label={label}>{children}</NavItemContent>
      <span className={tooltipClass(tooltipAlign)}>{tooltip}</span>
    </button>
  );
}

export function Header({ title, onReset }: HeaderProps) {
  const handleReset = () => {
    if (window.confirm("Start a new conversation? This will clear your current chat history.")) {
      onReset();
    }
  };

  return (
    <header className="border-b px-4 py-3 flex items-center gap-3">
      <RobotIcon />
      <h1 className="text-lg font-semibold flex-1">{title}</h1>
      <nav aria-label="Actions" className="flex items-center gap-4">
        <NavLink
          href="/Aaron Edwards - CV.pdf"
          label="Download CV"
          tooltip="Download CV"
          download
          className="hover:text-red-500"
        >
          <FileDown className="h-5 w-5" />
        </NavLink>
        <NavLink
          href="https://www.linkedin.com/in/aaron-edwards-71520564/"
          label="LinkedIn"
          tooltip="LinkedIn"
          className="hover:text-[#0A66C2]"
        >
          <LinkedInIcon className="h-5 w-5" />
        </NavLink>
        <NavLink
          href="https://github.com/aaron-edwards/resume-bot"
          label="GitHub"
          tooltip="GitHub"
          className="hover:text-foreground"
        >
          <GitHubIcon className="h-5 w-5" />
        </NavLink>
        <NavButton
          label="Reset"
          tooltip="Start new chat"
          tooltipAlign="right"
          className="hover:text-orange-500"
          onClick={handleReset}
        >
          <RotateCcw className="h-5 w-5" />
        </NavButton>
      </nav>
    </header>
  );
}
