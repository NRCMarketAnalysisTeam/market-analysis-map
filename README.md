# Marketplace and Supply Route Map Tool

> Maintained by the Norwegian Refugee Council (NRC). Funded by the European Union.
> This repository is shared for transparency and reuse within the humanitarian sector. It is not open for outside contributions. See [Disclaimers](#disclaimers) before using the tool or the code.

A free web tool for drawing the two maps that go into a Type 1 market analysis report: the marketplace map and the supply route map. It replaces the old PowerPoint map template.

Live site: https://marketanalysismap.com

Built by the Market Analysis team in the global supply chain section at the Norwegian Refugee Council (NRC) head office, under the Transforming Supply Chain Planning: Market Analysis project.

## What it does

- Search any location on a live map
- Place markets, source markets, access constraints and security icons with one click
- Show market functionality with green, yellow or red circles
- Draw supply routes that measure their own distance as you trace them
- Link several source markets to several marketplaces
- Measure any distance with the Measure tool
- Build the legend and the distance list automatically
- Shrink icons automatically when you zoom out, with an Icon size control in the toolbar
- Download a high resolution PNG sized for a Word page
- English, Spanish, French and Arabic (right to left)

Two editions with the same tools:

- **NRC edition** (`?edition=nrc`): NRC branding and NRC icons in orange
- **Humanitarian edition** (`?edition=humanitarian`): the official OCHA humanitarian icons in UN blue, for partners

The tool does not save maps and has no accounts. Everything stays in the browser until the map is downloaded.

## How it is built

- React, Vite, Leaflet (react-leaflet), zustand and html-to-image
- Fully static: no server and no database. It is hosted on GitHub Pages.
- Map background: CARTO Voyager tiles, loaded by the browser. The CARTO key is added when the site is built, from a GitHub secret, so it is not in this code.
- Place search: OpenStreetMap Nominatim
- Publishing: `.github/workflows/deploy.yml` builds, runs the checks and publishes the site every time the `main` branch changes.

## Folder structure

```
.github/workflows/ Automatic publishing to GitHub Pages
src/
  components/      React components (map, toolbar, legend, forms, help)
  i18n/            Translations (translations.js) and legal texts (legal.js)
  assets/icons/    NRC icon set and manifest
  assets/icons-ocha/  OCHA icon set and manifest
  assets/fonts/    Self-hosted fonts (SIL Open Font License)
  store.js         App state
  geo.js           Distance calculations
  iconScale.js     Icon size rules
  export.js        PNG download
public/brand/      NRC logo and official EU emblem files
tests/             Unit tests (node --test) and browser tests (Playwright)
docs/              Notes on each round of changes, and the social preview image
```

## Settings

| Name | Where | What it is |
|---|---|---|
| `CARTO_BASEMAP_KEY` | GitHub repository secret (Settings, Secrets and variables, Actions) | CARTO basemap key. The publishing workflow passes it to the build as `VITE_CARTO_BASEMAP_KEY`. Never commit it. |

The key ends up in the published site, because the browser needs it to load the map. That is normal for browser map keys. If it is ever misused, create a new key in CARTO and update the secret. Without a key the tool still works, but the map background shows a watermark instead of the map.

## Run it on your computer

You need Node.js 22 or newer.

```
npm ci
npm run dev
```

Then open http://localhost:5000. To see the map background, first create a file called `.env` next to `package.json` with the line `VITE_CARTO_BASEMAP_KEY=your-key` (see `.env.example`). The `.gitignore` file stops it from being uploaded.

## Tests

```
npm test               # 19 unit tests
npm run test:browser   # 13 browser tests (Playwright), needs npm run dev running
```

## Publish

Publishing is automatic. Any change to the `main` branch runs the workflow in `.github/workflows/deploy.yml`, which installs, runs the 19 checks, builds and publishes to GitHub Pages. If a check fails, nothing is published. To publish by hand: Actions tab, "Deploy to GitHub Pages", "Run workflow".

## Rules to keep when changing the code

- Do not change the EU emblem files in `public/brand/eu/` or `src/components/EuEmblem.jsx`. They follow the EU visibility rules for EU-funded actions.
- Do not change the legal texts in `src/i18n/legal.js` without checking with the project team.
- Never put the CARTO key in the code. It belongs in the repository secret.
- Analytics is off. Do not switch it on without updating the privacy text first.

## Disclaimers

- **No warranty.** The tool and this code are provided "as is", without any warranty. NRC may change, suspend or withdraw them at any time.
- **Maps are estimates.** Base maps, place names, search results and distances may be incomplete, out of date or wrong. Distances are measured along the line the user draws. Check locations and distances against reliable local sources before using a map to make decisions.
- **Boundaries.** The boundaries and names shown, and the designations used on maps made with this tool, do not imply official endorsement or acceptance by NRC or the European Union.
- **Sensitive information.** The tool does not store maps, but users are responsible for what they put on a map and who they share it with. Do not include personal data or security-sensitive locations.
- **Not an official position.** Maps made with this tool are the work of the users who make them, not statements by NRC or the European Union.
- **Names and logos.** The NRC name and logo, and the European Union emblem, are not covered by any permission to reuse the code. See [NOTICE.md](NOTICE.md).
- **Full terms.** The terms of use and privacy notice shown in the tool (`src/i18n/legal.js`) apply to the live site.

## Credits and licences

- Map data © OpenStreetMap contributors (ODbL). Basemap © CARTO. Both credits must stay visible on the map and in downloaded images.
- Hosting: GitHub Pages.
- Humanitarian edition icons: OCHA Humanitarian Icons, https://github.com/UN-OCHA/humanitarian-icons
- NRC edition icons and the NRC logo belong to the Norwegian Refugee Council.
- "Funded by the European Union" emblem: used under the EU visibility rules.
- Fonts: Roboto, Noto Serif and Noto Sans Arabic, SIL Open Font License (`src/assets/fonts/LICENSE-OFL.txt`).
- Open source libraries are listed in `package.json` with their own licences.

No licence has been chosen yet for the tool's own code, so all rights are reserved by NRC until one is added. See [NOTICE.md](NOTICE.md).

## Security

To report a security problem, see [SECURITY.md](SECURITY.md). Do not report it in a public issue.

## Funding

This tool is a product of the Transforming Supply Chain Planning: Market Analysis project, implemented by the Norwegian Refugee Council (NRC) in partnership with the European Union, which funds the project through its humanitarian aid.

Funded by the European Union. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or the European Commission's Directorate-General for European Civil Protection and Humanitarian Aid Operations (DG ECHO). Neither the European Union nor the granting authority can be held responsible for them.

## Contact

Market Analysis team, NRC head office: ho.marketanalysis@nrc.no
