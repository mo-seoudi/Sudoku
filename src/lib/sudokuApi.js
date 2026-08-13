export async function fetchPuzzle(difficulty) {
  const response = await fetch(
    `/api/generate?difficulty=${encodeURIComponent(difficulty)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Unable to generate a Sudoku puzzle.");
  }

  return response.json();
}
