import { FileDown } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "./icons/BrandIcons";
import { RobotIcon } from "./icons/RobotIcon";

type HeaderProps = {
  title: string;
};

type NavLinkProps = {
  href: string;
  label: string;
  tooltip: string;
  tooltipAlign?: "center" | "right";
  download?: boolean;
  className?: string;
  children: React.ReactNode;
};

function NavLink({ href, label, tooltip, tooltipAlign = "center", download, className, children }: NavLinkProps) {
  const tooltipPosition = tooltipAlign === "right"
    ? "right-0"
    : "left-1/2 -translate-x-1/2";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      download={download}
      className={`relative group text-muted-foreground transition-colors ${className ?? ""}`}
    >
      <span className="sr-only">{label}</span>
      {children}
      <span className={`absolute top-full mt-1 ${tooltipPosition} whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
        {tooltip}
      </span>
    </a>
  );
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="border-b px-4 py-3 flex items-center gap-3">
      <RobotIcon />
      <h1 className="text-lg font-semibold flex-1">{title}</h1>
      <nav aria-label="Social links" className="flex items-center gap-3">
        <NavLink
          href="/Aaron Edwards - CV.pdf"
          label="Download CV"
          tooltip="Download CV"
          download
          className="hover:text-foreground"
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
          tooltipAlign="right"
          className="hover:text-foreground"
        >
          <GitHubIcon className="h-5 w-5" />
        </NavLink>
      </nav>
    </header>
  );
}
