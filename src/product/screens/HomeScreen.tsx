import { useEffect, useState } from "react";
import { formatNumber, type Translator } from "../../../site/i18n/core.js";
import { useI18n } from "../../i18n";
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

function expertNext(profile: ExpertProfile | null, t: Translator): Next {
  if (profile === null) return { text: t("First, tell us about your work. It takes a few minutes and there is nothing to fill in."), link: t("Start the interview"), to: href("expert-interview") };
  if (profile.state === "draft") return { text: t("Your profile is a draft. Nobody can see it until you publish it."), link: t("See my profile"), to: href("expert-profile") };
  if (!profile.priceConfirmed) return { text: t("Your profile is published, but buyers can't be matched with you until you confirm a price."), link: t("Set my price"), to: href("expert-price") };
  return { text: t("Your profile is published and buyers can be matched with you."), link: t("See my profile"), to: href("expert-profile") };
}

function buyerNext(brief: Brief | null, t: Translator): Next {
  if (brief === null) return { text: t("Tell us what you need help with. An agent drafts a brief for you to check."), link: t("Describe my problem"), to: href("buyer-brief") };
  if (brief.state === "draft") return { text: t("Your brief is a draft. Nobody is matched until you confirm it."), link: t("Check my brief"), to: href("buyer-brief") };
  return { text: t("Your brief is confirmed."), link: t("See my match"), to: href("buyer-match") };
}

/** FR-002: choose how to use Agely; the current role is always stated. */
export function HomeScreen({ ctx, account, refresh }: ScreenProps) {
  const { locale, t } = useI18n();
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
      {chosen
        ? t(account.activeRole === "expert" ? "Signed in as {0}, acting as an expert." : "Signed in as {0}, acting as a buyer.", account.email)
        : t("Signed in as {0}.", account.email)}
    </p>
  );

  if (!chosen) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("How do you want to use Agely?")}</h2>
        {lead}
        <div className="cards">
          <div className="card">
            <h3>{t("I have experience to share")}</h3>
            <p>{t("Talk to an agent, review the profile it drafts, and set your own price.")}</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void onRole("expert")}>
                {t("Continue as an expert")}
              </button>
            </div>
          </div>
          <div className="card">
            <h3>{t("I need help with a problem")}</h3>
            <p>{t("Describe it, confirm a brief, and see who fits and why.")}</p>
            <div className="actions">
              <button type="button" className="primary" onClick={() => void onRole("buyer")}>
                {t("Continue as a buyer")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const next = account.activeRole === "expert" ? (profile !== undefined ? expertNext(profile, t) : null) : brief !== undefined ? buyerNext(brief, t) : null;
  const other: Role = account.activeRole === "expert" ? "buyer" : "expert";
  const waitingForMe = proposals.filter((p) => p.proposal.expertId === account.id && p.proposal.state === "waiting").length;
  const mineForBrief = brief != null && proposals.some((p) => p.proposal.briefId === brief.id && p.proposal.buyerId === account.id);

  return (
    <div>
      <h2 tabIndex={-1}>{t("What to do next")}</h2>
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
            {t(waitingForMe === 1 ? "You have {0} proposal waiting for your answer." : "You have {0} proposals waiting for your answer.", formatNumber(waitingForMe, locale))}
          </p>
          <div className="actions">
            <a className="button-link" href={href("expert-inbox")}>
              {t("Open my inbox")}
            </a>
          </div>
        </div>
      )}
      {account.activeRole === "buyer" && mineForBrief && (
        <div className="actions">
          <a className="button-link" href={href("buyer-proposal")}>
            {t("See my proposal")}
          </a>
        </div>
      )}
      {sessions.length > 0 && (
        <>
          <h3>{t("Your sessions")}</h3>
          <ul className="plain-list">
            {sessions.map((view) => (
              <li key={view.session.id}>
                <a href={href("session", { id: view.session.id })}>
                  {t("Session with {0} on {1}", (view.session.buyerId === account.id ? view.expertName : view.buyerName) ?? t("Deleted account"), formatWhen(view.session.startsAt, locale))}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="actions">
        <button type="button" className="quiet" onClick={() => void onRole(other)}>
          {t(other === "buyer" ? "Use Agely as a buyer instead" : "Use Agely as an expert instead")}
        </button>
      </div>
    </div>
  );
}
