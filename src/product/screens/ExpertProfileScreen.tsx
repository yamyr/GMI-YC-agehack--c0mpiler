import { type FormEvent, useEffect, useState } from "react";
import type { ExpertProfile, Skill } from "../model/types";
import { href } from "../routes";
import { myProfile, publishProfile, removeSkill, renameSkill, unpublishProfile } from "../usecases/profile";
import type { ScreenProps } from "./shared";

const sourceText = (skill: Skill): string => (skill.source.kind === "interview" ? `From your interview (answer ${skill.source.turn})` : "Edited by you");

/** Story 1: review the draft, change it, and publish or unpublish. Only these buttons do either (FR-006). */
export function ExpertProfileScreen({ ctx, account }: ScreenProps) {
  const [profile, setProfile] = useState<ExpertProfile | null | undefined>(undefined);

  useEffect(() => {
    void myProfile(ctx).then((result) => setProfile(result.ok ? result.value : null));
  }, [ctx]);

  const apply = (result: { ok: true; value: ExpertProfile } | { ok: false }) => {
    if (result.ok) setProfile(result.value);
  };

  if (profile === undefined) return <p className="lead">Opening your profile…</p>;
  if (profile === null) {
    return (
      <div>
        <h2 tabIndex={-1}>Your profile</h2>
        <p className="lead">You don't have a profile yet.</p>
        <div className="actions">
          <a className="button-link" href={href("expert-interview")}>
            Start the interview
          </a>
        </div>
      </div>
    );
  }

  const published = profile.state === "published";

  async function onRename(event: FormEvent<HTMLFormElement>, skill: Skill) {
    event.preventDefault();
    apply(await renameSkill(ctx, skill.id, String(new FormData(event.currentTarget).get("label") ?? "")));
  }

  return (
    <div>
      <h2 tabIndex={-1}>{account.name}</h2>
      <p>
        <span className={published ? "badge badge--done" : "badge badge--draft"}>{published ? "Published" : "Draft: not published"}</span>
      </p>
      <p className="lead">{profile.headline}</p>
      <ul className="plain-list">
        <li>{profile.yearsExperience} years of experience</li>
        {profile.location !== "" && <li>{profile.location}</li>}
      </ul>

      <h3>Skills</h3>
      <div>
        {profile.skills.map((skill) => (
          <div className="competency" key={skill.id}>
            <p className="competency__label">{skill.label}</p>
            <p>{skill.description}</p>
            <p className="competency__source">{sourceText(skill)}</p>
            <details className="type-instead">
              <summary>Change the wording</summary>
              <form onSubmit={(e) => void onRename(e, skill)}>
                <div className="field">
                  <label htmlFor={`skill-${skill.id}`}>New wording for “{skill.label}”</label>
                  <input id={`skill-${skill.id}`} name="label" type="text" defaultValue={skill.label} required />
                </div>
                <div className="actions">
                  <button type="submit" className="secondary">
                    Save wording
                  </button>
                </div>
              </form>
            </details>
            {profile.skills.length > 1 && (
              <button type="button" className="quiet" onClick={() => void removeSkill(ctx, skill.id).then(apply)}>
                Remove “{skill.label}”
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="notice notice--info">Credentials are self-declared. Agely has not checked this profile against any record.</p>

      <div className="actions">
        {published ? (
          <button type="button" className="secondary" onClick={() => void unpublishProfile(ctx).then(apply)}>
            Unpublish my profile
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => void publishProfile(ctx).then(apply)}>
            Publish my profile
          </button>
        )}
        <a className="button-link" href={href("expert-price")}>
          Set my price
        </a>
        <a className="button-link button-link--quiet" href={href("expert-interview")}>
          Redo the interview
        </a>
      </div>
    </div>
  );
}
