# Feature Specification: Marketplace Foundation

**Feature Branch**: `004-marketplace-foundation`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Scaffold the product: accounts, stored profiles, live matching,
Stripe for held payments, calendar links. Turn the scripted Agely demo into the scaffold of a
working product. The first deliverable must run end to end with test-mode or mock adapters and no
real money. Buyers are in the United States; experts may be anywhere. Sessions are sold in
15-minute units priced in USD."

## Overview

Today Agely is a walkthrough. Margaret and Dev are fictional, every answer is scripted, and
nothing survives closing the app. This feature builds the foundation of the real product
underneath the same screens: real people can sign in, an expert's profile and price are kept, a
buyer's brief is matched against the experts who are actually published, a payment is held when
the expert accepts, and both people get a link to meet.

It is a foundation, not a launch. The first version must work from start to finish without moving
real money or depending on an outside service being reachable, and it must say plainly, on screen,
which parts are connected to something real and which are stand-ins. The scripted walkthrough
stays available, still labelled as a demo.

The five human decisions from the walkthrough do not change: an expert publishes their own
profile and confirms their own price, a buyer confirms their own brief and proposes a session, and
the expert accepts or declines. No agent and no automatic process takes any of those steps.

## Clarifications

### Session 2026-11-14

- Q: Where does the real product run? → A: A website first. The desktop app keeps the scripted
  walkthrough and the optional live agent.
- Q: Does this version connect to real outside services? → A: No. It runs on stand-ins behind
  interfaces, fully tested and labelled on screen. Real services follow once the owner has created
  the accounts.
- Q: Does this version pay experts out? → A: No. It records what each expert is owed and shows it
  on their earnings page; payouts are made by hand for now.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An expert's profile is kept (Priority: P1)

Ruth, 71, a retired hospital pharmacist, opens Agely and signs in without filling in a form. She
talks to the onboarding agent, reviews the profile it drafts, changes one skill, publishes it, and
confirms a price range. She closes Agely. The next day she opens it again, signs in, and her
published profile and price are there exactly as she left them. She unpublishes it while she is
on holiday and publishes it again when she is back.

**Why this priority**: Nothing else in the product can be real until an expert exists who is not
scripted. It is also the smallest slice that proves accounts and stored data work.

**Independent Test**: Create an expert account, publish a profile with a price, end the session,
start a new one as the same person, and find the same profile, price and published state.

**Acceptance Scenarios**:

1. **Given** a new visitor, **When** they choose to join as an expert, **Then** they can sign in
   by confirming a link or code sent to them, without typing a password or completing a form.
   With the sign-in stand-in, the code is shown on screen and labelled as a stand-in.
2. **Given** a signed-in expert with no profile, **When** they finish the interview, **Then** a
   draft profile is saved to their account and marked as not published.
3. **Given** a draft profile, **When** the expert edits a skill and publishes, **Then** the
   profile is saved as published and shows that its credentials are self-declared.
4. **Given** a published expert, **When** they sign in again later, **Then** their profile, price
   range and published state are unchanged. (Across devices once real storage is connected; on
   the same device with the stand-in.)
5. **Given** a published expert, **When** they unpublish, **Then** they stop appearing in matches
   until they publish again, and nothing else about their profile is lost.
6. **Given** two different experts, **When** one is signed in, **Then** they can see and change
   only their own profile and price.

---

### User Story 2 - A buyer is matched with real experts (Priority: P2)

Sam, a founder in Ohio, signs in as a buyer and describes a problem. The agent drafts a brief with
a session length and a budget; Sam edits and confirms it. Agely compares the brief with every
expert who is currently published and shows the best match, with the reasons, plus the experts
who were not chosen and why. If nobody fits, Sam is told whether the gap is skill or price.

**Why this priority**: Matching against people who really signed up is what turns the directory
into a marketplace. It depends on story 1 for experts to exist.

**Independent Test**: With three published experts (one fitting, one without the skill, one priced
outside the budget), confirm a brief and see the fitting expert chosen with its reasons and the
other two listed with theirs.

**Acceptance Scenarios**:

1. **Given** a signed-in buyer, **When** they confirm a brief, **Then** the brief is saved to
   their account and can be reopened later.
2. **Given** a confirmed brief, **When** matching runs, **Then** only experts who are published
   with a confirmed price at that moment are considered.
3. **Given** a match, **When** the buyer views it, **Then** they see which skill fits, where the
   price ranges overlap, and the expert's experience, in the same words the walkthrough uses.
