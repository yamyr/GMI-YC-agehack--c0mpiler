import { useState } from "react";
import { formatList, formatNumber } from "../../../site/i18n/core.js";
import { useI18n } from "../../i18n";
import { deleteAccount } from "../usecases/profile";
import { type ScreenProps, ServiceStatusList } from "./shared";

/** Who is signed in, what the product is connected to, and the way out (FR-003). */
export function AccountScreen({ ctx, account, refresh }: ScreenProps) {
  const { locale, t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<"session-not-finished" | "not-signed-in" | null>(null);
  const [ahead, setAhead] = useState(() => ctx.clock?.offsetMinutes() ?? 0);
  const days = Math.round(ahead / 1440);

  async function onDelete() {
    const result = await deleteAccount(ctx);
    if (result.ok) await refresh();
    else setError(result.error);
  }

  return (
    <div>
      <h2 tabIndex={-1}>{t("Your account")}</h2>
      <dl className="facts-list">
        <div>
          <dt>{t("Email address")}</dt>
          <dd>{account.email}</dd>
        </div>
        <div>
          <dt>{t("Name")}</dt>
          <dd>{account.name === "" ? t("Not given yet") : account.name}</dd>
        </div>
        <div>
          <dt>{t("You use Agely as")}</dt>
          <dd>{account.roles.length === 0 ? t("Not chosen yet") : formatList(account.roles.map((role) => t(role === "expert" ? "an expert" : "a buyer")), locale)}</dd>
        </div>
      </dl>
      <h3>{t("What is connected")}</h3>
      <ServiceStatusList ctx={ctx} />

      {ctx.clock !== undefined && (
        <>
          <h3>{t("Trying out what happens later")}</h3>
          <div className="stand-in" data-stand-in="clock">
            <p>
              {t("Try-out clock. A stand-in for waiting: move Agely's clock forward to see what happens after a session has taken place.")}
            </p>
            <p>
              {ahead === 0
                ? t("The clock shows the real time.")
                : t("The clock is {0} ahead of the real time.", formatNumber(days, locale, { style: "unit", unit: "day", unitDisplay: "long" }))}
            </p>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  ctx.clock?.advance(1440);
                  setAhead(ctx.clock?.offsetMinutes() ?? 0);
                }}
              >
                {t("Move the clock forward one day")}
              </button>
              {ahead > 0 && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => {
                    ctx.clock?.reset();
                    setAhead(0);
                  }}
                >
                  {t("Set the clock back to the real time")}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <h3>{t("Leaving Agely")}</h3>
      {!deleting ? (
        <div className="actions">
          <button type="button" className="danger" onClick={() => setDeleting(true)}>
            {t("Delete my account")}
          </button>
        </div>
      ) : (
        <div className="card">
          <p>{t("This removes your account, your profile, your briefs and any proposals still waiting for an answer. It cannot be undone.")}</p>
          {error !== null && (
            <p className="notice notice--error" role="alert">
              {t(error === "session-not-finished"
                ? "You have a booked session that has not finished. Cancel it or wait until it is over, then delete your account."
                : "You are not signed in.")}
            </p>
          )}
          <div className="actions">
            <button type="button" className="danger" onClick={() => void onDelete()}>
              {t("Yes, delete everything")}
            </button>
            <button type="button" className="secondary" onClick={() => setDeleting(false)}>
              {t("Keep my account")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
