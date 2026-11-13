import { useState } from "react";
import { SERVICE_NAMES } from "../copy";
import { serviceStatuses } from "../ports";
import { deleteAccount } from "../usecases/profile";
import type { ScreenProps } from "./shared";

/** Who is signed in, what the product is connected to, and the way out (FR-003). */
export function AccountScreen({ ctx, account, refresh }: ScreenProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ahead, setAhead] = useState(() => ctx.clock?.offsetMinutes() ?? 0);
  const days = Math.round(ahead / 1440);

  async function onDelete() {
    const result = await deleteAccount(ctx);
    if (result.ok) await refresh();
    else setError(result.error === "session-not-finished" ? "You have a booked session that has not finished. Cancel it or wait until it is over, then delete your account." : "You are not signed in.");
  }

  return (
    <div>
      <h2 tabIndex={-1}>Your account</h2>
      <dl className="facts-list">
        <div>
          <dt>Email address</dt>
          <dd>{account.email}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{account.name === "" ? "Not given yet" : account.name}</dd>
        </div>
        <div>
          <dt>You use Agely as</dt>
          <dd>{account.roles.length === 0 ? "Not chosen yet" : account.roles.map((r) => (r === "expert" ? "an expert" : "a buyer")).join(" and ")}</dd>
        </div>
      </dl>
      <h3>What is connected</h3>
      <ul className="plain-list">
        {serviceStatuses(ctx.ports).map((status) => (
          <li key={status.service}>
            <strong>{SERVICE_NAMES[status.service]}:</strong> {status.connected ? "connected" : status.label}
          </li>
        ))}
      </ul>

      {ctx.clock !== undefined && (
        <>
          <h3>Trying out what happens later</h3>
          <div className="stand-in" data-stand-in="clock">
            <p>
              <strong>Try-out clock.</strong> A stand-in for waiting: move Agely's clock forward to see what happens after a session has taken place.
            </p>
            <p>{ahead === 0 ? "The clock shows the real time." : `The clock is ${days} ${days === 1 ? "day" : "days"} ahead of the real time.`}</p>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  ctx.clock?.advance(1440);
                  setAhead(ctx.clock?.offsetMinutes() ?? 0);
                }}
              >
                Move the clock forward one day
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
                  Set the clock back to the real time
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <h3>Leaving Agely</h3>
      {!deleting ? (
        <div className="actions">
          <button type="button" className="danger" onClick={() => setDeleting(true)}>
            Delete my account
          </button>
        </div>
      ) : (
        <div className="card">
          <p>This removes your account, your profile, your briefs and any proposals still waiting for an answer. It cannot be undone.</p>
          {error !== null && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="button" className="danger" onClick={() => void onDelete()}>
              Yes, delete everything
            </button>
            <button type="button" className="secondary" onClick={() => setDeleting(false)}>
              Keep my account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
