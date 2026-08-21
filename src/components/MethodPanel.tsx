import { methodCopy, METHOD_SECTION_IDS } from "@/i18n/method";
import type { Lang } from "@/types/lang";

export function MethodPanel({ lang }: { lang: Lang }) {
  const t = methodCopy[lang];
  return (
    <details className="method">
      <summary>{t.nav}</summary>
      <div className="method-body">
        <p className="method-lead">{t.lead}</p>
        {METHOD_SECTION_IDS.map((id) => {
          const section = t.sections[id];
          return (
            <section key={id}>
              <h3>{section.heading}</h3>
              {section.body.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </section>
          );
        })}
      </div>
    </details>
  );
}
