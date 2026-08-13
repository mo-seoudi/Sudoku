const DIFFICULTIES = ["easy", "medium", "hard", "expert"];

const SAMPLE_BOARD = [
  0, 0, 7, 0, 4, 0, 1, 0, 0,
  3, 0, 0, 8, 0, 1, 0, 0, 6,
  0, 6, 0, 0, 0, 0, 0, 8, 0,
  0, 0, 3, 0, 8, 0, 6, 0, 0,
  8, 0, 0, 2, 0, 6, 0, 0, 4,
  0, 0, 6, 0, 1, 0, 9, 0, 0,
  0, 5, 0, 0, 0, 0, 0, 2, 0,
  4, 0, 0, 7, 0, 9, 0, 0, 5,
  0, 0, 8, 0, 5, 0, 4, 0, 0,
];

export default function LandingPage({
  difficulty,
  onDifficultyChange,
  onStart,
}) {
  return (
    <main className="landing-shell">
      <section className="landing-card">
        <div className="landing-copy">
          
          <h1 className="landing-title">Sudoku</h1>
          <p className="landing-intro">
            Think. Solve. Repeat.
          </p>

          <div className="landing-settings">
            <span className="landing-label">Difficulty</span>
            <div className="landing-difficulties" aria-label="Choose difficulty">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={difficulty === level ? "active" : ""}
                  onClick={() => onDifficultyChange(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="landing-start-button"
            onClick={() => onStart(difficulty)}
          >
            Start new game
            <span aria-hidden="true">→</span>
          </button>

          
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="landing-board-shadow" />
          <div className="landing-board-wrap">
            <div className="landing-sudoku-board">
              {SAMPLE_BOARD.map((value, index) => {
                const row = Math.floor(index / 9);
                const col = index % 9;
                const classes = ["landing-cell"];

                if (col === 2 || col === 5) classes.push("box-right");
                if (row === 2 || row === 5) classes.push("box-bottom");
                if (index === 40) classes.push("sample-selected");
                if (index === 30 || index === 48) classes.push("sample-accent");

                return (
                  <div key={index} className={classes.join(" ")}>
                    {value || ""}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