4. **Given** no expert fits, **When** the buyer views the result, **Then** they are told whether
   no one lists the skill or no one's price overlaps the budget, and what they could change.
5. **Given** an expert who unpublishes after a brief was matched, **When** the buyer returns to
   the match, **Then** the match is shown as no longer available and matching can be run again.
6. **Given** a brief that asks for legal, medical or financial advice, **When** the buyer tries to
   confirm it, **Then** it is declined with a clear explanation, as in the walkthrough.

---

### User Story 3 - A session is booked and the payment is held (Priority: P3)

Sam proposes 30 minutes at a price inside the overlap, on a date and time. Ruth sees the proposal
and accepts it. At that moment, and not before, Sam's payment is held and both of them see a
confirmed session with a link to meet and an entry they can add to their calendar. If Ruth
declines, nothing is held and Sam is told.

**Why this priority**: This is where money and time are committed. It needs stories 1 and 2, and
it carries the most risk, so it comes after they are solid.

**Independent Test**: Run a proposal through acceptance in a test environment and observe a held
payment for the right amount, a confirmed session visible to both people, and a meeting link;
then run a decline and observe that nothing is held.

**Acceptance Scenarios**:

1. **Given** a match, **When** the buyer proposes a session, **Then** the price must fall inside
   the shared price range and the length must be a whole number of 15-minute units, or the
   proposal is refused with the reason.
2. **Given** a proposal, **When** the expert has not answered, **Then** nothing is booked and
   nothing is charged or held.
3. **Given** a proposal, **When** the expert accepts, **Then** the buyer's payment is held for
   the full session price and the session becomes confirmed for both people.
4. **Given** the payment cannot be held, **When** the expert accepts, **Then** the session is not
   confirmed, the expert is told the booking did not go through, and the buyer is asked to fix
   their payment.
5. **Given** a confirmed session, **When** either person opens it, **Then** they see the date and
   time in their own time zone, the price, a link to meet, and a way to add it to their calendar.
6. **Given** a proposal, **When** the expert declines, **Then** the buyer is told and can propose
   again or look for another expert.
7. **Given** an expert who is not the one the proposal was sent to, **When** they are signed in,
   **Then** they cannot see or answer it.

---

### User Story 4 - The session ends and the expert is paid (Priority: P4)

After the session, Ruth marks it as held. The held payment is released to her, less Agely's fee,
and her earnings page shows the session and the amount. If the session is cancelled before it
starts, the hold is lifted and Sam is not charged.

**Why this priority**: It completes the loop and produces the number the project exists for:
dollars earned by people over 65. It cannot be built before story 3.

**Independent Test**: Take a confirmed session to "held" and observe the payment released and the
expert's earnings updated; cancel another confirmed session and observe the hold lifted.

**Acceptance Scenarios**:

1. **Given** a confirmed session whose time has passed, **When** the expert marks it as held,
   **Then** the payment is released and the expert's earnings show the session and the amount
   they receive.
2. **Given** a confirmed session that has not started, **When** either person cancels it,
   **Then** the hold is lifted, both people are told, and the buyer is not charged.
3. **Given** a released payment, **When** the expert views their earnings, **Then** the session
   price, Agely's fee and the amount they receive are shown separately.
4. **Given** a session whose time has passed and that nobody has marked, **When** the expert or
   buyer opens it, **Then** it is shown as awaiting confirmation and the payment stays held.

---

### User Story 5 - The walkthrough still works, and everything is labelled (Priority: P5)

Someone who is not signed in can still open the scripted walkthrough with Margaret and Dev. In the
real product, every screen that depends on a stand-in instead of a connected service says so.

**Why this priority**: The walkthrough is how Agely is presented today and must not regress.
Honest labelling is a constitution rule, and it matters most once real accounts exist.

**Independent Test**: Open the walkthrough signed out and complete it; then, in the product with
stand-ins active, find a visible label on each screen that depends on one.

**Acceptance Scenarios**:

1. **Given** a visitor who is not signed in, **When** they open the walkthrough, **Then** it runs
   as it does today, labelled as scripted data, and stores nothing.
2. **Given** the product is running with a stand-in for payments, **When** a payment is held or
   released, **Then** the screen says no money has moved.
3. **Given** the product is running with a stand-in for meetings, **When** a session is confirmed,
   **Then** the link is shown as a placeholder and not as a real meeting.
4. **Given** a signed-in person, **When** they look for it, **Then** they can tell from the app
   which services are connected and which are stand-ins.

