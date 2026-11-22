# IPU Grade Calculator

A fast, offline-friendly **SGPA / GPA calculator for GGSIPU (IPU) students**. Enter marks and credits for each subject and get a credit-weighted result on the 10-point scale, with grade points, an indicative division, and a grade distribution — instantly, with no page reloads.

> This is an **unofficial** student tool and is not affiliated with or endorsed by Guru Gobind Singh Indraprastha University. Your university's official result always prevails.

## Features

- **Credit-weighted SGPA** — `Σ(Credit × Grade Point) ÷ Σ(Credits)`, never a simple average.
- **1–20 subjects** (8 by default), with per-row name, marks, credits, grade and grade points.
- **Official GGSIPU grading scale** with exact boundaries and inline validation (marks 0–100, credits 1–30).
- **Instant results** — animated circular gauge, total credits, weighted points, passed/failed counts and grade distribution bars.
- **Indicative division** — First, Second, Third, No Division, and conditional Exemplary Performance at 10.00.
- **Copy result** to clipboard in a shareable text format.
- **Export CSV** with per-subject rows and a summary line.
- **Auto-save** in `localStorage` with a one-click reset; no account, no server, no network calls.
- **Light and dark themes** with a saved preference.
- **Responsive** — a compact table on desktop and stacked subject cards on mobile.
- **Accessible** — labelled inputs, keyboard navigation, visible focus states, WCAG AA contrast.

## Grading system

| Marks | Grade | Grade points |
|---|---|---|
| 90 – 100 | O | 10 |
| 75 – 89.99 | A+ | 9 |
| 65 – 74.99 | A | 8 |
| 55 – 64.99 | B+ | 7 |
| 50 – 54.99 | B | 6 |
| 45 – 49.99 | C | 5 |
| 40 – 44.99 | P | 4 |
| Below 40 | F | 0 |

A failed subject scores 0 grade points but its credits still count in the denominator. The SGPA is kept unrounded internally and only rounded to two decimals for display, so a raw 3.99 is never promoted to Third Division.

## Example

| Subject | Marks | Grade | Credits | Credit × GP |
|---|---:|---|---:|---:|
| Mathematics | 85 | A+ (9) | 4 | 36 |
| Physics | 70 | A (8) | 3 | 24 |
| Programming | 92 | O (10) | 4 | 40 |
| **Total** | | | **11** | **100** |

`100 ÷ 11 = 9.09` (a simple average of grade points would give 9.00).

## Getting started

No build step, dependencies, or packages are required.

```bash
git clone https://github.com/ItzRandom23/GPA-Calculator.git
cd GPA-Calculator
python -m http.server 8000
```

Then open <http://localhost:8000>. You can also just open `index.html` directly in a browser.

## Deploying

This is a static site — any static host works:

- **GitHub Pages:** in [Settings → Pages](https://github.com/ItzRandom23/GPA-Calculator/settings/pages) set *Source* to **Deploy from a branch**, branch `main`, folder `/ (root)`. The site then serves at <https://itzrandom23.github.io/GPA-Calculator/>.
- **Netlify:** drag and drop the folder, or connect the repo with build command left empty and publish directory set to `.`.
- **Vercel:** import the repository; no build command or output directory overrides are needed.

All paths in the project are relative, so it works unchanged from a sub-path such as the GitHub Pages URL above.

## Project structure

```
.
├── index.html                 # Page structure and inline SVG icons
├── style.css                  # Design tokens, light/dark themes, responsive layout
├── script.js                  # Grading, validation, calculation, storage and UI logic
├── assets/
│   └── ggsipu-emblem-mark.png # Identification mark (site is unofficial)
├── LICENSE
└── README.md
```

## Tech stack

HTML5, CSS3 and vanilla JavaScript only. No frameworks, backend, database, APIs or external requests — all data stays on the user's device.

## Disclaimer

Division is officially based on the overall **CGPA** at programme completion, and Exemplary Performance is subject to university eligibility conditions that this tool cannot verify. The result shown here is indicative only.

## License

Released under the [MIT License](LICENSE).

The MIT licence covers this project's own source code and documentation. The
GGSIPU emblem in `assets/ggsipu-emblem-mark.png`, together with the university
name and marks, belongs to Guru Gobind Singh Indraprastha University and is
**excluded** from that licence — see the exception note at the end of
[LICENSE](LICENSE). If you redeploy this project, replace the emblem with your
own artwork unless you have permission to use theirs.
