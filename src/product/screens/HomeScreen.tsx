import type { Role } from "../model/types";
import { chooseRole } from "../usecases/account";
import type { ScreenProps } from "./shared";

/** FR-002: choose how to use Agely; the current role is always stated. */
export function HomeScreen({ ctx, account, refresh }: ScreenProps) {
  const chosen = account.roles.length > 0;

  async function onRole(role: Role) {
    await chooseRole(ctx, role);
    await refresh();
  }

  const button = (role: Role, label: string) => (
    <button type="button" className={chosen && account.activeRole === role ? "secondary" : "primary"} onClick={() => void onRole(role)}>
      {label}
    </button>
  );

  return (
    <div>
      <h2 tabIndex={-1}>{chosen ? "You are signed in" : "How do you want to use Agely?"}</h2>
      <p className="lead">
        Signed in as {account.email}
        {chosen && <>, acting as {account.activeRole === "expert" ? "an expert" : "a buyer"}</>}.
      </p>
      <div className="cards">
        <div className="card">
          <h3>I have experience to share</h3>
          <p>Talk to an agent, review the profile it drafts, and set your own price.</p>
          <div className="actions">{button("expert", "Continue as an expert")}</div>
        </div>
        <div className="card">
          <h3>I need help with a problem</h3>
          <p>Describe it, confirm a brief, and see who fits and why.</p>
          <div className="actions">{button("buyer", "Continue as a buyer")}</div>
        </div>
      </div>
      {chosen && <p className="notice notice--info">The {account.activeRole === "expert" ? "interview, profile and price" : "brief and match"} screens are the next part of this build.</p>}
    </div>
  );
}
