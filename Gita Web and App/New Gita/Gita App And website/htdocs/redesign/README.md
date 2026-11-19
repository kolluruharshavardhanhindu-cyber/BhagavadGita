# Bhagavad Gita — "Divya" redesign mockup

Open `mockup.html` through any local web server from the `htdocs` folder (it loads the real
`../gita-data.js`, `../TatparyasMultiLan.js`, `../DyanaAndMahatyam.js` and `../Krishna.webp`), e.g.

```bash
cd "Gita Web and App/New Gita/Gita App And website/htdocs"
python -m http.server 8765
# then open http://localhost:8765/redesign/mockup.html
```

No build step and no new dependencies: plain HTML + CSS + vanilla JS.

## Features in the mockup
| # | Feature | What to try |
|---|---------|-------------|
| 0 | Cinematic intro | Om stroke-draws, 12 lotus petals bloom, curtains part |
| 1 | Living hero | Cursor-parallax mandalas, orbiting lights, letter-by-letter title, Gita 2.47 decoding through all 9 scripts, ember/star canvas that reacts to the pointer |
| 2 | Script morph | Language pill springs between scripts; headings decode in place |
| 3 | Chapter Chakra | Drag/spin the 18-chapter wheel (momentum + snap, arrow keys); per-chapter progress rings; switch to 3D tilt grid |
| 4 | Living verse reader | ▶ plays the real recitation with word-by-word highlight, live audio waveform, light ring; "Meaning" unrolls like a palm leaf; double-click a sloka for the range player |
| 5 | Dynamic island + range sheet | Floating player morphs pill → transport bar; bottom sheet previews the repeat pattern as animated beads |
| 6 | Gamified Sloka Test | 5 levels, 3D card flip, golden veil, lotus-petal burst, streak ring |
| 7 | Dhyana / Mahatyam carousel | Swipe/drag deck with depth scaling |
| 8 | Verse of the day | Rotating light border, listen / copy / shuffle |
| 9 | Lineage timeline | About Us + Inspiration as a golden thread that draws on scroll |
| 10 | App CTA | Phone mock tilts toward the cursor |
| — | Motion tokens | 4 easing curves + palette, for hand-off |

Global: day/night theme with circular reveal, magnetic buttons, ripples, custom diya cursor (mouse only),
scroll progress, auto-hiding top bar, feature tour rail, toasts, haptics on mobile, "pause ambient motion"
button, full `prefers-reduced-motion` support.

## Responsive coverage
Checked for zero horizontal overflow at 320, 375, 740×360 landscape, 768 (tablet), 1024, 1366, 1920 and 2560.
Includes safe-area insets for notched phones, touch-friendly 44px targets, vertical scroll never trapped by the wheel,
and dedicated layouts for small phones, landscape phones, tablets and large/4K screens.
