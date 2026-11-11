import type { ScreenProps } from "./shared";

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
  const { workflow } = state;
  const approved = workflow.status === "approved";
  return (
    <div>
      <h2 tabIndex={-1}>{workflow.name}</h2>
      <p>
        <span className={`badge ${approved ? "badge--done" : "badge--draft"}`}>{approved ? "Approved" : "Proposed"}</span>
      </p>
      <p className="lead">The agent wrote this from Margaret's debrief. It becomes part of her engine only if she approves it.</p>
      <div className="card">
        <Section title="Questions Margaret asks" items={workflow.questions} />
        <Section title="Checks she runs" items={workflow.checks} />
        <Section title="Mistakes she watches for" items={workflow.watchOuts} />
      </div>
      {!approved && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "approveWorkflow" })}>
            Approve for my engine
          </button>
        </div>
      )}
    </div>
  );
}
