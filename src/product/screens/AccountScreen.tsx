import { SERVICE_NAMES } from "../copy";
import { serviceStatuses } from "../ports";
import type { ScreenProps } from "./shared";

/** Who is signed in and what the product is connected to. Deleting an account arrives with story 1. */
export function AccountScreen({ ctx, account }: ScreenProps) {
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
    </div>
  );
}
