# Open pet name tags remain clickable

The integrated C3 browser check reproduced eight failures (four viewport/theme cases,
including each retry) in the existing Shelf name-tag journey. The button was visible and
enabled, but a neighbouring corgi's SVG intercepted the real pointer click.

The trace's exact clock was **2026-10-02T06:02:52.761Z** (`1790920972761`). The new
`an overlapping scene name tag` case in `e2e/shelf.spec.ts` uses that clock and the real
`buildDemo` household. On the original bundle it fails with the same interception of
“Humbug’s card” by `data-pet="pet-dog-corgi"`. It uses a normal click, with no force,
exception suppression, longer timeout or date chosen to avoid the overlap.

`PetActor` gives an actor with an open name tag a temporary stacking level of 3000.
This clears ordinary scene depth while staying below decor editing (4000) and a carried
pet (5000). The existing actor element, coordinates and transform are retained. Closing
the tag restores the exact `view.z`. The actor source was identical in the current C3
and later combined D5/G1 tree, so this is a shared scene correction.

Validation before independent review:

- The pinned browser case fails first on the original bundle with the exact pointer
  interception. After the fix it and all four existing Shelf name-tag journeys pass:
  **5/5**, actual exit 0, with the existing greeting, feeding and axe assertions intact.
- Two new layering controls fail first on the original source, then pass. They exercise
  opening/closing the tag on the same actor, unchanged geometry, a real held-pointer
  carry and release, and restoration of ordinary depth.
- A third control compares the open tag with the actual `DecorEdit` layer. Assertions
  compare ordering rather than requiring the implementation's numeric constant.
- The 31 existing scene cases and the three layering controls pass. Source and browser
  typechecks pass, and the preview bundle builds.

Local detailed logs: `/workspace/scene-name-tag-red.log`,
`/workspace/scene-name-tag-units-red-final.log`,
`/workspace/scene-name-tag-units-green-final.log`,
`/workspace/scene-name-tag-controls-final.log`,
`/workspace/scene-name-tag-browser-green.log` and
`/workspace/scene-name-tag-types-final.log`.

Independent review and the restarted integrated full checks remain required. This
change adds no saved fields or in-app wording.
