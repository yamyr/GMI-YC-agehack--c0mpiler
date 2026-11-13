import { type FormEvent, useEffect, useState } from "react";
import { formatRange, validateRange } from "../../demo/domain/price";
import { useI18n } from "../../i18n";
import { parseDollars } from "../../i18n/digits";
import type { ExpertProfile } from "../model/types";
import type { PriceSuggestion } from "../ports";
import { href } from "../routes";
import { confirmPrice, myProfile, suggestMyPrice } from "../usecases/profile";
import { type ScreenProps, StandIn } from "./shared";

/** Story 1: the agent suggests a range and says why; the expert decides (FR-006). */
export function ExpertPriceScreen({ ctx }: ScreenProps) {
  const { locale, t } = useI18n();
  const [profile, setProfile] = useState<ExpertProfile | null | undefined>(undefined);
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [error, setError] = useState<{ readonly kind: "range"; readonly range: { readonly min: number; readonly max: number } } | { readonly kind: "save" } | null>(null);

  useEffect(() => {
    void myProfile(ctx).then((result) => setProfile(result.ok ? result.value : null));
  }, [ctx]);

  useEffect(() => {
    let cancelled = false;
    void suggestMyPrice(ctx, locale).then((result) => {
      if (!cancelled) setSuggestion(result.ok ? result.value : null);
    });
    return () => { cancelled = true; };
  }, [ctx, locale]);

  if (profile === undefined) return <p className="lead">{t("Opening your price…")}</p>;
  if (profile === null) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Your price")}</h2>
        <p className="lead">{t("You need a profile before you can set a price.")}</p>
        <div className="actions">
          <a className="button-link" href={href("expert-interview")}>
            {t("Start the interview")}
          </a>
        </div>
      </div>
    );
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const range = { min: parseDollars(String(data.get("min") ?? "")), max: parseDollars(String(data.get("max") ?? "")) };
    if (!validateRange(range).ok) {
      setError({ kind: "range", range });
      return;
    }
    const result = await confirmPrice(ctx, range);
    if (result.ok) {
      setProfile(result.value);
      setError(null);
    } else {
      setError({ kind: "save" });
    }
  }

  const start = profile.priceRange ?? suggestion?.range;
  const rangeError = error?.kind === "range" ? validateRange(error.range, locale) : null;

  return (
    <div>
      <h2 tabIndex={-1}>{t("What should you charge?")}</h2>
      <p>
        <span className={profile.priceConfirmed ? "badge badge--done" : "badge badge--draft"}>
          {profile.priceConfirmed && profile.priceRange !== null
            ? t("Confirmed: {0} per 15 minutes", formatRange(profile.priceRange, locale))
            : t("Not confirmed yet")}
        </span>
      </p>

      {suggestion !== null && (
        <StandIn ctx={ctx} service="agent">
          <p className="big-price">{t("{0} per 15 minutes", formatRange(suggestion.range, locale))}</p>
          <p>{t("The agent suggests this range because:")}</p>
          <ul>
            {suggestion.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </StandIn>
      )}

      {start !== undefined && (
        <form onSubmit={(e) => void onConfirm(e)} key={`${start.min}-${start.max}`}>
          <p className="lead">{t("The price is yours to set. You can change it at any time.")}</p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="price-min">{t("Lowest price per 15 minutes")}</label>
              <input id="price-min" name="min" type="text" inputMode="numeric" defaultValue={start.min} required />
            </div>
            <div className="field">
              <label htmlFor="price-max">{t("Highest price per 15 minutes")}</label>
              <input id="price-max" name="max" type="text" inputMode="numeric" defaultValue={start.max} required />
            </div>
          </div>
          {error !== null && (
            <p className="notice notice--error" role="alert">
              {rangeError?.ok === false ? rangeError.message : t("Your price could not be saved. Please try again.")}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="primary">
              {t("Confirm my price")}
            </button>
            <a className="button-link button-link--quiet" href={href("expert-profile")}>
              {t("Back to my profile")}
            </a>
          </div>
        </form>
      )}
    </div>
  );
}
