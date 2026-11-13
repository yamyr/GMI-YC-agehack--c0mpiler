import { type FormEvent, useEffect, useState } from "react";
import { formatNumber } from "../../../site/i18n/core.js";
import { useI18n } from "../../i18n";
import { displaySkillDescription, displaySkillLabel } from "../model/catalogue";
import type { ExpertProfile, Skill } from "../model/types";
import { href } from "../routes";
import { myProfile, publishProfile, removeSkill, renameSkill, unpublishProfile } from "../usecases/profile";
import type { ScreenProps } from "./shared";

function SkillWording({ skill, label, onSave }: {
  readonly skill: Skill;
  readonly label: string;
  readonly onSave: (id: string, label: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);
  const id = `skill-${skill.id}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft === null || draft.trim() === label) return;
    if (await onSave(skill.id, draft.trim())) {
      setDraft((text) => text === draft ? null : text);
    }
  }

  return (
    <details className="type-instead">
      <summary>{t("Change the wording")}</summary>
      <form onSubmit={(e) => void submit(e)}>
        <div className="field">
          <label htmlFor={id}>{t("New wording for “{0}”", label)}</label>
          <input id={id} type="text" value={draft ?? label} onChange={(e) => setDraft(e.target.value === label ? null : e.target.value)} required />
        </div>
        <div className="actions">
          <button type="submit" className="secondary">
            {t("Save wording")}
          </button>
        </div>
      </form>
    </details>
  );
}

/** Story 1: review the draft, change it, and publish or unpublish. Only these buttons do either (FR-006). */
export function ExpertProfileScreen({ ctx, account }: ScreenProps) {
  const { locale, t } = useI18n();
  const [profile, setProfile] = useState<ExpertProfile | null | undefined>(undefined);

  useEffect(() => {
    void myProfile(ctx).then((result) => setProfile(result.ok ? result.value : null));
  }, [ctx]);

  const apply = (result: { ok: true; value: ExpertProfile } | { ok: false }) => {
    if (result.ok) setProfile(result.value);
  };

  if (profile === undefined) return <p className="lead">{t("Opening your profile…")}</p>;
  if (profile === null) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Your profile")}</h2>
        <p className="lead">{t("You don't have a profile yet.")}</p>
        <div className="actions">
          <a className="button-link" href={href("expert-interview")}>
            {t("Start the interview")}
          </a>
        </div>
      </div>
    );
  }

  const published = profile.state === "published";

  async function onRename(id: string, label: string) {
    const result = await renameSkill(ctx, id, label);
    apply(result);
    return result.ok;
  }

  return (
    <div>
      <h2 tabIndex={-1}>{account.name}</h2>
      <p>
        <span className={published ? "badge badge--done" : "badge badge--draft"}>{t(published ? "Published" : "Draft: not published")}</span>
      </p>
      <p className="lead">{profile.headline}</p>
      <ul className="plain-list">
        <li>{t("{0} years of experience", formatNumber(profile.yearsExperience, locale))}</li>
        {profile.location !== "" && <li>{profile.location}</li>}
      </ul>

      <h3>{t("Skills")}</h3>
      <div>
        {profile.skills.map((skill) => {
          const label = displaySkillLabel(skill, locale);
          return (
            <div className="competency" key={skill.id}>
              <p className="competency__label">{label}</p>
              <p>{displaySkillDescription(skill, locale)}</p>
              <p className="competency__source">
                {skill.source.kind === "interview"
                  ? t("From your interview (answer {0})", formatNumber(skill.source.turn, locale))
                  : t("Edited by you")}
              </p>
              <SkillWording skill={skill} label={label} onSave={onRename} />
              {profile.skills.length > 1 && (
                <button type="button" className="quiet" onClick={() => void removeSkill(ctx, skill.id).then(apply)}>
                  {t("Remove “{0}”", label)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="notice notice--info">{t("Credentials are self-declared. Agely has not checked this profile against any record.")}</p>

      <div className="actions">
        {published ? (
          <button type="button" className="secondary" onClick={() => void unpublishProfile(ctx).then(apply)}>
            {t("Unpublish my profile")}
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => void publishProfile(ctx).then(apply)}>
            {t("Publish my profile")}
          </button>
        )}
        <a className="button-link" href={href("expert-price")}>
          {t("Set my price")}
        </a>
        <a className="button-link button-link--quiet" href={href("expert-interview")}>
          {t("Redo the interview")}
        </a>
      </div>
    </div>
  );
}
