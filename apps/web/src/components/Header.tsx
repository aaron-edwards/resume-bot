import { FileDown } from "lucide-react";
import { ResetDialog } from "./ResetDialog";
import { GitHubIcon, LinkedInIcon } from "./icons/BrandIcons";
import { RobotIcon } from "./icons/RobotIcon";

type HeaderProps = {
  title: string;
  onReset: () => void;
};

function NavItemContent({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      {children}
      <span className="hidden sm:inline text-xs">{label}</span>
    </span>
  );
}

type NavLinkProps = {
  href: string;
  label: string;
  download?: boolean;
  className?: string;
  children: React.ReactNode;
};

function NavLink({ href, label, download, className, children }: NavLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      download={download}
      className={`text-muted-foreground transition-colors ${className ?? ""}`}
    >
      <NavItemContent label={label}>{children}</NavItemContent>
    </a>
  );
}

export function Header({ title, onReset }: HeaderProps) {
  return (
    <header className="border-b px-4 py-3 flex items-center gap-3">
      <RobotIcon />
      <h1 className="text-lg font-semibold flex-1">{title}</h1>
      <nav aria-label="Actions" className="flex items-center gap-4">
        <NavLink href="/Aaron Edwards - CV.pdf" label="CV" download className="hover:text-red-500">
          <FileDown className="h-5 w-5" />
        </NavLink>
        <NavLink
          href="https://www.linkedin.com/in/aaron-edwards-71520564/"
          label="LinkedIn"
          className="hover:text-[#0A66C2]"
        >
          <LinkedInIcon className="h-5 w-5" />
        </NavLink>
        <NavLink
          href="https://github.com/aaron-edwards/resume-bot"
          label="GitHub"
          className="hover:text-foreground"
        >
          <GitHubIcon className="h-5 w-5" />
        </NavLink>
        <ResetDialog onReset={onReset} />
      </nav>
    </header>
  );
}
