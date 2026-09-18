import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  descriptionClassName = "chord-page-description",
  action,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  descriptionClassName?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`page-heading${className ? ` ${className}` : ""}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? (
          <p className={descriptionClassName}>{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
