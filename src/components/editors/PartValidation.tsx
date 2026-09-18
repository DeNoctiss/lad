import type { TabIssue } from "../../lib/tabTypes";

export function PartValidation({
  notationError,
  sourcePending,
  issues,
}: {
  notationError: string;
  sourcePending: boolean;
  issues: TabIssue[];
}) {
  if (!notationError && !sourcePending && !issues.length) return null;
  return (
    <div className="part-validation" role="alert">
      {notationError ||
        (sourcePending
          ? "Перед сохранением примените или отмените правки на вкладке «Запись нот»."
          : "Исправьте визуальную партию перед сохранением.")}
      {issues.length > 0 && (
        <ul>
          {issues.slice(0, 8).map((issue, index) => (
            <li key={index}>
              Такт {issue.measure}
              {issue.event ? `, событие ${issue.event}` : ""}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
