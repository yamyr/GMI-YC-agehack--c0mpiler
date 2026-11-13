import { useI18n } from "../../i18n";
import type { Persona } from "../domain/types";

const LABELS: Readonly<Record<Persona, { readonly text: string; readonly initials: string }>> = {
  margaret: { text: "Now: Margaret, the expert", initials: "M" },
  dev: { text: "Now: Dev, the buyer", initials: "D" },
  both: { text: "Now: Margaret and Dev", initials: "M+D" },
};

/** Says in words whose side of the story is on screen (never colour alone). */
export function PersonaBanner({ persona }: { readonly persona: Persona }) {
  const { t } = useI18n();
  const { text, initials } = LABELS[persona];
  return (
    <div className="persona-banner" role="status">
      <span className="persona-banner__avatar" aria-hidden="true">
        {initials}
      </span>
      {t(text)}
    </div>
  );
}
