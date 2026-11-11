# Feature Specification: Demo Walkthrough — Margaret meets Dev

**Feature Branch**: `feat/demo-flow`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Build the first flow for us to demo. Agely is an expert network where
older people sell decades of experience in 15-minute sessions, and each expert grows an AI engine
that turns that experience into a business they own. The demo follows two fictional people:
Margaret, a retired procurement director, and Dev, a hardware founder about to sign his first
manufacturing contract. The data is scripted to show the product flow; agents, payments and
calendars are not yet connected."

## Overview

A presenter walks an audience through one complete Agely story in the desktop app, end to end:
Margaret becomes an expert by talking to an agent, sets her price, Dev describes his problem, Agely
matches them and explains why, they book and pay, and after the session Margaret's engine learns a
new workflow. Every step uses scripted data, is clearly labelled as a demo, and keeps every
decision in the hands of the person on screen.

## Clarifications

### Session 2026-11-11

- Q: How should the voice interview work in this build? → A: Scripted text turns the presenter
  advances; no audio or microphone.
- Q: How are Margaret's and Dev's sides shown? → A: One at a time, full screen, with a banner when
  the story switches person.
- Q: How much of the story does the first flow cover? → A: All three stories.
- Q: Should the presenter be able to trigger unhappy paths on purpose? → A: No dedicated detour
  controls; the script follows the happy path, and unhappy cases behave correctly if the presenter
  performs them (e.g. enters a non-overlapping price).
- Q: Can the presenter jump straight to a chapter? → A: Yes, via a chapter list; jumping fills
  earlier steps with the scripted defaults.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Margaret becomes an expert by talking (Priority: P1)

Margaret opens Agely and is greeted by an onboarding agent. Instead of a form, the agent asks her
about her career in short spoken-style questions. She answers (scripted replies), mentions a
document she has (her CV and a supplier-audit checklist), and the agent drafts a skill profile:
headline, years of experience, three to five competencies, and the kinds of problems she can help
with. Margaret reviews the draft, can change any line, and publishes it only when she confirms.
The agent then suggests a price range per 15 minutes, with the reasons behind it, and Margaret
sets her own range.

**Why this priority**: This is the heart of the pitch — older people are the supply, and they
never fill in a form. It is a viable demo on its own.

**Independent Test**: Start the demo, play Margaret's interview to the end, edit one competency,
confirm the profile, accept or change the suggested price, and see her published profile card.

**Acceptance Scenarios**:

1. **Given** the demo has started, **When** Margaret's interview begins, **Then** the agent's
   questions and her answers appear one turn at a time as a conversation, with no form fields
   shown to her.
2. **Given** the interview has finished, **When** the agent presents the drafted skill profile,
   **Then** the profile is marked "Draft — not published" and each competency shows which part
   of the conversation or document it came from.
3. **Given** a draft profile, **When** the agent asks "Anything you'd like to change?" and
   Margaret replies with a change (by picking a suggested reply, or typing the change as an
   alternative), and then selects "Publish my profile", **Then** the published profile shows her
   edit, and nothing was published before she selected it.
4. **Given** a published profile, **When** the agent suggests a price range per 15 minutes,
   **Then** it shows the range and the reasons, and Margaret answers the agent, either keeping it
   or naming a different range (a suggested reply, or typing her own range as an alternative),
   before confirming.

---

### User Story 2 - Dev gets a brief and a match he understands (Priority: P2)

Dev, a hardware founder, describes his problem to a buyer's agent: he is about to sign his first
contract with a contract manufacturer and does not know what to watch for. The agent turns this
into a clear brief: the problem in one sentence, the competency needed, the session length, and a
budget range per 15 minutes. Dev confirms the brief. Agely then shows Margaret as the match, with
an explanation: which of her competencies cover the brief, and where his budget and her price
overlap.

**Why this priority**: Shows the demand side and the matching logic that makes the network work.
Depends on a published expert existing (Story 1 or seeded data).

**Independent Test**: Start from the buyer side with Margaret's profile pre-seeded, confirm Dev's
brief, and see the match card with the overlap range and the reasons.

**Acceptance Scenarios**:

1. **Given** Dev's scripted problem description, **When** the buyer's agent drafts the brief,
   **Then** it shows the problem, required competency, session length and budget range, marked as
   a draft Dev can edit.
2. **Given** a confirmed brief and Margaret's published profile, **When** Agely matches, **Then**
   Margaret appears with a match explanation naming the overlapping competencies and the price
   overlap range.
3. **Given** a brief whose budget does not overlap any expert's price range, **When** Agely
   matches, **Then** it says no match was found and explains the gap instead of showing a
   misleading match.