---

### Edge Cases

- The sign-in link or code expires, is used twice, or is opened on a different device from the
  one that asked for it.
- One person wants to be both an expert and a buyer.
- An expert changes their price range after a buyer has matched with them but before a proposal
  is accepted: the proposal is checked against the range in force when the expert answers.
- Two buyers propose overlapping times to the same expert: the expert may accept only one of
  them, and the other buyer is told the time is no longer available.
- The expert accepts twice in quick succession, or the app loses its connection after accepting:
  the payment is held once.
- The buyer and expert are in different time zones, or the session falls across a daylight-saving
  change.
- A person asks for their account and everything in it to be deleted.
- A stored profile was written by an agent draft that the expert never published: it is never
  shown to buyers.
- The service that stores data cannot be reached: the person is told plainly, and nothing they
  typed or said is silently lost.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts**

- **FR-001**: A person MUST be able to create an account and sign in by confirming a link or code
  sent to them, without a password and without completing a form.
- **FR-002**: An account MUST be able to act as an expert, as a buyer, or as both, with the
  current role always visible.
- **FR-003**: A signed-in person MUST be able to sign out, and MUST be able to request deletion
  of their account and its stored data.
- **FR-004**: Each person MUST be able to read and change only their own profile, price, briefs
  and payment details. A proposal or session MUST be visible only to its buyer and its expert.

**Stored profiles, prices and briefs**

- **FR-005**: An expert's profile, including each skill and where it came from, MUST be stored
  with a state of draft or published, and MUST show its credentials as self-declared.
- **FR-006**: Publishing and unpublishing a profile, and confirming a price range, MUST each be an
  explicit action by the expert. No agent or automatic process may perform them.
- **FR-007**: A buyer's brief (problem, skill needed, session length in 15-minute units, budget
  range) MUST be stored with a state of draft or confirmed, and confirming it MUST be an explicit
  action by the buyer.
- **FR-008**: Stored data MUST survive closing the app. With real storage it MUST also be
  available when the same person signs in on another device; with the stand-in it is kept on the
  device it was entered on, and the product says so.

**Matching**

- **FR-009**: Matching MUST consider only experts who are published with a confirmed price range
  at the time it runs.
- **FR-010**: Matching MUST use the existing rule: the expert lists the skill the brief needs and
  their price range overlaps the buyer's budget; among those, the widest overlap ranks first and
  longer experience breaks ties.
- **FR-011**: Every match MUST show its reasons, and every expert who was considered and not
  chosen MUST be shown with the reason. When no one fits, the buyer MUST be told whether the gap
  is skill or price.
- **FR-012**: Briefs asking for legal, medical or financial advice MUST be declined with a clear
  explanation.

**Proposals, payments and sessions**

- **FR-013**: A buyer MUST be able to propose a session to a matched expert with a length, a price
  per 15 minutes inside the shared range, and a date and time. Proposing MUST be an explicit
  action.
- **FR-014**: Accepting or declining a proposal MUST be an explicit action by the expert it was
  sent to. Nothing is booked, charged or held before acceptance.
- **FR-015**: On acceptance, the buyer's payment MUST be held for the full session price. If the
  hold fails, the session MUST NOT be confirmed.
- **FR-016**: A held payment MUST be held exactly once per session, however many times acceptance
  is submitted.
- **FR-017**: A confirmed session MUST give both people a link to meet and a way to add the
  session to their own calendar, with times shown in each person's time zone.
- **FR-018**: When the expert marks a session as held, the payment MUST be released to the expert
  less Agely's fee. When a session is cancelled before it starts, the hold MUST be lifted.
- **FR-019**: An expert MUST be able to see their sessions and earnings, with the session price,
  Agely's fee and the amount owed to them shown separately. This version records what is owed;
  it does not send money to experts, and the earnings page MUST say that payouts are made by hand.
- **FR-020**: All prices MUST be in US dollars per 15 minutes, and all amounts MUST be calculated
  in whole cents.

**Honesty and continuity**

- **FR-021**: Each outside service (data, payments, meetings) MUST be replaceable by a stand-in,
  and the product MUST run from start to finish with stand-ins only.
- **FR-022**: Wherever a stand-in is in use, the screen MUST say so in plain words, and a payment
  stand-in MUST say that no money has moved.
- **FR-023**: The scripted walkthrough MUST remain available without signing in, labelled as
  scripted, and MUST NOT store anything.
