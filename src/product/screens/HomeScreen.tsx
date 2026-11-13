import { useEffect, useState } from "react";
import type { Brief, ExpertProfile, Role } from "../model/types";
import { href } from "../routes";
import { chooseRole } from "../usecases/account";
import { formatWhen } from "../model/times";
import { type ProposalView, type SessionView, myProposals, mySessions } from "../usecases/booking";
import { myCurrentBrief } from "../usecases/brief";
import { myProfile } from "../usecases/profile";
import type { ScreenProps } from "./shared";

/** What an expert should do next, in one sentence and one link. */
interface Next {
  readonly text: string;
  readonly link: string;
  readonly to: string;
}

function expertNext(profile: ExpertProfile | null): Next {
  if (profile === null) return { text: "First, tell us about your work. It takes a few minutes and there is nothing to fill in.", link: "Start the interview", to: href("expert-interview") };
  if (profile.state === "draft") return { text: "Your profile is a draft. Nobody can see it until you publish it.", link: "See my profile", to: href("expert-profile") };
  if (!profile.priceConfirmed) return { text: "Your profile is published, but buyers can't be matched with you until you confirm a price.", link: "Set my price", to: href("expert-price") };
  return { text: "Your profile is published and buyers can be matched with you.", link: "See my profile", to: href("expert-profile") };
}

function buyerNext(brief: Brief | null): Next {
  if (brief === null) return { text: "Tell us what you need help with. An agent drafts a brief for you to check.", link: "Describe my problem", to: href("buyer-brief") };
  if (brief.state === "draft") return { text: "Your brief is a draft. Nobody is matched until you confirm it.", link: "Check my brief", to: href("buyer-brief") };
  return { text: "Your brief is confirmed.", link: "See my match", to: href("buyer-match") };
}

/** FR-002: choose how to use Agely; the current role is always stated. */
export function HomeScreen({ ctx, account, refresh }: ScreenProps) {
  const chosen = account.roles.length > 0;
  const [profile, setProfile] = useState<ExpertProfile | null | undefined>(undefined);
  const [brief, setBrief] = useState<Brief | null | undefined>(undefined);
  const [proposals, setProposals] = useState<readonly ProposalView[]>([]);
  const [sessions, setSessions] = useState<readonly SessionView[]>([]);

  useEffect(() => {
    void myProfile(ctx).then((result) => setProfile(result.ok ? result.value : null));
    void myCurrentBrief(ctx).then((result) => setBrief(result.ok ? result.value : null));
    void myProposals(ctx).then((result) => setProposals(result.ok ? result.value : []));
    void mySessions(ctx).then((result) => setSessions(result.ok ? result.value : []));
  }, [ctx, account]);

  async function onRole(role: Role) {
    await chooseRole(ctx, role);
    await refresh();
  }

  const lead = (
    <p className="lead">
      Signed in as {account.email}
      {chosen && <>, acting as {account.activeRole === "expert" ? "an expert" : "a buyer"}</>}.
    </p>
  );

  if (!chosen) {
    return (
      <div>
        <h2 tabIndex={-1}>How do you want to use Agely?</h2>
        {lead}
        <div className="cards">
          <div className="card">
            <h3>I have experience to share</h3>
            <p>Talk to an agent, review the profile it drafts, and set your own price.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void onRole("expert")}>
                Continue as an expert
              </button>
            </div>
          </div>
          <div className="card">
            <h3>I need help with a problem</h3>
            <p>Describe it, confirm a brief, and see who fits and why.</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void onRole("buyer")}>
                Continue as a buyer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const next = account.activeRole === "expert" ? (profile !== undefined ? expertNext(profile) : null) : brief !== undefined ? buyerNext(brief) : null;
  const other: Role = account.activeRole === "expert" ? "buyer" : "expert";
  const waitingForMe = proposals.filter((p) => p.proposal.expertId === account.id && p.proposal.state === "waiting").length;
  const mineForBrief = brief != null && proposals.some((p) => p.proposal.briefId === brief.id && p.proposal.buyerId === account.id);

  return (
    <div>
      <h2 tabIndex={-1}>What to do next</h2>
      {lead}
      {next !== null && (
        <div className="card">
          <p>{next.text}</p>
          <div className="actions">
            <a className="button-link" href={next.to}>
              {next.link}
            </a>
          </div>
        </div>
      )}
      {account.activeRole === "expert" && waitingForMe > 0 && (
        <div className="card">
          <p>
            You have {waitingForMe} {waitingForMe === 1 ? "proposal" : "proposals"} waiting for your answer.
          </p>
          <div className="actions">
            <a className="button-link" href={href("expert-inbox")}>
              Open my inbox
            </a>
          </div>
        </div>
      )}
      {account.activeRole === "buyer" && mineForBrief && (
        <div className="actions">
          <a className="button-link" href={href("buyer-proposal")}>
            See my proposal
          </a>
        </div>
      )}
      {sessions.length > 0 && (
        <>
          <h3>Your sessions</h3>
          <ul className="plain-list">
            {sessions.map((view) => (
              <li key={view.session.id}>
                <a href={href("session", { id: view.session.id })}>
                  Session with {view.session.buyerId === account.id ? view.expertName : view.buyerName} on {formatWhen(view.session.startsAt)}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="actions">
        <button type="button" className="quiet" onClick={() => void onRole(other)}>
          {other === "buyer" ? "Use Agely as a buyer instead" : "Use Agely as an expert instead"}
        </button>
      </div>
    </div>
  );
}
