export default function NumberPad({ onNumber, completedNumbers, disabled }) {
  return (
    <div className="number-pad" aria-label="Number pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
        <button
          key={number}
          type="button"
          className="number-button"
          disabled={disabled || completedNumbers.includes(number)}
          onClick={() => onNumber(number)}
        >
          {number}
        </button>
      ))}
    </div>
  );
}
