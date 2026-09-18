import { Music2 } from "lucide-react";

export function GuideFooter({
  navigate,
}: {
  navigate: (route: string) => void;
}) {
  return (
    <div className="guide-footer">
      <Music2 size={18} />
      <p>Готово к первой песне?</p>
      <button className="btn btn-primary" onClick={() => navigate("bands")}>
        Открыть библиотеку
      </button>
    </div>
  );
}
