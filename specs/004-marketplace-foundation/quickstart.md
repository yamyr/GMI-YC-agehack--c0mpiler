# Quickstart: Marketplace Foundation

How to check that the feature works. Contracts and data shapes are in
[contracts/](contracts/) and [data-model.md](data-model.md).

## Prerequisites

`bun install`. Nothing else: no accounts, keys or network.

## Automated checks

```bash
bunx vitest run src/product          # contract suites, use cases, model
bunx playwright test e2e/product-*   # one journey per story, honesty labels, accessibility
```

Then the full set from `AGENTS.md` before calling the feature done.

## By hand

Run `bun run dev` and open `http://localhost:1420/#/app`.

1. **Story 1.** Join as an expert with any email address. Enter the code shown in the stand-in
   box. Answer the interview, change one skill, publish, confirm a price. Close the tab, reopen,
   sign in with the same address: the profile is published with the same price. Unpublish, then
   publish again.
2. **Story 2.** Sign out. Join as a buyer with a different address. Describe a problem that needs
   one of the expert's skills with a budget that overlaps their price. Confirm the brief: the
   expert is matched, with reasons. Change the budget so it no longer overlaps and match again:
   the result says the gap is price.
3. **Story 3.** Propose 30 minutes at a price in the shared range, tomorrow. Sign out, sign in as
   the expert, open the inbox, accept. Both accounts now show a confirmed session with a held
   payment labelled "no money has moved", a placeholder meeting link, and "Add to calendar",
   which downloads an `.ics` file your calendar opens.
4. **Story 4.** A session cannot be marked held before its end. Use the try-out clock on the
   account screen to move past it, mark the session held, and open earnings: session price, fee
   and amount owed are listed, with the note that payouts are made by hand.
5. **Story 5.** Sign out and open `http://localhost:1420/`: the scripted walkthrough runs as
   before. On every product screen from steps 1 to 4, a stand-in label was visible.

## Limits of the stand-ins (R18)

- Use one browser tab. Two tabs writing at once can overwrite each other.
- A proposal appears in the expert's inbox when they next open it. Nothing is sent to them.
- Anyone can sign in as any address on this device. The stand-in proves nothing about identity.

## Expected failures worth seeing

- A second expert account cannot open the first one's session by its address.
- Entering a sign-in code twice, or after ten minutes, is refused with a plain sentence.
- Pressing Accept twice creates one session and one held payment.
