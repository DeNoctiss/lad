import { steps } from "./guideContent";

export function GuideSteps() {
  return (
    <ol className="guide-steps">
      {steps.map((step, index) => (
        <li key={step.title} className="guide-step">
          <span className="guide-step-number">{index + 1}</span>
          <span>
            <strong>{step.title}</strong>
            {step.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
