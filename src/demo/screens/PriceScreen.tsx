import { useI18n } from "../../i18n";
import { useState } from "react";
import { Transcript } from "../chrome/Conversation";
import { formatRange } from "../domain/price";
import { PRICE_PROMPT, PRICE_REPLIES, PRICE_SUGGESTION } from "../script/margaret";
import { NoticeLine, type ScreenProps, parseDollars } from "./shared";

/** FR-010, FR-011: agent suggests with reasons; Margaret answers and decides. */
export function PriceScreen({ state, dispatch }: ScreenProps) {
  const { t, locale } = useI18n();

  const [min, setMin] = useState(String(state.priceDraft.min));
  const [max, setMax] = useState(String(state.priceDraft.max));

  return (
    <div>
      <h2 tabIndex={-1}>{t("What should Margaret charge?")}</h2>
      <p className="lead">{t("The agent suggests a price per 15 minutes. Margaret decides.")}</p>

      <div className="card">
        <p className="muted">{t("The agent suggests")}</p>
        <p className="big-price">{t("{0} per 15 minutes", formatRange(PRICE_SUGGESTION.range, locale))}</p>
        <h3>{t("Why")}</h3>
        <ul className="plain-list">
          {PRICE_SUGGESTION.reasons.map((r) => (
            <li key={r}>{t(r)}</li>
          ))}
        </ul>
      </div>

      <Transcript turns={[{ speaker: "agent", text: t(PRICE_PROMPT) }, ...state.exchanges.price]} agentName={t("Onboarding agent")} />
      <div className="replies" role="group" aria-label={t("Margaret can say")}>
        {PRICE_REPLIES.map((reply) => (
          <button key={reply.id} type="button" onClick={() => dispatch({ type: "replyToAgent", replyId: reply.id })}>{t("“{0}”", t(reply.text))}</button>
        ))}
      </div>

      <details className="typed">
        <summary>{t("Or type your own range")}</summary>
        <div className="field-row">
          <div className="field">
            <label htmlFor="price-min">{t("Lowest price per 15 minutes ($)")}</label>
            <input id="price-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="price-max">{t("Highest price per 15 minutes ($)")}</label>
            <input id="price-max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => dispatch({ type: "setPrice", range: { min: parseDollars(min), max: parseDollars(max) } })}
          >{t("Use this range")}</button>
        </div>
      </details>

      <NoticeLine notice={state.notice} />

      <div className="card" style={{ marginTop: "var(--space-4)" }}>
        <p>{t("Margaret's price:")}{" "}<strong>{t("{0} per 15 minutes", formatRange(state.priceDraft, locale))}</strong>{" "}
          <span className={`badge ${state.priceConfirmed ? "badge--done" : "badge--draft"}`}>
            {state.priceConfirmed ? t("Confirmed") : t("Not confirmed yet")}
          </span>
        </p>
      </div>
      {!state.priceConfirmed && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "confirmPrice" })}>{t("Confirm my price")}</button>
        </div>
      )}
    </div>
  );
}
