import { disposeObject } from "./pieces.js";

export function easeInOut(value) {
  return value < .5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

export function animatePiece(scene, piece, from, to, onComplete, duration = 300) {
  const start = performance.now();
  const initialY = piece.position.y;
  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = easeInOut(progress);
    piece.position.x = from.x + (to.x - from.x) * eased;
    piece.position.z = from.z + (to.z - from.z) * eased;
    piece.position.y = initialY + Math.sin(progress * Math.PI) * .32;
    piece.rotation.y += .012;
    if (progress < 1) requestAnimationFrame(frame);
    else {
      piece.position.set(to.x, 0, to.z);
      piece.rotation.y = 0;
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(frame);
}

export function animateCapture(piece) {
  if (!piece) return;
  const start = performance.now();
  const initialY = piece.position.y;
  function frame(now) {
    const progress = Math.min(1, (now - start) / 260);
    const eased = easeInOut(progress);
    piece.position.y = initialY + eased * .7;
    piece.scale.setScalar(1 - eased);
    piece.rotation.y += .1;
    if (progress < 1) requestAnimationFrame(frame);
    else {
      if (piece.parent) piece.parent.remove(piece);
      disposeObject(piece);
    }
  }
  requestAnimationFrame(frame);
}
