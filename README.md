# Royal Chess Arena

A self-contained 3D chess game made with HTML, CSS, JavaScript, Three.js and chess.js. The chessboard and pieces are procedural 3D geometry; there are no external images, fonts, APIs, sounds, CDNs or runtime network requests. The offline opponent is a local alpha-beta minimax engine.

## Run locally

The browser must serve ES modules over HTTP; opening `index.html` directly as a `file://` URL is not supported.

1. Open this folder in Visual Studio Code.
2. Ensure Python 3 is installed. No Python packages are needed.
3. Open VS Code's integrated terminal in the project folder.
4. Run `python -m http.server 8000` (on Windows, `py -m http.server 8000` also works).
5. Open `http://localhost:8000` in a recent browser with WebGL enabled.
6. To stop the local server, focus its terminal and press `Ctrl+C`.

The local server is only a static file server. It does not need internet access. Once the files are in the project, disconnecting from the internet does not affect a game.

## Libraries and offline setup

The runtime libraries are already included in `libraries/`:

- `three.module.js` — Three.js module build, used for local 3D rendering.
- `three.core.js` — the local core module imported by the Three.js module build.
- `chess.js` — chess.js rules library, used for legal move generation and game-state rules.
- `chess-ai.js` — the project's own offline AI module; it has no separate package dependency.
- `THREE-LICENSE.txt` and `CHESSJS-LICENSE.txt` — upstream license notices.

The source for the local library copies is available from the `three` and `chess.js` npm packages. To obtain fresh copies while online, from this folder run:

```powershell
npm install --no-save three@0.187.0 chess.js@1.4.0
Copy-Item node_modules\three\build\three.module.js libraries\three.module.js -Force
Copy-Item node_modules\three\build\three.core.js libraries\three.core.js -Force
Copy-Item node_modules\chess.js\dist\esm\chess.js libraries\chess.js -Force
```

Keep the copied files in `libraries/` before going offline. Normal gameplay does not load or access `node_modules`. `package.json` records the versions and provides an optional `npm run serve` script if Python is on `PATH`.

## How to play

- Choose **Play the computer**, **Two players**, or **Practice** on the home screen.
- Click a piece to select it; green squares show legal destinations. Click a highlighted square to move.
- Drag on the 3D board to orbit; use the mouse wheel or touchpad scroll to zoom.
- Practice mode offers a hint button with a legal move suggestion and a short explanation.
- **Undo** takes back one move in local two-player and practice modes, or a full player/computer turn in computer mode.
- Use **Pause**, **New game**, **Main menu**, the sound toggle, and settings from the game screen.
- Game settings (AI strength, clock length and sound preference) are saved in local browser storage. The best completed white-side move count is saved locally as well.
- Keyboard shortcuts: `P` pause/resume, `U` undo, `N` new game, `Esc` pause or close settings.
- Standard rules are enforced, including check, checkmate, stalemate, castling, en passant, selectable queen/rook/bishop/knight promotion, threefold repetition, the fifty-move rule, and insufficient-material draws.

## Project layout

```text
RoyalChessArena/
├── index.html
├── package.json
├── README.md
├── .gitignore
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── board.js
│   ├── pieces.js
│   ├── controls.js
│   ├── chess-engine.js
│   ├── ai.js
│   └── animations.js
├── libraries/
│   ├── three.module.js
│   ├── three.core.js
│   ├── chess.js
│   ├── chess-ai.js
│   ├── THREE-LICENSE.txt
│   └── CHESSJS-LICENSE.txt
├── tests/
│   └── chess.test.js
└── assets/
    ├── textures/
    ├── models/
    └── sounds/
```

The empty asset folders are intentionally reserved for optional future local assets. The game itself generates its board, pieces, coordinate labels and simple move tones procedurally and needs no external asset files.

## Implementation notes

- `js/chess-engine.js` wraps chess.js, the authoritative source for legal moves and game state.
- `js/board.js` builds the board, lighting, camera, raycasting and drag/zoom controls with Three.js.
- `js/pieces.js` models recognizable chess pieces from local Three.js geometry (lathed bodies and type-specific details).
- `js/animations.js` animates movement and capture using requestAnimationFrame.
- `js/ai.js` exposes the project's `libraries/chess-ai.js` engine to the game. Difficulty controls search depth and whether the move is random.
- `js/main.js` handles modes, UI, history, timers, persistence, sound and game flow.

## Computer Graphics concepts demonstrated

- **3D transformations:** piece and board object positions are translated in world space; knight shapes and details use rotation and scaling.
- **Camera and projection:** a perspective camera frames the scene, looks at the board target and can orbit around it or zoom in/out.
- **Object modelling:** square tiles, board frame and procedurally composed chess-piece meshes demonstrate mesh primitives and LatheGeometry.
- **Lighting and shading:** hemisphere, directional key and fill lights illuminate physically based materials; shadow maps show occlusion from the scene's lights.
- **Animation:** piece movement uses interpolated translation with an eased arc; captures scale and move out of the scene.
- **Visibility and rendering:** depth testing, raycasting, perspective projection, fog and shadows determine what is visible and how objects appear.
- **Interaction:** raycasting maps a pointer position onto a 3D board square; the rules engine then filters selectable destinations to legal moves.

## Testing checklist

1. Run `npm test` to validate legal chess moves and AI move legality.
2. Start the server and load the home screen with the network disconnected.
3. Play the opening moves `e2-e4`, `e7-e5`, `g1-f3`; verify the board, legal move highlights, turn indicator and history.
4. Try to move a pinned piece or move into check; illegal destinations must not be selectable.
5. Exercise castling, an en-passant capture, all four promotion choices, checkmate and a draw in dedicated positions (the included game starts from the standard position; no position editor is built into the UI).
6. Play the computer on Easy, Medium and Hard, then try local Two Players and a Practice hint.
7. Test undo, pause/resume, restart, clock/no-clock, sound toggle and camera orbit/zoom.
8. Refresh the browser and verify settings remain saved locally.

## College project / viva

### Project abstract

Royal Chess Arena is a browser-based chess application that combines a 3D scene, interactive camera controls, animation, and complete chess rule validation. Three.js renders the scene locally, while chess.js protects game correctness. A small offline minimax opponent and a practice hint feature add interactive game modes. The application is packaged with local dependencies and can be served entirely on the user's machine.

### Viva questions and short answers

1. **Why use a perspective camera?** It provides depth cues and a more natural 3D view of the board and pieces.
2. **How is a legal destination highlighted?** The rules library generates legal moves for the selected square; the board renders a transparent overlay at each destination.
3. **What is raycasting used for?** It projects a pointer ray into the scene and identifies the board tile that the player clicked.
4. **How are pieces modelled?** Their bodies use a lathed profile; additional primitives such as spheres, boxes and cones provide recognizable details.
5. **How does the AI choose a move?** It searches legal move sequences with alpha-beta pruning and scores resulting positions using material and simple positional values.
6. **What is alpha-beta pruning?** It skips branches that cannot improve the current minimax result, reducing the search work.
7. **How is smooth movement produced?** requestAnimationFrame updates position over time with an easing function and a small vertical arc.
8. **What does a shadow map do?** It records the scene from a light's perspective and uses that depth information to render cast shadows.
9. **How are chess rules kept correct?** The chess.js rules engine is authoritative; the rendered scene only accepts its legal moves.
10. **How does the app work offline?** All scripts and libraries are local; a local static server serves those files without contacting an internet service.
