import { useCallback, useEffect, useMemo, useState } from "react";
import CompletionModal from "./components/CompletionModal";
import GameControls from "./components/GameControls";
import GameHeader from "./components/GameHeader";
import NumberPad from "./components/NumberPad";
import SudokuBoard from "./components/SudokuBoard";
import {
  boardIsComplete,
  cloneBoard,
  createGameBoard,
  removePeerNotes,
} from "./lib/gameLogic";
import { fetchPuzzle } from "./lib/sudokuApi";

const DIFFICULTIES = ["easy", "medium", "hard", "extreme"];

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
  const [gameStatus, setGameStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

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

  useEffect(() => {
    loadPuzzle("medium");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const completeIfNeeded = useCallback((nextBoard) => {
    if (boardIsComplete(nextBoard, solution)) {
      setGameStatus("completed");
      setSelectedCell(null);
      return true;
    }
    return false;
  }, [solution]);

  const enterNumber = useCallback((number) => {
    if (!selectedCell || !solution || gameStatus === "paused") return;

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
  ]);

  const eraseSelected = useCallback(() => {
    if (!selectedCell || gameStatus === "paused") return;

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
    if (!history.length || gameStatus === "paused") return;

    const previous = history[history.length - 1];
    setBoard(cloneBoard(previous.board));
    setMistakes(previous.mistakes);
    setHintsUsed(previous.hintsUsed);
    setHistory((items) => items.slice(0, -1));
  }, [gameStatus, history]);

  const giveHint = useCallback(() => {
    if (!solution || gameStatus === "paused") return;

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
  ]);

  const togglePause = useCallback(() => {
    setGameStatus((status) => {
      if (status === "playing") return "paused";
      if (status === "paused") return "playing";
      return status;
    });
  }, []);

  const selectCell = useCallback((row, col) => {
    if (gameStatus === "paused") return;
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
      if (gameStatus === "paused" || gameStatus === "loading") return;

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

        <div className="difficulty-picker" aria-label="Difficulty">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              className={difficulty === level ? "active" : ""}
              onClick={() => loadPuzzle(level)}
              disabled={gameStatus === "loading"}
            >
              {level}
            </button>
          ))}
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
          />

          <NumberPad
            onNumber={enterNumber}
            completedNumbers={completedNumbers}
            disabled={gameStatus === "paused" || gameStatus === "completed"}
          />

          <GameControls
            notesMode={notesMode}
            canUndo={history.length > 0}
            disabled={gameStatus === "paused" || gameStatus === "completed"}
            onUndo={undo}
            onToggleNotes={() => setNotesMode((mode) => !mode)}
            onErase={eraseSelected}
            onHint={giveHint}
          />

          <div className="bottom-actions">
            <span>The timer starts with your first move.</span>
            <button type="button" onClick={() => loadPuzzle(difficulty)}>
              New {difficulty} puzzle
            </button>
          </div>
        </section>
      )}

      {gameStatus === "completed" && (
        <CompletionModal
          difficulty={difficulty}
          elapsedSeconds={elapsedSeconds}
          mistakes={mistakes}
          hintsUsed={hintsUsed}
          onNewGame={() => loadPuzzle(difficulty)}
        />
      )}
    </main>
  );
}
