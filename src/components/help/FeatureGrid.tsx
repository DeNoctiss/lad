import { features } from "./guideContent";

export function FeatureGrid() {
  return (
    <div className="guide-grid">
      {features.map((feature) => (
        <article key={feature.title} className="guide-card">
          <div className="guide-card-head">
            <span className="guide-card-icon">
              <feature.icon size={18} />
            </span>
            <h3>{feature.title}</h3>
          </div>
          <ul>
            {feature.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
