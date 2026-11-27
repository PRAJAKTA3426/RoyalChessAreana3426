import { ChessGame } from "./chess-engine.js";
import { ChessBoard } from "./board.js";
import { chooseMove, describeMove } from "./ai.js";
import { attachKeyboardControls } from "./controls.js";

const $ = id => document.getElementById(id);
const GLYPHS = {
  w: { p:"♙", n:"♘", b:"♗", r:"♖", q:"♕", k:"♔" },
  b: { p:"♟", n:"♞", b:"♝", r:"♜", q:"♛", k:"♚" }
};
const defaultSettings = { difficulty:"medium", clock:600, sound:true };

function readSettings() {
  const saved = localStorage.getItem("royal-chess-settings");
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
}

let settings = readSettings();
let game = new ChessGame();
let board = null;
let mode = "computer";
let selected = null;
let selectedMoves = [];
let promotionOptions = [];
let paused = false;
let finished = false;
let animating = false;
let aiTimer = null;
let aiGeneration = 0;
let timer = null;
let whiteSeconds = settings.clock;
let blackSeconds = settings.clock;
let soundContext = null;

const isComputerMode = () => mode === "computer";
const isPracticeMode = () => mode === "practice";

function setScreen(screen) {
  $("home-screen").classList.toggle("hidden", screen !== "home");
  $("game-screen").classList.toggle("hidden", screen !== "game");
}

function persistSettings() {
  localStorage.setItem("royal-chess-settings", JSON.stringify(settings));
}

function openSettings() {
  $("difficulty").value = settings.difficulty;
  $("clock-setting").value = String(settings.clock);
  $("sound-setting").checked = settings.sound;
  $("settings-modal").classList.remove("hidden");
}

function closeSettings() {
  $("settings-modal").classList.add("hidden");
}

function startGame(nextMode = mode) {
  if (aiTimer) clearTimeout(aiTimer);
  aiGeneration++;
  if (timer) clearInterval(timer);
  mode = nextMode;
  game.reset();
  selected = null;
  selectedMoves = [];
  promotionOptions = [];
  paused = false;
  finished = false;
  animating = false;
  whiteSeconds = settings.clock;
  blackSeconds = settings.clock;
  $("result-overlay").classList.add("hidden");
  $("promotion-overlay").classList.add("hidden");
  $("pause-overlay").classList.add("hidden");
  $("mode-label").textContent = mode === "computer" ? "VS COMPUTER" : mode === "two-player" ? "TWO PLAYERS" : "PRACTICE MODE";
  $("black-name").textContent = mode === "computer" ? "Computer" : mode === "two-player" ? "Player 2" : "Black side";
  $("white-name").textContent = mode === "computer" ? "You" : mode === "two-player" ? "Player 1" : "White side";
  $("black-subtitle").textContent = "BLACK · OPPONENT";
  $("white-subtitle").textContent = "WHITE · YOUR TURN";
  $("practice-tools").classList.toggle("hidden", !isPracticeMode());
  $("sound-toggle").textContent = settings.sound ? "♫" : "♩";
  $("hint-message").textContent = "Hints suggest a legal move for the side to move.";
  $("board-loading").classList.remove("hidden");
  setScreen("game");
  if (board) board.dispose();
  board = new ChessBoard($("board-host"), handleSquare);
  board.sync(game.board);
  $("board-loading").classList.add("hidden");
  updateInterface();
  timer = setInterval(tick, 1000);
}

