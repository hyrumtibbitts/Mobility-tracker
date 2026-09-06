# Mobility & Rehab Tracker

A single-page tracker for a daily mobility and rehab routine. It is plain
HTML, CSS, and JavaScript. There is no framework, no build step, and no
backend. All data stays in the browser through `localStorage`.

## What it does

The app holds one program, mapped to a fixed week.

| Day | Type | On top of the daily routine |
| --- | --- | --- |
| Mon / Wed / Fri | Lift | Warm-up, glute max, glute med, neck / shrug, cooldown |
| Tue / Thu / Sat | Hybrid | Warm-up, glute med (+ glute max, optional) |
| Sun | Off | Couch stretch, back / core block, incline walk, extra stretch volume |

The app has two tabs.

### Today

| Part | Behavior |
| --- | --- |
| **Hero** | The program day ("Day 42 / 84"), the week, the days to the checkpoint, and a ring for today. |
| **Day type** | Taken from the weekday. You can change it for today; the change clears at midnight. |
| **Daily routine** | 14 items, every day. |
| **The session** | The add-ons for the day type. An `optional` item is outside the count. |
| **Also today** | The weekly items planned for this weekday. Only shows when there are some. |
| **This week** | All 5 weekly items, with their planned days and the count for the week. |

Tap a card to open its full list on its own page.

### Progress

| Part | Behavior |
| --- | --- |
| **Streak / Best / Full days** | A day counts when the 14-item daily routine is complete. |
| **Grid** | 84 squares — 12 columns of 7 days. A square brightens with the share of that day's work. Tap it for the numbers. |
| **Ankle checkpoint** | The week of 12, the days that remain, and the start date. |
| **Knee-to-wall** | One measurement each week, with the history. |

- The daily and session checkboxes clear at midnight.
- A weekly item stores the date you did it. The count is the dates inside the current week.
- After day 84, the app tells you to book a surgical consult if the ankle still pops.
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
