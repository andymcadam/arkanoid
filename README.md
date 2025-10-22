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
