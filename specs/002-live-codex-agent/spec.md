# Feature Specification: Live Agent via the Local Codex CLI

**Feature Branch**: `feat/live-agent`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Live agent mode via the local Codex CLI. In the Agely demo walkthrough,
the three agent conversations (Margaret's onboarding interview, Dev's brief chat, Margaret's
debrief) are generated live instead of scripted when the Codex CLI is installed and signed in on
the machine running the app: the agent asks real follow-up questions and offers 3 suggested replies
the person can pick, or they can type their own reply. No OpenAI API key is needed; the app reuses
whoever's ChatGPT sign-in Codex has. Profile, brief and workflow drafts stay scripted. Live mode
turns on automatically when Codex is ready; otherwise the scripted demo runs as today. Give an easy
setup for whoever runs the app later."

## Overview

Today every agent line in the walkthrough is scripted. This feature lets the three conversations
come from a real language model, reached through the Codex command-line tool already signed in on
the presenter's computer, so no API key has to be issued, stored or shared. The agent asks genuine
follow-up questions that react to what was said, and for every turn it offers three short replies
written in the voice of the person on screen; the presenter picks one or types their own. Everything
around the conversations (drafted profile, brief, match, booking, workflow, engine) keeps working
from the scripted story, so the demo always reaches the end. When live mode is not available the
walkthrough behaves exactly as it does today.

## Clarifications

### Session 2026-11-11

- Q: Which parts are generated live? → A: The three conversations (agent turns and three suggested
  replies per turn). Profile, brief and workflow drafts stay scripted.
- Q: How is live mode switched on? → A: Automatically when Codex is installed and signed in;
  otherwise the scripted demo runs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A live onboarding interview (Priority: P1)

The presenter opens Agely on a computer where Codex is installed and signed in. The start screen
shows "Live agent: ready". In Margaret's interview, the agent opens with a real question about her
career. Under it, three short replies in Margaret's voice are offered. The presenter picks one (or
types a reply as Margaret); the agent responds to that answer with a relevant follow-up, again with
three replies. After a few exchanges the agent wraps up, and the walkthrough continues to the
(scripted) draft profile.

**Why this priority**: It is the moment the pitch depends on — older experts talk to an agent — and
it proves real generation without an API key.

**Independent Test**: With Codex ready, run the interview to its end using only suggested replies,
then once using a typed reply; each agent turn reacts to the previous answer and offers exactly
three replies.

**Acceptance Scenarios**:

1. **Given** Codex is installed and signed in, **When** the app starts, **Then** the start screen
   says the live agent is ready and names the model in use.
2. **Given** live mode, **When** the interview step opens, **Then** the agent's first question
   appears with three suggested replies and a way to type a reply instead, and the turn is labelled
   as generated live.
3. **Given** a suggested reply is picked, **When** the agent answers, **Then** its answer refers to
   what was said and comes with three new suggested replies.
4. **Given** the agent is generating, **When** the presenter waits, **Then** the screen shows that
   the agent is thinking, and the reply options and Next are unavailable until it finishes.
5. **Given** at least one exchange has happened, **When** the agent closes the conversation or the
   presenter selects "Finish conversation", **Then** Next becomes available and the walkthrough
   continues with the scripted draft profile, which is labelled as the scripted draft.

---

### User Story 2 - Live brief chat and debrief (Priority: P2)

