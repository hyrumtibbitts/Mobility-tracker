# Mobility & Rehab Tracker

A single-page tracker for a daily mobility and rehab routine. It is plain
HTML, CSS, and JavaScript. There is no framework, no build step, and no
backend. All data stays in the browser through `localStorage`.

## What it does

| Part | Behavior |
| --- | --- |
| **Every day** | A checklist that you complete each day. |
| **Training day / Off day** | A toggle. It swaps the second checklist. It keeps the last selection. |
| **Spread across the week** | Tap-to-increment counters with a weekly target. The count goes back to 0 after it hits the target. |
| **Ankle checkpoint** | You set the program start date once. The card then shows the week (of 12) and the days that remain. |

- The daily checkboxes go back to empty at midnight.
- The weekly counters go back to 0 every Monday.
- After day 84, the checkpoint card tells you to book a surgical consult if
  the ankle still pops on every step.
- The knee-to-wall item has a field for the measurement in centimetres. The
  app keeps the value for each week and shows the last one.

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
| `index.html` | The page structure. |
| `styles.css` | All styles. Light and dark, mobile first. |
| `app.js` | The exercise data, the storage, the reset rules, and the display. |

## How to change the exercises

Open `app.js`. The four lists are at the top of the file: `DAILY`,
`TRAINING`, `OFF`, and `WEEKLY`. Each item has an `id`, a `name`, and a
`detail`. Weekly items also have a `target`.

Keep the `id` values unique. Do not change an `id` after you use the app,
because the stored progress points to it.