- **FR-024**: Every new or changed screen MUST meet the Older Adults First rules: no text below
  16px, primary controls at least 56px tall, visible keyboard focus, and no meaning carried by
  colour alone.
- **FR-025**: The signed-in product MUST run as a website that needs no installation. The desktop
  app keeps the scripted walkthrough and the optional live agent, and is not required to offer
  sign-in in this version.
- **FR-026**: This version MUST ship with stand-ins for data, sign-in, payments and meetings, and
  no real outside service. Each stand-in MUST sit behind an interface whose behaviour is fixed by
  tests, so that a real service can replace it later without changing the screens or the rules.
- **FR-027**: Because sign-in and storage are stand-ins in this version, the product MUST say on
  its first screen that accounts are for trying Agely out, that data is kept only on this device,
  and that nothing entered is private or permanent.

### Key Entities

- **Account**: A person who has signed in. Has a way to be reached for sign-in, a time zone, and
  the roles they use (expert, buyer or both).
- **Expert profile**: Belongs to one account. Headline, years of experience, location, skills
  (each with a label, a description and its source), example problems, a price range per 15
  minutes, a draft or published state, and a self-declared marker.
- **Brief**: Belongs to one buyer account. The problem in one sentence, the skill needed, the
  length in 15-minute units, a budget range, and a draft or confirmed state.
- **Match**: The result of comparing one brief with the published experts at one moment: the
  chosen expert, the shared price range, the reasons, and the experts not chosen with theirs.
- **Proposal**: From one buyer to one expert, for one brief: length, price per 15 minutes, date
  and time, and a state of waiting, accepted, declined or withdrawn.
- **Session**: Created when a proposal is accepted: its time, its price, its meeting link, and a
  state of confirmed, awaiting confirmation, held or cancelled.
- **Payment**: Belongs to one session: the amount, Agely's fee, and a state of held, released or
  lifted. Records whether it went through a real service or a stand-in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new expert can go from opening Agely to a published profile with a confirmed
  price in under 10 minutes, without typing anything except, at most, the address or number their
  sign-in is sent to.
- **SC-002**: A profile published in one session is found unchanged in a later session, in 100%
  of attempts across a test run of at least 20.
- **SC-003**: With a mixed set of at least 20 stored experts, a confirmed brief shows its match
  and reasons within 2 seconds.
- **SC-004**: In a test run of at least 50 accepted proposals, including repeated and interrupted
  acceptances, every session has exactly one held payment for the correct amount.
- **SC-005**: In the same run, no person can read or change another person's profile, brief,
  proposal, session or payment (0 successful attempts).
- **SC-006**: The whole journey, from two new accounts to a released payment, can be completed
  using stand-ins only, with no outside service reachable and no real money moved.
- **SC-010**: Each stand-in passes a shared set of behaviour tests written against its interface,
  so the same tests can later be run against the real service.
- **SC-007**: Every screen that depends on a stand-in carries a visible label saying so (100% of
  such screens, checked by test).
- **SC-008**: The scripted walkthrough still passes all of its existing checks.
- **SC-009**: Every new screen passes the accessibility checks the walkthrough already passes.

## Assumptions

- Sign-in is by a one-time link or code sent to an email address. Phone sign-in and sign-in with
  another provider can come later.
- Identity and credentials stay self-declared. Verifying who an expert is, or what they have
  done, is out of scope.
- The onboarding, brief and debrief conversations work as they do today (scripted, or live where
  the optional agent is available). This feature stores their results; it does not change how
  they are produced.
- Agely's fee is a single percentage of the session price, set in one place, 10% to begin with.
- The constitution names the intended services: Supabase for data, Stripe for held payments, and
  Google Meet or Zoom for sessions. Choosing among them and how they are wired is for the plan.
- Buyers are in the United States and pay in US dollars. Experts may be anywhere. Paying experts
  out, tax forms and identity checks required by a payment provider are not part of this version.
- With stand-ins, two people trying Agely on the same device share its stored data. That is
  enough to walk both sides of a booking; it is not a multi-user service.
- Out of scope: voice input, generating profile or brief drafts live, the expert's engine and
  workflows beyond what the walkthrough shows, ratings and reviews, disputes and refunds after a
  session was held, reminders by email or text, search or browsing of experts, an admin console,
  and languages other than those the app already supports.
- The marketplace uses the walkthrough's shared translation system. Its interface uses English
  and the 17 additional locales in spec 003. Names and user-entered text keep their original language.
- A constitution amendment is expected: principle V says no backend is added until a spec
  requires it, and this spec is that requirement.
