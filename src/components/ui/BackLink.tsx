import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function BackLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="back-link" onClick={onClick}>
      <ArrowLeft size={16} />
      {children}
    </button>
  );
}
