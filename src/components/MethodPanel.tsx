import { copy } from "@/i18n/copy";
import type { Lang } from "@/types/lang";

export function MethodPanel({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return (
    <details className="method">
      <summary>{t.methodTitle}</summary>
      <p>{t.methodLead}</p>
      <p>{t.methodFormula}</p>
      <p>{t.methodWhyGate}</p>
    </details>
  );
}