The same live behaviour applies to Dev's conversation with his buyer's agent and to Margaret's
debrief after the session. Each conversation has its own agent role and its own goal (understand
Dev's problem and budget; learn how Margaret reviews a contract-manufacturing agreement), and the
suggested replies are written as Dev or as Margaret respectively.

**Why this priority**: Shows that both sides of the market talk to agents, but the interview alone
already proves the capability.

**Independent Test**: Jump to "Dev's brief" and to "Debrief" with Codex ready; each conversation
runs live with three replies per turn in the right person's voice and can be finished.

**Acceptance Scenarios**:

1. **Given** live mode, **When** the brief chat opens, **Then** the buyer's agent asks Dev about his
   problem, and the suggested replies are written as Dev.
2. **Given** live mode, **When** the debrief opens, **Then** the agent asks Margaret how the session
   with Dev went, and the suggested replies are written as Margaret.
3. **Given** Dev's typed reply asks for legal, medical or financial advice, **When** the agent
   responds, **Then** it says Agely does not offer that advice and steers back to the commercial
   question.

---

### User Story 3 - Easy setup and graceful fallback (Priority: P3)

Someone new clones the project and runs it. If Codex is missing or not signed in, the walkthrough
runs scripted as today, and the start screen explains in plain language what is missing and the
one or two steps to fix it. After following them and selecting "Check again", the live agent
becomes ready without restarting the app. If a live turn fails mid-demo, the presenter can retry
or continue that conversation with the scripted lines.

**Why this priority**: Makes the feature usable by anyone who runs the app later, and keeps the
demo safe on stage.

**Independent Test**: On a machine without Codex, start the app: the scripted demo runs and the
start screen shows the setup steps. Simulate a failed turn: retry and switch-to-scripted both work.

**Acceptance Scenarios**:

1. **Given** Codex is not installed, **When** the app starts, **Then** the scripted walkthrough runs
   and the start screen shows "Live agent: off — Codex is not installed" with the install step.
2. **Given** Codex is installed but not signed in, **When** the app starts, **Then** the start
   screen shows the sign-in step.
3. **Given** the configured model is not allowed for the signed-in account, **When** readiness is
   checked, **Then** the start screen says so and explains how to choose another model.
4. **Given** setup is fixed, **When** the presenter selects "Check again", **Then** the status
   becomes ready without restarting the app.
5. **Given** a live turn fails or takes longer than the time limit, **When** the failure is shown,
   **Then** the presenter can select "Try again" or "Use the scripted conversation", and the demo
   continues either way.
6. **Given** live mode is ready, **When** the presenter turns live mode off on the start screen,
   **Then** the walkthrough uses the scripted conversations until it is turned back on.

### Edge Cases

- The agent's output is malformed or has fewer or more than three options: the turn is treated as
  failed (retry / scripted), never shown half-formed.
- The presenter types an empty reply: it is not sent.
- The presenter jumps to another chapter or restarts while the agent is thinking: the pending turn is
  discarded and never appears on a later screen.
- The presenter goes Back to a finished live conversation: the transcript is kept as it was.
- The live conversation reaches the maximum number of agent turns: the agent closes politely and
  Next becomes available.
- The internet is unavailable: readiness or the turn fails with a plain message, and the scripted
  path remains available.
- A suggested or typed reply contains personal data: only the conversation text and the scripted
  persona background are sent; nothing else from the computer is shared.

## Requirements *(mandatory)*

### Functional Requirements

**Readiness and setup**

- **FR-001**: On start, the app MUST check whether the live agent can run (tool installed, signed
  in, model allowed) and show the result on the start screen in plain language.
- **FR-002**: When the check passes, live mode MUST be on by default; otherwise the walkthrough MUST
  run scripted exactly as before this feature.
- **FR-003**: Each failing check MUST show the specific next step to fix it, and a "Check again"
  action MUST re-run the check without restarting the app.
- **FR-004**: The presenter MUST be able to turn live mode off and on from the start screen.
- **FR-005**: The model used MUST be changeable by whoever runs the app without changing code, and
  the start screen MUST name the model in use.
- **FR-006**: The live agent MUST NOT require an API key; it MUST use the existing sign-in of the
  tool on the computer.
- **FR-007**: The project MUST include setup instructions that let a new person enable live mode in
  under 5 minutes.

**Live conversations**

- **FR-008**: In live mode, the interview, brief chat and debrief MUST be generated by the live agent
  turn by turn, each with its own agent role, goal and persona background.
- **FR-009**: Every live agent turn MUST come with exactly three suggested replies written in the
  voice of the person on screen (Margaret or Dev), each no longer than 160 characters.
- **FR-010**: The presenter MUST be able to pick a suggested reply or type a reply; typed replies are
  sent only when non-empty.
- **FR-011**: While the agent is generating, the screen MUST say the agent is thinking, and the
  reply controls and Next MUST be unavailable.
- **FR-012**: A live conversation MUST end when the agent closes it or after at most 5 agent turns;
  the presenter MUST also be able to finish it after at least one exchange. Next becomes available
  only when the conversation has ended.
- **FR-013**: Live turns MUST be labelled as generated live; scripted turns and drafts MUST keep
  their scripted labelling. The scripted draft shown after a live conversation MUST say it is the
  scripted draft.
- **FR-014**: The live agent MUST decline legal, medical and financial advice and MUST NOT claim to
  publish, book, accept or pay for anyone.
- **FR-015**: A failed, malformed or timed-out turn (time limit: 60 seconds) MUST show a plain
  message with "Try again" and "Use the scripted conversation".
- **FR-016**: Jumping chapters, restarting or going back MUST discard any pending turn; a turn MUST
  only ever appear in the conversation that requested it.
- **FR-017**: Only the conversation so far and the persona background MUST be sent to the live agent.
  It MUST run in an empty temporary folder with a read-only sandbox (no network for any command it
  might run), with the tool's apps, browser and computer-use integrations disabled, ignoring the
  user's personal configuration and rules, and it MUST be instructed not to run commands or read
  files. (The tool cannot fully remove its command runner; these limits contain it.)
- **FR-018**: The start screen MUST tell the presenter, when live mode is on, that conversation text
  is sent to OpenAI through the signed-in account.

### Key Entities

- **Live agent status**: whether live mode can run, why not (not installed, not signed in, model not
  allowed, check failed), the next step to fix it, the model in use, and whether the presenter has
  turned it on.
- **Agent brief**: per conversation — the agent's role, goal, the persona background (Margaret or
  Dev), the person the replies are written as, and the maximum number of turns.
- **Live turn**: the agent's message, three suggested replies, whether the agent closed the
  conversation, and that it was generated live.
- **Live conversation**: the ordered turns (agent and person), whether a turn is pending, whether it
  has ended, and any failure message.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person new to the project, following the setup instructions, gets "Live agent:
  ready" in under 5 minutes on a computer that already has a ChatGPT account.
- **SC-002**: In a dry run of 20 live turns, at least 18 show the agent's answer and three replies
  within 30 seconds.
- **SC-003**: 100% of displayed live turns offer exactly three suggested replies.
- **SC-004**: On a computer without the tool, the walkthrough runs from start to engine with no error
  shown other than the readiness explanation.
- **SC-005**: After any live-turn failure, the presenter can continue the walkthrough within one
  action.
- **SC-006**: No API key is created, entered or stored to use live mode.

## Assumptions

- The presenter's computer has internet access and a ChatGPT account signed into the Codex tool;
  usage counts against that account's plan.
- Which models a ChatGPT sign-in may use varies by plan; on the development machine on 2026-11-11
  only one model was accepted, so the model must be configurable (FR-005).
- Generated content is not stored between app runs, like the rest of the demo.
- An OpenAI API-key path may be added later behind the same live-agent interface; it is out of scope
  here.
- Voice input and output remain out of scope; typed and suggested replies stand in for speech.
