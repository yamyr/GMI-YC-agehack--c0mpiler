import { useI18n } from "../../i18n";
import type { ConversationTurn, Speaker } from "../domain/types";

const PEOPLE: Readonly<Record<Exclude<Speaker, "agent">, string>> = {
  margaret: "Margaret",
  dev: "Dev",
};

interface TranscriptProps {
  readonly turns: readonly ConversationTurn[];
  readonly agentName: string;
}

/** Plain transcript of turns; announces new lines to screen readers. */
export function Transcript({ turns, agentName }: TranscriptProps) {
  return (
    <ol className="conversation" aria-live="polite">
      {turns.map((turn, index) => (
        <li key={index} className={`turn ${turn.speaker === "agent" ? "turn--agent" : "turn--person"}`}>
          <span className="turn__speaker">{turn.speaker === "agent" ? agentName : PEOPLE[turn.speaker]}</span>
          {turn.text}
        </li>
      ))}
    </ol>
  );
}

interface ConversationProps {
  readonly turns: readonly ConversationTurn[];
  readonly shown: number;
  readonly agentName: string;
  readonly onNextTurn: () => void;
}

/** FR-005: scripted turns revealed one at a time; stands in for a voice interview. */
export function Conversation({ turns, shown, agentName, onNextTurn }: ConversationProps) {
  const { t } = useI18n();

  const done = shown >= turns.length;
  return (
    <div>
      <Transcript turns={turns.slice(0, shown)} agentName={agentName} />
      <p className="conversation-caption">{t("This conversation stands in for a voice interview.")}</p>
      <div className="actions">
        <button type="button" className={done ? "secondary" : "primary"} onClick={onNextTurn} disabled={done}>
          {shown === 0 ? t("Start the conversation") : done ? t("Conversation finished") : t("Next line")}
        </button>
        <span className="muted" aria-hidden="true">{t("{0} of {1} lines", Math.min(shown, turns.length), turns.length)}</span>
      </div>
    </div>
  );
}
