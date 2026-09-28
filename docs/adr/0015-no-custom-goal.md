# Only preset Цели; a Цель is the biggest Счастье purchase

The child can no longer write a Своя цель. Testers set its price to 1 and bought it at once, so the Цель taught nothing about saving. The picker offers only the three presets of the current Этап. It has no «Без цели» row either: picking a different preset is the only way to change the Цель. A Своя цель saved before this change is still read, shown as the active Цель, and can be bought from Копилка. The ADR-0012 rules still apply to it, so a cheap one does not skip the Этап. No migration touches stored rows.

A Цель used to give about +12 Счастье, less than the same coins spent on Конфета. Each preset now gives more Счастье the more it costs. Where the price is below the meter's range, it gives more per coin than the best Желаемое. Where the price outruns the meter, it fills at least nine tenths of Счастье in one purchase. The picker says under each preset that buying it moves the pet to the next Этап.

Supersedes ADR-0012 for new goals.

## Considered options

- **Keep Своя цель with a price floor at the Порог этапа.** Rejected: ADR-0012 already turned down that floor, and a child-set price still needs rules the child cannot see.
- **Migrate saved Свои цели away.** Rejected: that would take coins-in-progress meaning from a child's pot. Reading the saved row costs nothing.
