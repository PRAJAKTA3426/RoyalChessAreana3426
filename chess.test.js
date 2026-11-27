import test from "node:test";
import assert from "node:assert/strict";
import { ChessGame } from "../js/chess-engine.js";
import { chooseMove } from "../libraries/chess-ai.js";

test("rejects illegal moves without changing the position", () => {
  const game = new ChessGame();
  const initialFen = game.fen;
  assert.equal(game.move("e2", "e5"), null);
  assert.equal(game.fen, initialFen);
  assert.equal(game.legalMoves("e2").length, 2);
});

test("supports castling and en passant as legal special moves", () => {
  const castleGame = new ChessGame();
  castleGame.load("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  assert.ok(castleGame.legalMoves("e1").some(move => move.flags.includes("k")));
  assert.ok(castleGame.legalMoves("e1").some(move => move.flags.includes("q")));
  assert.ok(castleGame.move("e1", "g1"));

  const epGame = new ChessGame();
  epGame.load("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  const enPassant = epGame.legalMoves("e5").find(move => move.to === "d6");
  assert.ok(enPassant);
  assert.ok(enPassant.flags.includes("e"));
  assert.ok(epGame.move("e5", "d6"));
});

test("promotes a pawn and identifies checkmate and stalemate", () => {
  const promotionGame = new ChessGame();
  promotionGame.load("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  assert.ok(promotionGame.move("a7", "a8", "q"));
  assert.equal(promotionGame.board[0][0].type, "q");

  const underpromotionGame = new ChessGame();
  underpromotionGame.load("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  assert.ok(underpromotionGame.move("a7", "a8", "n"));
  assert.equal(underpromotionGame.board[0][0].type, "n");

  const mateGame = new ChessGame();
  mateGame.load("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(mateGame.checkmate, true);

  const staleGame = new ChessGame();
  staleGame.load("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(staleGame.stalemate, true);
});

test("recognizes repetition, the fifty-move rule, and insufficient material", () => {
  const repetitionGame = new ChessGame();
  for (let i = 0; i < 2; i++) {
    repetitionGame.move("g1", "f3");
    repetitionGame.move("g8", "f6");
    repetitionGame.move("f3", "g1");
    repetitionGame.move("f6", "g8");
  }
  assert.equal(repetitionGame.draw, true);
  assert.equal(repetitionGame.chess.isThreefoldRepetition(), true);

  const fiftyMoveGame = new ChessGame();
  fiftyMoveGame.load("7k/8/8/8/8/8/8/KR6 w - - 100 51");
  assert.equal(fiftyMoveGame.draw, true);

  const materialGame = new ChessGame();
  materialGame.load("7k/8/8/8/8/8/8/K7 w - - 0 1");
  assert.equal(materialGame.draw, true);
  assert.equal(materialGame.chess.isInsufficientMaterial(), true);
});

test("offline AI returns a legal move at each configured skill", () => {
  const game = new ChessGame();
  for (const difficulty of ["easy", "medium", "hard"]) {
    const move = chooseMove(game.fen, difficulty);
    assert.ok(move);
    assert.ok(game.legalMoves().some(candidate => candidate.from === move.from && candidate.to === move.to));
  }
});
