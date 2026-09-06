# Mobility & Rehab Tracker

A single-page tracker for a daily mobility and rehab routine. It is plain
HTML, CSS, and JavaScript. There is no framework, no build step, and no
backend. All data stays in the browser through `localStorage`.

## What it does

The app has two tabs.

### Today

| Part | Behavior |
| --- | --- |
| **Hero** | The program day (for example "Day 42 / 84"), the week, the days to the checkpoint, and a ring with today's completion. |
| **Every day** | The daily list. An exercise you do once shows a checkbox. An exercise you do more than once shows a dose counter — each tap adds one, and it wraps to 0 after the last dose. |
| **Training day / Off day** | A toggle. It swaps the second checklist. It keeps the last selection. |
| **This week** | Counters with a weekly target. Each tap adds one. The count goes back to 0 after the target. |

### Progress

| Part | Behavior |
| --- | --- |
| **Streak / Best / Full days** | A day counts when you complete every dose of the every-day list. |
| **Grid** | 84 squares — 12 columns of 7 days. Each square gets brighter as you complete more of the day's doses. Tap a square to see the numbers. |
| **Ankle checkpoint** | The week of 12, the days that remain, and the start date control. |
| **Knee-to-wall** | One measurement each week, with the history below. |

- The daily checkboxes go back to empty at midnight.
- The weekly counters go back to 0 every Monday.
- After day 84, the checkpoint card tells you to book a surgical consult if
  the ankle still pops on every step.
- The knee-to-wall field is on the Progress tab. The app keeps one value for
  each week and shows the history.
- Add the page to your Home Screen. It then opens with no browser bar.

## How to run it

Open `index.html` in a browser. That is all.

To use a local server instead:

```bash
python3 -m http.server 8000    # then open http://localhost:8000
```

## How to publish it on GitHub Pages

1. Push these files to the root of your repository.
2. Open **Settings → Pages** in the repository.
3. Under **Source**, select **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder. Click **Save**.
5. Wait about one minute. The site is then live at
   `https://<your-name>.github.io/<repository-name>/`.

## Files

| File | Content |
| --- | --- |
| `index.html` | The page structure and the two tabs. |
| `styles.css` | All styles. Dark, mobile first. |
| `app.js` | The exercise data, the storage, the reset rules, and the display. |
| `manifest.json` | The web app manifest, for the Home Screen. |
| `icon.svg`, `icon-180.png`, `icon-512.png` | The app icon. |

## How to change the exercises

Open `app.js`. The four lists are at the top of the file: `DAILY`,
`TRAINING`, `OFF`, and `WEEKLY`. Each item has an `id`, a `name`, and a
`detail`.

- Add `dose: 3` to a daily item that you do three times each day. Leave it
  out for once a day. The ring, the grid, and the streak follow the number.
- Weekly items use `target` instead — the number of times in a week.

Keep the `id` values unique. Do not change an `id` after you use the app,
because the stored progress points to it.
