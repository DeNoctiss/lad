import { BackLink } from "../components/ui/BackLink";
import { GuideSteps } from "../components/help/GuideSteps";
import { FeatureGrid } from "../components/help/FeatureGrid";
import { StorageSection } from "../components/help/StorageSection";
import { Tips } from "../components/help/Tips";
import { GuideFooter } from "../components/help/GuideFooter";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="subheading caged-section-title">{children}</h2>;
}

export function HelpPage({
  navigate,
  onExport,
  onImport,
}: {
  navigate: (route: string) => void;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <section className="chord-library guide-page" aria-label="Как это работает">
      <BackLink onClick={() => navigate("bands")}>К библиотеке</BackLink>
      <div className="page-heading chord-page-heading">
        <div>
          <p className="eyebrow">РУКОВОДСТВО ПО САЙТУ</p>
          <h1>Как это работает</h1>
          <p className="chord-page-description">
            Лад — локальный блокнот песен, аккордов и табулатур. Он работает
            прямо в браузере: без регистрации, сервера и интернета после первой
            загрузки.
          </p>
        </div>
      </div>

      <SectionTitle>С чего начать</SectionTitle>
      <GuideSteps />

      <SectionTitle>Что умеет сайт</SectionTitle>
      <FeatureGrid />

      <SectionTitle>Где хранятся данные и как их не потерять</SectionTitle>
      <StorageSection onExport={onExport} onImport={onImport} />

      <SectionTitle>Полезные мелочи</SectionTitle>
      <Tips />

      <GuideFooter navigate={navigate} />
    </section>
  );
}
