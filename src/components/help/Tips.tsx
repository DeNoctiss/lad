import { tips } from "./guideContent";

export function Tips() {
  return (
    <div className="guide-tips">
      {tips.map((tip) => (
        <p key={tip.text}>
          <span className="guide-tip-icon">
            <tip.icon size={16} />
          </span>
          {tip.text}
        </p>
      ))}
    </div>
  );
}
