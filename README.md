# Arkanoid (vibe-coding)

This is a small test project — a vibe-coding session building an Arkanoid / Breakout-like clone using GPT and Visual Studio Code.

The goal is to experiment with gameplay ideas and code while iterating quickly. Levels are stored as simple CSV files so a future level editor can generate them.

## Features

- Canvas-based Arkanoid clone (JavaScript + HTML)
- Simple 3D-looking bricks, ball and paddle using canvas gradients
- Level system: levels defined in `levels/*.csv` and loaded in sequence
- Score carries over between levels; game ends after the final level
- Persistent per-player highscore saved in a browser cookie
- **Level Editor**: Visual tool for designing custom levels with save/export functionality

## Run locally

From the project root, serve the folder and open the HTML in your browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/arkanoid.htm
```

Opening `arkanoid.htm` directly with `file://` may work but some browsers block `fetch()` for local files, so using a local server is recommended.

## Level file format

Levels are simple CSV files placed in the `levels/` directory. Each row corresponds to a brick row and each column to a brick column.

- `1` = brick present
- `0` = empty

Example (8 columns per row):

```
1,1,1,1,1,1,1,1
1,0,1,0,1,0,1,0
...
```

## Extending

- Add new `levels/*.csv` and include them in the `levels` array inside `arkanoid.js` to expand the campaign.
- Use the built-in **Level Editor** (`editor.htm`) to visually design and export custom levels as CSV files.

## Level Editor

The project includes a visual level editor accessible at `editor.htm`. Features include:

- **Visual Grid Editing**: Click cells to toggle bricks on/off on an 8×5 grid
- **Quick Actions**: Clear all, fill all, or generate random level patterns
- **Save to Browser**: Store custom levels in browser localStorage for later editing
- **Export CSV**: Download levels as CSV files that can be added to the `levels/` directory
- **Load & Manage**: Load previously saved levels and delete unwanted ones

Access the editor by opening `http://localhost:8000/editor.htm` or click the "🎨 Level Editor" link on the game page.

**Note**: Future plans include adding a "Community Levels" upload area where players can share their custom levels with others.

## Raspberry Pi & educational use

This project is being tested on a Raspberry Pi and is intended as a small, approachable "school learning" project for my son to get into coding. The codebase is deliberately simple:

- Plain JavaScript and an HTML canvas so it's easy to read and modify.
- Levels are stored as CSV files, which makes it straightforward to teach how to design levels or to build a tiny level editor.

If you plan to run this on a Raspberry Pi, use the local server instructions above (run the Python simple HTTP server) to avoid cross-origin restrictions when loading CSV level files.

## License

This repository is an experimental personal project. Use however you like.

## Gamepad Controls (new)

This project now supports gamepad input via the browser Gamepad API. The following controls are implemented (Xbox-style controllers are used as the reference mapping):

- Left analog stick (horizontal) — analog paddle movement. Push the stick partway for slow paddle movement, push it fully for maximum speed. The maximum paddle speed is controlled by the `GAMEPAD_MAX_PADDLE_SPEED` constant in `arkanoid.js`.
- D-pad Left / Right (buttons 14 / 15) — digital fallback for left/right movement when the stick is centered.
- A button (button 0) — used to start a normal game from the main menu and to restart the game when it's over.

How it works:

- The game listens for `gamepadconnected` / `gamepaddisconnected` events and polls the connected gamepad each frame.
- The left-stick horizontal axis (-1..+1) is read and, when outside a small deadzone, used to move the paddle proportionally to the tilt (analog control).
- When the stick is within the deadzone, the D-pad buttons are used as a digital fallback.
- The A button is detected on its rising edge (press) to trigger start/restart logic.

Testing tips:

1. Serve the project with a local HTTP server and open `arkanoid.htm` in a browser (Chrome, Edge or Firefox recommended):

```bash
python3 -m http.server 8000
# open http://localhost:8000/arkanoid.htm
```

2. Plug in an Xbox controller (or another controller supported by your OS).
3. Open the browser DevTools Console to see connection logs such as "Gamepad connected at index 0".
4. From the main menu, press A to start the game, or click "Play Game".
5. Use the left stick to move the paddle analogically. Use the D-pad for digital movement, or the keyboard arrow keys as before.

Tweaks:

- Adjust `GAMEPAD_MAX_PADDLE_SPEED` in `arkanoid.js` to change top speed for analog movement.
- If you'd like different sensitivity, I can add a simple settings UI to control deadzone and sensitivity.

## Automated tests (Playwright)

This project includes simple end-to-end tests using Playwright. They verify the game page loads and that starting the game causes the canvas to render (used as a proxy for the draw loop running).

Where the tests live:

- `tests/game.spec.ts` — checks page title and that the Play Game action starts the game and paints the canvas.

How Playwright runs the site:

- The repository's `playwright.config.ts` is configured with a `webServer` entry that starts a static server on port 8000 using `python -m http.server 8000`. Playwright will start the server automatically before running tests (and will reuse an existing server if present).

Run the tests locally (PowerShell):

```powershell
npx playwright test
```

Run a single test file:

```powershell
npx playwright test tests/game.spec.ts -v
```

View the HTML report generated by Playwright after a run:

```powershell
npx playwright show-report
```

Troubleshooting:

- If Playwright can't start the server because Python isn't on PATH, install Python or change the `webServer.command` in `playwright.config.ts` to use another static server (for example, `npx http-server -p 8000` after installing `http-server`).
- If tests time out, increase the `webServer.timeout` in `playwright.config.ts` or run Playwright in debug mode:

```powershell
npx playwright test --debug
```

If you'd like, I can add CI integration (GitHub Actions) to run Playwright on each PR and upload the HTML report as an artifact.