---

### User Story 3 - They book, pay, meet, and Margaret's engine grows (Priority: P3)

Dev proposes a session to Margaret at a price inside the overlap. Margaret accepts. Agely shows a
session confirmation with a (demo) video-call link and states that payment is held until the
session has happened. After the session is marked as held, the agent debriefs Margaret with a few
questions; her answers become a proposed workflow in her engine (for example, "First read of a
contract-manufacturing agreement": the questions she asks, the checks she runs, the mistakes she
watches for). Margaret approves the workflow, and her engine view shows it alongside her earnings.

**Why this priority**: Completes the story and introduces the engine — the long-term value — but
the demo still works if it stops at the match.

**Independent Test**: Start from a seeded match, send and accept a proposal, mark the session as
held, complete the debrief, approve the workflow, and see the engine and earnings summary.

**Acceptance Scenarios**:

1. **Given** a match, **When** Dev proposes a 30-minute session at a price inside the overlap and
   Margaret accepts, **Then** a confirmation shows date, time, duration, total price, a demo call
   link, and "Payment held until the session takes place".
2. **Given** a confirmed session, **When** it is marked as held, **Then** payment status changes to
   "Released to Margaret" and the debrief begins.
3. **Given** the debrief is finished, **When** the agent proposes a workflow, **Then** it is marked
   "Proposed" and is added to Margaret's engine only after she selects "Approve".
4. **Given** an approved workflow, **When** Margaret views her engine, **Then** she sees the
   workflow, the session count and her earnings to date.

---

### Edge Cases

- The presenter needs to go back one step, or restart the whole demo, without relaunching the app.
- Margaret rejects the drafted profile entirely: the agent offers to redo the interview, and
  nothing is published.
- Margaret sets a price range whose minimum is higher than its maximum, or below zero: the range is
  not accepted and a plain-language message explains why.
- Dev's brief asks for legal, medical or financial advice: the brief cannot be confirmed until that
  request is removed, and the buyer's agent explains that Agely does not offer such advice.
- Margaret goes back and changes a skill on her published profile: the profile returns to draft and
  must be published again. If she changes a confirmed price, the price must be confirmed again. In
  both cases she is not matchable until she does, and the match is recomputed.
- Margaret declines Dev's proposal: Dev is told, no payment is held, and he can propose again.
- A proposal price outside the overlap range is flagged before it is sent.
- The window is resized to the minimum supported size: no text is cut off and every control
  remains reachable.

## Requirements *(mandatory)*

### Functional Requirements

**Demo framing**

- **FR-001**: The app MUST open on a demo start screen that introduces Margaret and Dev and states
  that all data is scripted and no agents, payments or calendars are connected.
- **FR-002**: Every demo screen MUST carry a visible "Demo — scripted data" label.
- **FR-003**: The presenter MUST be able to move forward, go back one step, and restart the
  walkthrough at any point.
- **FR-004**: The presenter MUST be able to see, at any point, which step of the walkthrough they
  are on and how many steps remain.
- **FR-004a**: The presenter MUST be able to jump directly to any of these chapters: Margaret
  onboards, Price, Dev's brief, Match, Book & pay, Debrief, Engine. Jumping MUST fill every earlier
  step with the scripted default outcome (published profile, confirmed price, confirmed brief,
  accepted session, as applicable).
- **FR-004b**: The walkthrough MUST NOT offer dedicated controls for unhappy paths; the edge cases
  listed below MUST still behave as described when the presenter's own inputs cause them.
- **FR-005**: The walkthrough MUST present agent conversations as scripted text turns that the
  presenter advances one at a time; no microphone or audio is used in this feature. The screen
  MUST say the conversation stands in for a voice interview.

**Onboarding and price (Margaret)**

- **FR-006**: The expert onboarding MUST be a conversation with an agent; no form fields may be
  shown to the expert for profile creation.
- **FR-007**: The agent MUST draft a skill profile with a headline, years of experience, three to
  five competencies, and example problems, each competency traceable to the interview or a
  document.
- **FR-008**: The expert MUST be able to rename or remove any drafted competency before publishing
  by replying to the agent (suggested replies are offered); typing the change directly is offered
  only as an alternative. A change after publishing returns the profile to draft.
- **FR-009**: The profile MUST NOT be published until the expert explicitly selects a publish
  action.
- **FR-010**: The agent MUST suggest a price range per 15 minutes in USD with at least two stated
  reasons, and the expert MUST be able to keep it or name her own range by replying to the agent
  (suggested replies offered; typing a range is an alternative) before confirming.
- **FR-011**: A price range MUST be rejected with an explanation if its minimum exceeds its
  maximum or either value is not a positive amount.