function tick() {
  if (paused || finished || settings.clock === 0) return;
  if (game.turn === "w") whiteSeconds = Math.max(0, whiteSeconds - 1);
  else blackSeconds = Math.max(0, blackSeconds - 1);
  updateClocks();
  if (whiteSeconds === 0 || blackSeconds === 0) {
    const winner = whiteSeconds === 0 ? "Black" : "White";
    finish(winner, `${winner} wins on time.`);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

function updateClocks() {
  $("white-clock").textContent = settings.clock ? formatTime(whiteSeconds) : "—:—";
  $("black-clock").textContent = settings.clock ? formatTime(blackSeconds) : "—:—";
  $("white-clock").classList.toggle("active", game.turn === "w" && !finished && !paused);
  $("black-clock").classList.toggle("active", game.turn === "b" && !finished && !paused);
}

function updateInterface() {
  const history = game.history;
  const currentColor = game.turn === "w" ? "White" : "Black";
  $("turn-label").textContent = finished ? "Game complete" : `${currentColor} to move`;
  if (!finished) {
    const selectedPiece = selected ? board.pieces.get(selected) : null;
    $("status-message").textContent = game.check
      ? `${currentColor} is in check.`
      : selectedPiece ? `Selected ${pieceName(selectedPiece.userData.type)}. Choose a highlighted square.`
      : "Select a piece to see its legal moves.";
  }
  $("move-count").textContent = `${history.length} ${history.length === 1 ? "MOVE" : "MOVES"}`;
  const rows = [];
  for (let i=0;i<history.length;i+=2) {
    const white = history[i];
    const black = history[i+1];
    rows.push(`<div class="move-row"><span class="move-number">${Math.floor(i/2)+1}.</span><span class="move-san ${i===history.length-1?"latest":""}">${escapeHtml(white.san)}</span><span class="move-san ${i+1===history.length-1?"latest":""}">${black?escapeHtml(black.san):""}</span></div>`);
  }
  $("move-list").innerHTML = rows.length ? rows.join("") : '<p class="empty-moves">Your game begins here.</p>';
  $("move-list").scrollTop = $("move-list").scrollHeight;
  const capturedWhite = history.filter(move => move.color === "w" && move.captured).map(move => GLYPHS.b[move.captured]).join(" ");
  const capturedBlack = history.filter(move => move.color === "b" && move.captured).map(move => GLYPHS.w[move.captured]).join(" ");
  $("captured-white").textContent = capturedWhite || "—";
  $("captured-black").textContent = capturedBlack || "—";
  $("undo-button").disabled = history.length === 0 || animating;
  $("undo-button").style.opacity = $("undo-button").disabled ? ".48" : "1";
  const checkedKing = game.check ? locateKing(game.board, game.turn) : null;
  board.setHighlights(selected, selectedMoves.map(move=>move.to), checkedKing);
  updateClocks();
}

function pieceName(type) {
  return ({p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"})[type] || "piece";
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[char]);
}

function locateKing(position,color) {
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const piece=position[row][col];
    if(piece?.type==="k"&&piece.color===color)return `${"abcdefgh"[col]}${8-row}`;
  }
  return null;
}

function handleSquare(square) {
  if (paused || finished || animating) return;
  if (isComputerMode() && game.turn === "b") return;
  const clickedPiece = board.pieces.get(square);
  if (selected) {
    const targetMoves = selectedMoves.filter(move => move.to === square);
    if (targetMoves.some(move => move.promotion)) {
      promotionOptions = targetMoves;
      document.querySelectorAll(".promotion-choice").forEach(button => {
        button.querySelector(".promotion-glyph").textContent = GLYPHS[game.turn][button.dataset.promotion];
      });
      $("promotion-overlay").classList.remove("hidden");
      return;
    }
    const chosenMove = targetMoves[0];
    if (chosenMove) {
      performMove(chosenMove);
      return;
    }
    if (clickedPiece?.userData.color === game.turn) {
      selectSquare(square);
      return;
    }
    selected = null;
    selectedMoves = [];
    updateInterface();
    return;
  }
  if (clickedPiece?.userData.color === game.turn) selectSquare(square);
}

function selectSquare(square) {
  selected = square;
  selectedMoves = game.legalMoves(square);
  updateInterface();
}

async function performMove(move) {
  const activeBoard = board;
  const legal = game.move(move.from, move.to, move.promotion || "q");
  if (!legal) return;
  selected = null;
  selectedMoves = [];
  animating = true;
  playSound(legal.captured ? 125 : 220);
  updateInterface();
  const animations = [activeBoard.movePiece(legal.from,legal.to,legal.flags.includes("e") ? `${legal.to[0]}${legal.from[1]}` : legal.to)];
  if (legal.flags.includes("k") || legal.flags.includes("q")) {
    const rank = legal.color === "w" ? "1" : "8";
    const rookFrom = legal.flags.includes("k") ? `h${rank}` : `a${rank}`;
    const rookTo = legal.flags.includes("k") ? `f${rank}` : `d${rank}`;
    animations.push(activeBoard.movePiece(rookFrom,rookTo));
  }
  await Promise.all(animations);
  if (board !== activeBoard) return;
  if(legal.promotion)board.promotePiece(legal.to,legal.promotion,legal.color);
  animating = false;
  updateInterface();
  if (game.gameOver) {
    if(game.checkmate) finish(game.turn === "w" ? "Black" : "White", `${game.turn === "w" ? "Black" : "White"} wins by checkmate.`);
    else if(game.stalemate) finish("Draw","The game ends in stalemate.");
    else finish("Draw",drawReason());
    return;
  }
  if (isComputerMode() && game.turn === "b" && !paused) scheduleComputerMove();
}

function drawReason() {
  if (game.chess.isThreefoldRepetition()) return "Draw by threefold repetition.";
  if (game.chess.isInsufficientMaterial()) return "Draw by insufficient material.";
  if (game.chess.isDraw()) return "The game is drawn.";
  return "The game ends in a draw.";
}

function scheduleComputerMove() {
  const generation = aiGeneration;
  aiTimer = setTimeout(() => {
    if (generation !== aiGeneration || paused || finished || mode !== "computer") return;
    const move = chooseMove(game.fen, settings.difficulty);
    if (move) performMove(move);
  }, 420);
}

function finish(winner,message) {
  finished = true;
  if(timer){clearInterval(timer);timer=null;}
  $("turn-label").textContent = winner === "Draw" ? "Draw game" : `${winner} wins`;
  $("status-message").textContent = message;
  $("result-title").textContent = winner === "Draw" ? "It's a draw" : mode === "computer" && winner === "Black" ? "Game over" : "Victory";
  $("result-copy").textContent = message;
  $("result-icon").textContent = winner === "Draw" ? "♟" : winner === "White" ? "♔" : "♚";
  $("result-overlay").classList.remove("hidden");
  const best = Number(localStorage.getItem("royal-chess-best") || 0);
  if(winner === "White" && game.history.length > best)localStorage.setItem("royal-chess-best",String(game.history.length));
  updateClocks();
}

function togglePause() {
  if(!board || finished)return;
  paused=!paused;
  $("pause-overlay").classList.toggle("hidden",!paused);
  $("pause-button").innerHTML=paused?"▶ &nbsp; Resume":"Ⅱ &nbsp; Pause";
  if(paused&&aiTimer){clearTimeout(aiTimer);aiTimer=null;aiGeneration++;}
  else if(!paused&&isComputerMode()&&game.turn==="b")scheduleComputerMove();
  updateClocks();
}

function undoMove() {
  if(!board || animating || !game.history.length)return;
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;aiGeneration++;}
  game.undo();
  if(isComputerMode()&&game.turn==="b"&&game.history.length)game.undo();
  selected=null;
  selectedMoves=[];
  promotionOptions=[];
  $("promotion-overlay").classList.add("hidden");
  finished=false;
  $("result-overlay").classList.add("hidden");
  if(!timer)timer=setInterval(tick,1000);
  board.sync(game.board);
  updateInterface();
}

function playSound(frequency) {
  if(!settings.sound)return;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  if(!soundContext)soundContext=new AudioContextClass();
  const oscillator=soundContext.createOscillator();
  const gain=soundContext.createGain();
  oscillator.type="sine";
  oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.035,soundContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001,soundContext.currentTime+.09);
  oscillator.connect(gain);gain.connect(soundContext.destination);
  oscillator.start();oscillator.stop(soundContext.currentTime+.1);
}

