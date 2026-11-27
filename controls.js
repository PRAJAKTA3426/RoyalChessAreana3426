export function attachKeyboardControls({ onPause, onUndo, onRestart, onEscape }) {
  const listener = event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches("input,select,textarea")) return;
    if (event.key === "Escape") onEscape();
    else if (event.key.toLowerCase() === "p") onPause();
    else if (event.key.toLowerCase() === "u") onUndo();
    else if (event.key.toLowerCase() === "n") onRestart();
  };
  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}
