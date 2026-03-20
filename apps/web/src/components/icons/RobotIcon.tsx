const DEFAULT_COLOR = "oklch(0.5 0.14 185)";

type RobotIconProps = {
  color?: string;
  size?: number;
};

export function RobotIcon({ color = DEFAULT_COLOR, size = 32 }: RobotIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="10" width="20" height="16" rx="3" fill={color} />
      <circle cx="11.5" cy="17" r="2.5" fill="white" />
      <circle cx="20.5" cy="17" r="2.5" fill="white" />
      <circle cx="11.5" cy="17" r="1" fill={color} />
      <circle cx="20.5" cy="17" r="1" fill={color} />
      <rect x="12" y="22" width="8" height="2" rx="1" fill="white" />
      <rect x="14" y="6" width="4" height="5" rx="1" fill={color} />
      <circle cx="16" cy="5" r="2" fill={color} />
      <rect x="4" y="14" width="2" height="5" rx="1" fill={color} />
      <rect x="26" y="14" width="2" height="5" rx="1" fill={color} />
    </svg>
  );
}
