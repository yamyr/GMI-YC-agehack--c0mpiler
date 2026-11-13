import { useState } from "react";
import { SERVICE_NAMES } from "../copy";
import { serviceStatuses } from "../ports";
import { deleteAccount } from "../usecases/profile";
import type { ScreenProps } from "./shared";

/** Who is signed in, what the product is connected to, and the way out (FR-003). */
export function AccountScreen({ ctx, account, refresh }: ScreenProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
