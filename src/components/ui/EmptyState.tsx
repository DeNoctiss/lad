import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  titleAs: TitleTag = "h3",
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  titleAs?: "h1" | "h2" | "h3";
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state${className ? ` ${className}` : ""}`}>
      {icon}
      <TitleTag>{title}</TitleTag>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}
