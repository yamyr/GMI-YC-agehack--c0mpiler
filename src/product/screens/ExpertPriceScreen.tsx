import { type FormEvent, useEffect, useState } from "react";
import { formatRange, validateRange } from "../../demo/domain/price";
import type { ExpertProfile } from "../model/types";
import type { PriceSuggestion } from "../ports";
import { href } from "../routes";
import { confirmPrice, myProfile, suggestMyPrice } from "../usecases/profile";
import { type ScreenProps, StandIn } from "./shared";

/** Story 1: the agent suggests a range and says why; the expert decides (FR-006). */
export function ExpertPriceScreen({ ctx }: ScreenProps) {
  const [profile, setProfile] = useState<ExpertProfile | null | undefined>(undefined);
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void myProfile(ctx).then((result) => setProfile(result.ok ? result.value : null));
    void suggestMyPrice(ctx).then((result) => setSuggestion(result.ok ? result.value : null));
  }, [ctx]);

  if (profile === undefined) return <p className="lead">Opening your price…</p>;
  if (profile === null) {
    return (
      <div>
        <h2 tabIndex={-1}>Your price</h2>
        <p className="lead">You need a profile before you can set a price.</p>
        <div className="actions">
          <a className="button-link" href={href("expert-interview")}>
            Start the interview
          </a>
        </div>
      </div>
    );
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const range = { min: Number(data.get("min")), max: Number(data.get("max")) };
    const check = validateRange(range);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    const result = await confirmPrice(ctx, range);
    if (result.ok) {
      setProfile(result.value);
      setError(null);
    } else {
      setError("Your price could not be saved. Please try again.");
    }
  }

  const start = profile.priceRange ?? suggestion?.range;

  return (
    <div>
      <h2 tabIndex={-1}>What should you charge?</h2>
      <p>
        <span className={profile.priceConfirmed ? "badge badge--done" : "badge badge--draft"}>
          {profile.priceConfirmed && profile.priceRange !== null ? `Confirmed: ${formatRange(profile.priceRange)} per 15 minutes` : "Not confirmed yet"}
        </span>
      </p>

      {suggestion !== null && (
        <StandIn ctx={ctx} service="agent">
          <p className="big-price">{formatRange(suggestion.range)} per 15 minutes</p>
          <p>The agent suggests this range because:</p>
          <ul>
            {suggestion.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </StandIn>
      )}

      {start !== undefined && (
        <form onSubmit={(e) => void onConfirm(e)} key={`${start.min}-${start.max}`}>
          <p className="lead">The price is yours to set. You can change it at any time.</p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="price-min">Lowest price per 15 minutes</label>
              <input id="price-min" name="min" type="number" min={1} step={1} defaultValue={start.min} required />
            </div>
            <div className="field">
              <label htmlFor="price-max">Highest price per 15 minutes</label>
              <input id="price-max" name="max" type="number" min={1} step={1} defaultValue={start.max} required />
            </div>
          </div>
          {error !== null && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="primary">
              Confirm my price
            </button>
            <a className="button-link button-link--quiet" href={href("expert-profile")}>
              Back to my profile
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
