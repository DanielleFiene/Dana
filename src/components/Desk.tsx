import { copy } from "@/i18n/copy";
import { fmt, formatDateTime, weekday } from "@/lib/format";
import { heroStatus, isDryWindow, paintLevel, levelLabel } from "@/scoring/actions";
import type { Lang } from "@/types/lang";
import type { ScoredPlace } from "@/types/place";
import { RISK_META } from "@/types/risk";
import { FACTOR_ORDER } from "@/types/weather";
import type { FactorKey, HourScore } from "@/types/weather";

export function StatusHero({
  lang,
  name,
  hour,
  week,
}: {
  lang: Lang;
  name: string;
  hour: HourScore | null;
  week: HourScore | null;
}) {
  const t = copy[lang];
  const primary = hour ?? week;
  const dry = isDryWindow(primary);
  const status = heroStatus(primary, lang);
  const meta = RISK_META[status.colorLevel];
  const outlook =
    week &&
    week.level >= 3 &&
    (dry || (primary !== null && week.level > primary.level));
  return (
    <section className="hero" style={{ borderColor: meta.color }}>
      <div className="hero-kicker">
        {primary ? formatDateTime(primary.time, lang) : t.next48} · {name}
      </div>
      <h1 style={{ color: meta.color }}>{status.title}</h1>
      {status.hint ? <p>{status.hint}</p> : null}
      {outlook && week ? (
        <p style={{ marginTop: 8, color: RISK_META[week.level].color }}>
          {t.outlook}: {levelLabel(week.level, lang)}
          <span className="outlook-when"> · {formatDateTime(week.time, lang)}</span>
        </p>
      ) : null}
      <div className="metrics">
        <div className="metric">
          <b>{fmt(primary?.precip24hMm ?? null, 0, " mm")}</b>
          <span>{t.mm}</span>
        </div>
        <MetricHelp label={t.shock} value={fmt(primary?.thermalGradientC ?? null, 0, " °C")} help={t.shockHelp} />
        <MetricHelp label={t.cape} value={fmt(primary?.cape ?? null, 0, " J/kg")} help={t.indicatorHelp.cape} />
        <MetricHelp label={t.sst} value={fmt(primary?.sst ?? null, 1, " °C")} help={t.indicatorHelp.sst} />
        <div className="metric">
          <b>
            {fmt(primary?.temperature2m ?? null, 0, "°")} / {fmt(primary?.temperature500 ?? null, 0, "°")}
          </b>
          <span>
            {t.t2} / {t.t500}
          </span>
        </div>
        <div className="metric">
          <b>{fmt(primary?.gustKmh ?? null, 0, " km/h")}</b>
          <span>{t.gust}</span>
        </div>
      </div>
    </section>
  );
}

function MetricHelp({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="metric" title={help}>
      <b>{value}</b>
      <span>
        {label}{" "}
        <abbr className="info" title={help}>
          ?
        </abbr>
      </span>
    </div>
  );
}

export function DayStrip({
  lang,
  days,
  selected,
  onSelect,
}: {
  lang: Lang;
  days: ScoredPlace["days"];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="days" role="tablist">
      {days.map((d) => (
        <button
          key={d.date}
          type="button"
          className={d.date === selected ? "day on" : "day"}
          onClick={() => onSelect(d.date)}
        >
          <span className="wd">{weekday(d.date, lang)}</span>
          <span className="lv" style={{ background: RISK_META[d.level].color }} />
          <span className="mm">{fmt(d.precipMm, 0, " mm")}</span>
        </button>
      ))}
    </div>
  );
}

export function HourlyBars({
  lang,
  hours,
  selectedTime,
  onSelect,
}: {
  lang: Lang;
  hours: HourScore[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
}) {
  const t = copy[lang];
  return (
    <div>
      <div className="hero-kicker">{t.hourlyLabel}</div>
      <div className="hours-scroller">
        <div className="hours-inner">
          <div className="hours">
            {hours.map((h) => (
              <button
                key={h.time}
                type="button"
                className={h.time === selectedTime ? "hour on" : "hour"}
                style={{
                  height: `${String(Math.max(8, Math.round(h.impact * 56)))}px`,
                  background: RISK_META[paintLevel(h)].color,
                }}
                title={`${formatDateTime(h.time, lang)} · ${levelLabel(h.level, lang)}`}
                aria-label={formatDateTime(h.time, lang)}
                aria-pressed={h.time === selectedTime}
                onClick={() => onSelect(h.time)}
              />
            ))}
          </div>
          {hours.length > 0 ? (
            <div className="hour-axis">
              <span>00</span>
              <span>12</span>
              <span>24</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FactorList({ lang, hour }: { lang: Lang; hour: HourScore | null }) {
  const t = copy[lang];
  if (!hour) return null;
  return (
    <details className="method">
      <summary>
        {t.factors}
        <span className="outlook-when"> · {formatDateTime(hour.time, lang)}</span>
      </summary>
      <p className="hourly-hint">{t.factorScale}</p>
      <div className="factors">
      {FACTOR_ORDER.map((key: FactorKey) => {
        const value = hour.factors[key];
        if (value === undefined) return null;
        return (
          <div className="factor" key={key}>
            <span className="factor-name">
              {t.indicator[key]}
              <abbr className="info" title={t.indicatorHelp[key]}>
                ?
              </abbr>
            </span>
            <span className="bar">
              <i style={{ width: `${String(Math.round(value * 100))}%` }} />
            </span>
            <span>{Math.round(value * 100)}</span>
          </div>
        );
      })}
      </div>
    </details>
  );
}
