import type { TabIssue } from "../../../lib/tabTypes";

export function IssuesBox({ issues }: { issues: TabIssue[] }) {
  if (!issues.length) return null;
  return (
    <div className="visual-tab-issues" role="alert">
      <strong>Перед сохранением исправьте табулатуру</strong>
      <p>
        Ноты не обрезаются при изменении размера или длительности. Исправьте
        переполнение и связи вручную.
      </p>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${issue.measure}-${issue.event ?? "bar"}-${index}`}>
            Такт {issue.measure}
            {issue.event === undefined ? "" : `, событие ${issue.event}`}:{" "}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
