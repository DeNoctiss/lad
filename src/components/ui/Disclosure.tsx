import type { ReactNode } from "react";
export function Disclosure({
  title,
  children,
  className = "",
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={`workspace-disclosure ${className}`}
      open={defaultOpen || undefined}
    >
      <summary>{title}</summary>
      <div className="workspace-disclosure-body">{children}</div>
    </details>
  );
}
