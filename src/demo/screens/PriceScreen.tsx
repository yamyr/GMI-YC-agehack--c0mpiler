import { useState } from "react";
import { Transcript } from "../chrome/Conversation";
import { formatRange } from "../domain/price";
import { PRICE_PROMPT, PRICE_REPLIES, PRICE_SUGGESTION } from "../script/margaret";
import { NoticeLine, type ScreenProps, parseDollars } from "./shared";

/** FR-010, FR-011: agent suggests with reasons; Margaret answers and decides. */
export function PriceScreen({ state, dispatch }: ScreenProps) {
  const [min, setMin] = useState(String(state.priceDraft.min));
  const [max, setMax] = useState(String(state.priceDraft.max));

  return (
    <div>
      <h2 tabIndex={-1}>What should Margaret charge?</h2>
      <p className="lead">The agent suggests a price per 15 minutes. Margaret decides.</p>

      <div className="card">
        <p className="muted">The agent suggests</p>
        <p className="big-price">{formatRange(PRICE_SUGGESTION.range)} per 15 minutes</p>
        <h3>Why</h3>
        <ul className="plain-list">
          {PRICE_SUGGESTION.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <Transcript turns={[{ speaker: "agent", text: PRICE_PROMPT }, ...state.exchanges.price]} agentName="Onboarding agent" />
      <div className="replies" role="group" aria-label="Margaret can say">
        {PRICE_REPLIES.map((reply) => (
          <button key={reply.id} type="button" onClick={() => dispatch({ type: "replyToAgent", replyId: reply.id })}>
            “{reply.text}”
          </button>
        ))}
      </div>

      <details className="typed">
        <summary>Or type your own range</summary>
        <div className="field-row">
          <div className="field">
            <label htmlFor="price-min">Lowest price per 15 minutes ($)</label>
            <input id="price-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="price-max">Highest price per 15 minutes ($)</label>
            <input id="price-max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => dispatch({ type: "setPrice", range: { min: parseDollars(min), max: parseDollars(max) } })}
          >
            Use this range
          </button>
        </div>
      </details>

      <NoticeLine notice={state.notice} />

      <div className="card" style={{ marginTop: "var(--space-4)" }}>
        <p>
          Margaret's price: <strong>{formatRange(state.priceDraft)} per 15 minutes</strong>{" "}
          <span className={`badge ${state.priceConfirmed ? "badge--done" : "badge--draft"}`}>
            {state.priceConfirmed ? "Confirmed" : "Not confirmed yet"}
          </span>
        </p>
      </div>
      {!state.priceConfirmed && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "confirmPrice" })}>
            Confirm my price
          </button>
        </div>
      )}
    </div>
  );
}