- **FR-012**: Self-declared credentials MUST be labelled as self-declared on the profile.

**Brief and match (Dev)**

- **FR-013**: The buyer's agent MUST turn the buyer's problem description into a brief with: a
  one-sentence problem, the competency needed, session length in 15-minute units, and a budget
  range per 15 minutes.
- **FR-014**: The buyer MUST be able to edit and must confirm the brief before matching.
- **FR-015**: Requests for legal, medical or financial advice MUST be declined with an explanation.
- **FR-016**: Matching MUST consider only experts whose competencies cover the brief's competency
  and whose price range overlaps the brief's budget range.
- **FR-017**: Every match MUST show an explanation listing the matching competencies and the
  overlapping price range.
- **FR-018**: When no expert qualifies, the app MUST say so and explain whether competency or
  price caused the gap.

**Book, pay, debrief, engine**

- **FR-019**: The buyer MUST be able to propose a session (length and price per 15 minutes); a
  price outside the overlap range MUST be flagged before sending.
- **FR-020**: The expert MUST accept or decline the proposal; nothing is booked or charged without
  her acceptance.
- **FR-021**: A confirmed session MUST show date, time, duration, total price, a call link marked
  as a demo, and a payment status of "held until the session takes place".
- **FR-022**: Marking the session as held MUST change payment status to "released" and start the
  expert's debrief.
- **FR-023**: The debrief MUST produce a proposed workflow (name, questions the expert asks, checks
  she runs, mistakes she watches for) that joins her engine only after she approves it.
- **FR-024**: The engine view MUST show approved workflows, completed session count, and earnings
  to date.
- **FR-025**: No agent action may publish, accept, book or pay; each of these MUST be a labelled
  action by the person concerned.

**Accessibility**

- **FR-026**: All text MUST be readable at a size no smaller than the app's minimum type size,
  every action MUST be reachable by keyboard with visible focus, and status MUST NOT be conveyed
  by colour alone.

### Key Entities

- **Expert**: a person selling experience. Name, headline, years of experience, location, competencies, price range, published flag, self-declared credentials.
- **Competency**: a named skill with a short description and its source (interview turn or document).
- **Conversation turn**: one line from an agent or a person, in order, with the speaker.
- **Price range**: a minimum and maximum per 15 minutes in USD, with reasons when an agent suggests it.
- **Brief**: a buyer's problem statement, required competency, session length (15-minute units), budget range, confirmed flag.
- **Match**: an expert paired with a brief, with matching competencies, overlap range, and an explanation.
- **Session**: a booked meeting between buyer and expert. Date, time, length, agreed price per 15 minutes, total, call link, status (proposed, accepted, declined, held), payment status (none, held, released).
- **Workflow**: a reusable piece of the expert's thinking. Name, questions, checks, watch-outs, status (proposed, approved).
- **Engine**: an expert's approved workflows plus session count and earnings to date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A presenter can run the whole walkthrough, from start screen to Margaret's engine, in
  under 7 minutes without help.
- **SC-002**: A presenter can restart the demo and be back at the start screen in one action, at
  any step.
- **SC-003**: In a dry run, an observer can say at each step who decided and what the agent only
  suggested (100% of publish, accept, book and pay steps are human actions).
- **SC-004**: Every screen of the walkthrough is fully usable at the app's minimum window size, with
  no text cut off.
- **SC-005**: The walkthrough runs completely offline, with no failed network requests.
- **SC-006**: 9 out of 10 first-time viewers in a dry run can explain why Margaret was matched to
  Dev after seeing the match screen.

## Assumptions

- One presenter drives the whole demo on a single machine; Margaret's and Dev's views appear in
  the same app window, one person at a time, full screen; when the story switches person, a
  clear banner names who is now on screen (for example "Now: Dev, the buyer"). The one exception
  is the session confirmation, which shows the shared booking to both and is bannered
  "Margaret and Dev".
- Scope of the first flow covers all three stories (onboard and price; brief and match; book,
  pay, debrief and engine).
- Scripted data: Margaret Okafor, 68, retired procurement director, 34 years in procurement and
  supplier management. Dev Patel, founder of a 6-person hardware startup about to sign his first
  contract-manufacturing agreement. Suggested price $60–$90 per 15 minutes; Dev's budget $50–$100
  per 15 minutes; overlap $60–$90; proposed 30-minute session at $75 per 15 minutes ($150 total).
- Dates and times in the demo are shown relative to today so the demo never looks stale.
- Nothing typed or changed during the demo needs to survive an app restart.
- Real voice agents, payments, calendars and data storage are out of scope for this feature.
