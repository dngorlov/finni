# A cheaper Своя цель does not advance Этап alone

Superseded by [ADR-0015](./0015-no-custom-goal.md): a Своя цель can no longer be written. One saved earlier still follows this rule.

Этап moves when the child buys the Цель. A Своя цель can cost less than the cheapest preset of that Этап — the Порог этапа. One such purchase would skip the step the presets are priced for, so cheaper Свои цели add their prices together and the stage moves only when the sum reaches the Порог. The Порог is shown only while that cheaper Своя цель is the active one. A preset, or a Своя цель at or above the Порог, still advances on that single purchase.

## Considered options

- **Any Своя цель advances Этап, whatever the price.** Rejected: a price of 1 would skip Новичок.
- **Refuse a price below the Порог.** Rejected: the child should be able to save for something small, and several small ones still make the step.
