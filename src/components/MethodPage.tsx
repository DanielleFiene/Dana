import { methodCopy, METHOD_SECTION_IDS } from "@/i18n/method";
import type { Lang } from "@/types/lang";

export function MethodPage({ lang }: { lang: Lang }) {
  const t = methodCopy[lang];
  return (
    <div className="method-page">
      <article>
        <p className="method-back">
          <a href="#desk">{t.back}</a>
        </p>
        <h1>{t.title}</h1>
        <p className="method-lead">{t.lead}</p>
        {METHOD_SECTION_IDS.map((id) => {
          const section = t.sections[id];
          return (
            <section key={id}>
              <h2>{section.heading}</h2>
              {section.body.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </section>
          );
        })}
      </article>
    </div>
  );
}
