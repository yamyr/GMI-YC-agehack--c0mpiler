import { useI18n } from "../../i18n";
import { type ScreenProps, ScriptedDraftNote } from "./shared";

function Section({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  return (
    <>
      <h3>{title}</h3>
      <ul className="plain-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

/** FR-023: the debrief proposes a workflow; it joins the engine only when Margaret approves. */
export function WorkflowScreen({ state, dispatch }: ScreenProps) {
  const { t } = useI18n();

  const { workflow } = state;
  const approved = workflow.status === "approved";
  return (
    <div>
      <h2 tabIndex={-1}>{workflow.name}</h2>
      <p>
        <span className={`badge ${approved ? "badge--done" : "badge--draft"}`}>{approved ? t("Approved") : t("Proposed")}</span>
      </p>
      <p className="lead">{t("The agent wrote this from Margaret's debrief. It becomes part of her engine only if she approves it.")}</p>
      <ScriptedDraftNote state={state} after="debrief" />
      <div className="card">
        <Section title={t("Questions Margaret asks")} items={workflow.questions} />
        <Section title={t("Checks she runs")} items={workflow.checks} />
        <Section title={t("Mistakes she watches for")} items={workflow.watchOuts} />
      </div>
      {!approved && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "approveWorkflow" })}>{t("Approve for my engine")}</button>
        </div>
      )}
    </div>
  );
}