async function showHint() {
  if(animating||finished||paused)return;
  $("hint-message").textContent="Finding a helpful legal move…";
  await new Promise(resolve=>setTimeout(resolve,30));
  const move=chooseMove(game.fen,"medium");
  if(!move){$("hint-message").textContent="No legal moves are available.";return;}
  selected=move.from;
  selectedMoves=game.legalMoves(move.from);
  $("hint-message").textContent=describeMove(move);
  updateInterface();
}

document.querySelectorAll(".mode-card").forEach(button=>button.addEventListener("click",()=>startGame(button.dataset.mode)));
$("settings-open").addEventListener("click",openSettings);
$("settings-game").addEventListener("click",openSettings);
$("settings-close").addEventListener("click",closeSettings);
$("settings-done").addEventListener("click",()=>{
  settings.difficulty=$("difficulty").value;
  settings.clock=Number($("clock-setting").value);
  settings.sound=$("sound-setting").checked;
  whiteSeconds=settings.clock;
  blackSeconds=settings.clock;
  persistSettings();
  closeSettings();
  updateClocks();
});
$("settings-modal").addEventListener("click",event=>{if(event.target===$("settings-modal"))closeSettings();});
$("promotion-overlay").addEventListener("click",event=>{if(event.target===$("promotion-overlay")){$("promotion-overlay").classList.add("hidden");promotionOptions=[];}});
document.querySelectorAll(".promotion-choice").forEach(button=>button.addEventListener("click",()=>{
  const choice=promotionOptions.find(move=>move.promotion===button.dataset.promotion);
  $("promotion-overlay").classList.add("hidden");
  promotionOptions=[];
  if(choice)performMove(choice);
}));
$("main-menu").addEventListener("click",()=>{if(timer)clearInterval(timer);timer=null;if(aiTimer)clearTimeout(aiTimer);aiGeneration++;if(board){board.dispose();board=null;}setScreen("home");});
$("restart-button").addEventListener("click",()=>startGame(mode));
$("pause-button").addEventListener("click",togglePause);
$("undo-button").addEventListener("click",undoMove);
$("hint-button").addEventListener("click",showHint);
$("sound-toggle").addEventListener("click",()=>{
  settings.sound=!settings.sound;
  $("sound-toggle").textContent=settings.sound?"♫":"♩";
  $("sound-toggle").setAttribute("aria-label",settings.sound?"Turn sound off":"Turn sound on");
  $("sound-setting").checked=settings.sound;
  persistSettings();
});
$("result-rematch").addEventListener("click",()=>startGame(mode));
$("result-menu").addEventListener("click",()=>{$("result-overlay").classList.add("hidden");if(timer)clearInterval(timer);timer=null;if(board){board.dispose();board=null;}setScreen("home");});
attachKeyboardControls({onPause:togglePause,onUndo:undoMove,onRestart:()=>startGame(mode),onEscape:()=>{
  if(!$("settings-modal").classList.contains("hidden"))closeSettings();
  else if(!$("promotion-overlay").classList.contains("hidden")){$("promotion-overlay").classList.add("hidden");promotionOptions=[];}
  else togglePause();
}});
window.addEventListener("beforeunload",()=>{if(board)board.dispose();if(timer)clearInterval(timer);});

