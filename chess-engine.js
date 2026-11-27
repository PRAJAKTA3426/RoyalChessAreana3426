import { Chess } from "../libraries/chess.js";

export class ChessGame {
  constructor() {
    this.chess = new Chess();
  }

  get fen() { return this.chess.fen(); }
  get turn() { return this.chess.turn(); }
  get history() { return this.chess.history({ verbose: true }); }
  get board() { return this.chess.board(); }
  get check() { return this.chess.isCheck(); }
  get gameOver() { return this.chess.isGameOver(); }
  get checkmate() { return this.chess.isCheckmate(); }
  get draw() { return this.chess.isDraw(); }
  get stalemate() { return this.chess.isStalemate(); }
  legalMoves(square) { return this.chess.moves(square ? { square, verbose: true } : { verbose: true }); }
  move(from, to, promotion = "q") {
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return null;
    const legal = this.chess.moves({ square: from, verbose: true })
      .some(move => move.to === to && (!move.promotion || move.promotion === promotion));
    if (!legal) return null;
    return this.chess.move({ from, to, promotion });
  }
  undo() { return this.chess.undo(); }
  reset() { this.chess.reset(); }
  load(fen) { this.chess.load(fen); }
}
