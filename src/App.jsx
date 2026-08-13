import { useCallback, useEffect, useMemo, useState } from "react";
import CompletionModal from "./components/CompletionModal";
import GameControls from "./components/GameControls";
import GameDecisionModal from "./components/GameDecisionModal";
import GameHeader from "./components/GameHeader";
import LandingPage from "./components/LandingPage";
import NumberPad from "./components/NumberPad";
import SudokuBoard from "./components/SudokuBoard";
import {
  boardIsComplete,
  cloneBoard,
  createGameBoard,
  getNewlyCompletedCells,
  removePeerNotes,
} from "./lib/gameLogic";
import { fetchPuzzle } from "./lib/sudokuApi";

export default function App() {
  const [difficulty, setDifficulty] = useState("medium");
  const [board, setBoard] = useState([]);
  const [solution, setSolution] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gameStatus, setGameStatus] = useState("landing");
  const [errorMessage, setErrorMessage] = useState("");
  const [completionPulseCells, setCompletionPulseCells] = useState([]);
  const [decisionModal, setDecisionModal] = useState(null);
  const [pendingDifficulty, setPendingDifficulty] = useState("medium");

  const startGameIfNeeded = useCallback(() => {
    setGameStatus((status) => (status === "ready" ? "playing" : status));
  }, []);

  const loadPuzzle = useCallback(async (nextDifficulty = difficulty) => {
    setGameStatus("loading");
    setErrorMessage("");
    setSelectedCell(null);
    setNotesMode(false);
    setHistory([]);
    setMistakes(0);
    setHintsUsed(0);
    setElapsedSeconds(0);
    setCompletionPulseCells([]);

    try {
      const data = await fetchPuzzle(nextDifficulty);
      setDifficulty(data.difficulty);
      setBoard(createGameBoard(data.puzzle));
      setSolution(data.solution);
      setGameStatus("ready");
    } catch (error) {
      setErrorMessage(error.message || "Unable to load puzzle.");
      setGameStatus("error");
    }
  }, [difficulty]);

  const requestNewGame = useCallback(() => {
    if (gameStatus === "loading") return;
    setPendingDifficulty(difficulty);
    setDecisionModal("new");
  }, [difficulty, gameStatus]);

  const requestEndGame = useCallback(() => {
    if (!["ready", "playing", "paused"].includes(gameStatus)) return;
    setDecisionModal("end");
  }, [gameStatus]);

  const confirmDecision = useCallback(() => {
    if (decisionModal === "new") {
      const nextDifficulty = pendingDifficulty;
      setDecisionModal(null);
      loadPuzzle(nextDifficulty);
      return;
    }

    if (decisionModal === "end") {
      setDecisionModal(null);
      setBoard([]);
      setSolution(null);
      setSelectedCell(null);
      setNotesMode(false);
      setHistory([]);
      setMistakes(0);
      setHintsUsed(0);
      setElapsedSeconds(0);
      setCompletionPulseCells([]);
      setGameStatus("landing");
    }
  }, [decisionModal, loadPuzzle, pendingDifficulty]);

  useEffect(() => {
    if (gameStatus !== "playing") return undefined;

    const interval = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [gameStatus]);

  const saveHistory = useCallback(() => {
    setHistory((items) => [
      ...items,
      {
        board: cloneBoard(board),
        mistakes,
        hintsUsed,
      },
    ]);
  }, [board, mistakes, hintsUsed]);

  const triggerCompletionPulse = useCallback((previousBoard, nextBoard) => {
    const cells = getNewlyCompletedCells(previousBoard, nextBoard, solution);
    if (!cells.length) return;

    setCompletionPulseCells(cells);
    window.setTimeout(() => {
      setCompletionPulseCells((current) =>
        current.some((cell) => cells.includes(cell)) ? [] : current
      );
    }, 1400);
  }, [solution]);

  const completeIfNeeded = useCallback((nextBoard) => {
    if (boardIsComplete(nextBoard, solution)) {
      setGameStatus("completed");
      setSelectedCell(null);
      return true;
    }
    return false;
  }, [solution]);

  const enterNumber = useCallback((number) => {
    if (
      !selectedCell ||
      !solution ||
      ["paused", "completed", "ended", "loading"].includes(gameStatus)
    ) return;

    const { row, col } = selectedCell;
    const current = board[row][col];
    if (current.given) return;

    startGameIfNeeded();
    saveHistory();

    const nextBoard = cloneBoard(board);
    const target = nextBoard[row][col];

    if (notesMode) {
      if (target.value) return;

      target.notes = target.notes.includes(number)
        ? target.notes.filter((note) => note !== number)
        : [...target.notes, number].sort((a, b) => a - b);

      setBoard(nextBoard);
      return;
    }

    target.notes = [];
    target.value = number;
    target.hinted = false;

    if (number === solution[row][col]) {
      target.error = false;
      removePeerNotes(nextBoard, row, col, number);
      triggerCompletionPulse(board, nextBoard);
      setBoard(nextBoard);
      completeIfNeeded(nextBoard);
    } else {
      target.error = true;
      setMistakes((count) => count + 1);
      setBoard(nextBoard);
    }
  }, [
    board,
    completeIfNeeded,
    gameStatus,
    notesMode,
    saveHistory,
    selectedCell,
    solution,
    startGameIfNeeded,
    triggerCompletionPulse,
  ]);

  const eraseSelected = useCallback(() => {
    if (
      !selectedCell ||
      ["paused", "completed", "ended", "loading"].includes(gameStatus)
    ) return;

    const { row, col } = selectedCell;
    const current = board[row][col];
    if (current.given) return;
    if (!current.value && current.notes.length === 0) return;

    startGameIfNeeded();
    saveHistory();

    const nextBoard = cloneBoard(board);
    nextBoard[row][col] = {
      ...nextBoard[row][col],
      value: null,
      notes: [],
      error: false,
      hinted: false,
    };
    setBoard(nextBoard);
  }, [board, gameStatus, saveHistory, selectedCell, startGameIfNeeded]);

  const undo = useCallback(() => {
    if (
      !history.length ||
      ["paused", "completed", "ended", "loading"].includes(gameStatus)
    ) return;

    const previous = history[history.length - 1];
    setBoard(cloneBoard(previous.board));
    setMistakes(previous.mistakes);
    setHintsUsed(previous.hintsUsed);
    setHistory((items) => items.slice(0, -1));
  }, [gameStatus, history]);

  const giveHint = useCallback(() => {
    if (
      !solution ||
      ["paused", "completed", "ended", "loading"].includes(gameStatus)
    ) return;

    const unsolved = [];
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (board[row][col].value !== solution[row][col]) {
          unsolved.push({ row, col });
        }
      }
    }

    if (!unsolved.length) return;

    startGameIfNeeded();
    saveHistory();

    const preferred = selectedCell &&
      board[selectedCell.row][selectedCell.col].value !==
        solution[selectedCell.row][selectedCell.col]
      ? selectedCell
      : unsolved[Math.floor(Math.random() * unsolved.length)];

    const nextBoard = cloneBoard(board);
    const value = solution[preferred.row][preferred.col];

    nextBoard[preferred.row][preferred.col] = {
      ...nextBoard[preferred.row][preferred.col],
      value,
      notes: [],
      error: false,
      hinted: true,
      given: false,
    };

    removePeerNotes(nextBoard, preferred.row, preferred.col, value);
    triggerCompletionPulse(board, nextBoard);
    setBoard(nextBoard);
    setHintsUsed((count) => count + 1);
    setSelectedCell(preferred);
    completeIfNeeded(nextBoard);
  }, [
    board,
    completeIfNeeded,
    gameStatus,
    saveHistory,
    selectedCell,
    solution,
    startGameIfNeeded,
    triggerCompletionPulse,
  ]);

  const togglePause = useCallback(() => {
    setGameStatus((status) => {
      if (status === "playing") return "paused";
      if (status === "paused") return "playing";
      return status;
    });
  }, []);

  const selectCell = useCallback((row, col) => {
    if (["paused", "completed", "ended", "loading"].includes(gameStatus)) return;
    setSelectedCell({ row, col });
  }, [gameStatus]);

  const completedNumbers = useMemo(() => {
    if (!solution || !board.length) return [];

    const finished = [];
    for (let number = 1; number <= 9; number += 1) {
      let count = 0;
      for (let row = 0; row < 9; row += 1) {
        for (let col = 0; col < 9; col += 1) {
          if (
            board[row][col].value === number &&
            board[row][col].value === solution[row][col]
          ) {
            count += 1;
          }
        }
      }
      if (count === 9) finished.push(number);
    }
    return finished;
  }, [board, solution]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (["paused", "loading", "completed", "ended"].includes(gameStatus)) return;

      if (/^[1-9]$/.test(event.key)) {
        enterNumber(Number(event.key));
      } else if (event.key === "Backspace" || event.key === "Delete") {
        eraseSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (event.key.toLowerCase() === "n") {
        setNotesMode((mode) => !mode);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enterNumber, eraseSelected, gameStatus, undo]);

  if (gameStatus === "landing") {
    return (
      <LandingPage
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onStart={loadPuzzle}
      />
    );
  }

  if (gameStatus === "loading" && board.length === 0) {
    return (
      <main className="app-shell loading-screen">
        <div className="loader" />
        <p>Creating your Sudoku…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-topbar">
        <div>
          <span className="brand-kicker">Logic game</span>
          <h1>Sudoku</h1>
        </div>

        <div className="top-game-actions">
          {(gameStatus === "playing" || gameStatus === "paused" || gameStatus === "ready") && (
            <button
              type="button"
              className="top-end-game-button"
              onClick={requestEndGame}
              disabled={gameStatus === "loading"}
            >
              End game
            </button>
          )}

          <button
            type="button"
            className="top-new-game-button"
            onClick={requestNewGame}
            disabled={gameStatus === "loading"}
          >
            New game
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="error-banner">
          {errorMessage}
          <button type="button" onClick={() => loadPuzzle(difficulty)}>
            Try again
          </button>
        </div>
      )}

      {board.length > 0 && (
        <section className="game-card">
          <GameHeader
            difficulty={difficulty}
            mistakes={mistakes}
            elapsedSeconds={elapsedSeconds}
            gameStatus={gameStatus}
            onPauseToggle={togglePause}
          />

          <SudokuBoard
            board={board}
            selectedCell={selectedCell}
            onSelectCell={selectCell}
            paused={gameStatus === "paused"}
            completionPulseCells={completionPulseCells}
          />

          <NumberPad
            onNumber={enterNumber}
            completedNumbers={completedNumbers}
            disabled={["paused", "completed", "ended"].includes(gameStatus)}
          />

          <GameControls
            notesMode={notesMode}
            canUndo={history.length > 0}
            disabled={["paused", "completed", "ended"].includes(gameStatus)}
            onUndo={undo}
            onToggleNotes={() => setNotesMode((mode) => !mode)}
            onErase={eraseSelected}
            onHint={giveHint}
          />

          <div className="bottom-actions">
            <span>
              {gameStatus === "ended"
                ? "This game has ended."
                : "The timer starts with your first move."}
            </span>
          </div>
        </section>
      )}

      {gameStatus === "completed" && (
        <CompletionModal
          difficulty={difficulty}
          elapsedSeconds={elapsedSeconds}
          mistakes={mistakes}
          hintsUsed={hintsUsed}
          onNewGame={requestNewGame}
        />
      )}

      {decisionModal && (
        <GameDecisionModal
          mode={decisionModal}
          currentDifficulty={difficulty}
          nextDifficulty={pendingDifficulty}
          onSelectDifficulty={setPendingDifficulty}
          onCancel={() => setDecisionModal(null)}
          onConfirm={confirmDecision}
        />
      )}
    </main>
  );
}
