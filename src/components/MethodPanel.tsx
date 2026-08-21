import { methodCopy } from "@/i18n/method";
import type { Lang } from "@/types/lang";

export function MethodPanel({ lang }: { lang: Lang }) {
  const t = methodCopy[lang];
  return (
    <details className="method">
      <summary>{t.nav}</summary>
      <p>{t.lead}</p>
    </details>
  );
}
