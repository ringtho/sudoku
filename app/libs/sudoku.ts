export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type SudokuCell = number | null;
export type SudokuBoard = SudokuCell[];

export const ROW_SIZE = 9;
export const BOX_SIZE = 3;
export const BOARD_SIZE = ROW_SIZE * ROW_SIZE;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type RNG = () => number;

const difficultyToEmpties: Record<Difficulty, number> = {
  easy: 36,
  medium: 45,
  hard: 53,
  expert: 58,
};

const PEERS: number[][] = Array.from({ length: BOARD_SIZE }, (_, index) => {
  const row = Math.floor(index / ROW_SIZE);
  const col = index % ROW_SIZE;
  const set = new Set<number>();

  for (let i = 0; i < ROW_SIZE; i++) {
    set.add(row * ROW_SIZE + i);
    set.add(i * ROW_SIZE + col);
  }

  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      set.add((boxRow + r) * ROW_SIZE + (boxCol + c));
    }
  }

  set.delete(index);
  return Array.from(set);
});

function createSeededRandom(seed: number | string): RNG {
  let value: number;
  if (typeof seed === "number") {
    value = seed;
  } else {
    value = 0;
    for (let i = 0; i < seed.length; i++) {
      value = (value << 5) - value + seed.charCodeAt(i);
      value |= 0;
    }
  }
  let state = value ^ 0x6d2b79f5;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: RNG): T[] {
  const array = items.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isValidPlacement(board: SudokuBoard, index: number, value: number): boolean {
  return PEERS[index].every((peerIndex) => board[peerIndex] !== value);
}

function fillBoard(board: SudokuBoard, rng: RNG, index = 0): boolean {
  if (index >= BOARD_SIZE) return true;
  if (board[index] !== null) return fillBoard(board, rng, index + 1);

  for (const digit of shuffle(DIGITS, rng)) {
    if (isValidPlacement(board, index, digit)) {
      board[index] = digit;
      if (fillBoard(board, rng, index + 1)) return true;
      board[index] = null;
    }
  }

  return false;
}

function generateSolvedBoard(rng: RNG): number[] {
  const board: SudokuBoard = Array.from({ length: BOARD_SIZE }, () => null);
  if (!fillBoard(board, rng)) {
    throw new Error("Failed to generate solved Sudoku board");
  }
  return board.map((cell) => cell ?? 0);
}

function findBestCell(board: SudokuBoard): number {
  let bestIndex = -1;
  let minCandidates = 10;

  for (let index = 0; index < BOARD_SIZE; index++) {
    if (board[index] !== null) continue;
    const candidates = DIGITS.filter((digit) => isValidPlacement(board, index, digit));
    if (candidates.length === 0) return index;
    if (candidates.length < minCandidates) {
      minCandidates = candidates.length;
      bestIndex = index;
      if (minCandidates === 1) break;
    }
  }

  return bestIndex;
}

export function solveSudoku(board: SudokuBoard, limit = Infinity) {
  const state: SudokuBoard = board.slice();
  let solutions = 0;
  let firstSolution: number[] | null = null;

  const search = (): boolean => {
    const index = findBestCell(state);
    if (index === -1) {
      solutions += 1;
      if (!firstSolution) {
        firstSolution = state.map((cell) => cell ?? 0);
      }
      return solutions >= limit;
    }

    const candidates = DIGITS.filter((digit) => isValidPlacement(state, index, digit));
    for (const candidate of candidates) {
      state[index] = candidate;
      if (search()) return true;
    }

    state[index] = null;
    return false;
  };

  search();
  return { solution: firstSolution, count: solutions };
}

function hasUniqueSolution(board: SudokuBoard): boolean {
  const { count } = solveSudoku(board, 2);
  return count === 1;
}

function buildPuzzleFromSolution(solution: number[], empties: number, rng: RNG): SudokuBoard {
  const puzzle: SudokuBoard = solution.map((value) => value);
  const positions = shuffle(Array.from({ length: BOARD_SIZE }, (_, index) => index), rng);
  let removed = 0;

  for (const position of positions) {
    if (removed >= empties) break;
    const backup = puzzle[position];
    puzzle[position] = null;
    if (!hasUniqueSolution(puzzle)) {
      puzzle[position] = backup;
      continue;
    }
    removed += 1;
  }

  return puzzle;
}

export function generateSudoku(difficulty: Difficulty = "medium", seed?: number | string) {
  const rng = seed !== undefined ? createSeededRandom(seed) : Math.random;
  const solved = generateSolvedBoard(rng);
  const empties = difficultyToEmpties[difficulty];
  const puzzle = buildPuzzleFromSolution(solved, empties, rng);
  const solution = solved.join("");
  const puzzleString = puzzle.map((cell) => (cell === null ? "." : String(cell))).join("");
  return { puzzle: puzzleString, solution };
}

export function stringToBoard(serialized: string): SudokuBoard {
  if (serialized.length !== BOARD_SIZE) {
    throw new Error("Serialized Sudoku string must be 81 characters long");
  }
  return serialized.split("").map((char) => {
    const digit = Number.parseInt(char, 10);
    return Number.isInteger(digit) && digit >= 1 && digit <= 9 ? digit : null;
  });
}

export function boardToString(board: SudokuBoard): string {
  if (board.length !== BOARD_SIZE) {
    throw new Error("Sudoku board must contain 81 cells");
  }
  return board.map((cell) => (cell === null ? "." : String(cell))).join("");
}

export function findConflicts(board: SudokuBoard): Set<number> {
  const conflicts = new Set<number>();
  for (let index = 0; index < BOARD_SIZE; index++) {
    const value = board[index];
    if (value === null) continue;
    for (const peer of PEERS[index]) {
      if (board[peer] === value) {
        conflicts.add(index);
        conflicts.add(peer);
      }
    }
  }
  return conflicts;
}

export function isBoardComplete(board: SudokuBoard): boolean {
  return board.every((cell) => cell !== null) && findConflicts(board).size === 0;
}

export function getPeers(index: number): number[] {
  return PEERS[index];
}

export function validateMove(board: SudokuBoard, index: number, value: number) {
  if (value < 1 || value > 9) return false;
  return isValidPlacement(board, index, value);
}

export function getRowColumn(index: number) {
  const row = Math.floor(index / ROW_SIZE);
  const column = index % ROW_SIZE;
  return { row, column };
}

export function getBoxIndex(index: number) {
  const { row, column } = getRowColumn(index);
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(column / BOX_SIZE);
}

export function formatBoard(board: SudokuBoard): string {
  const lines: string[] = [];
  for (let row = 0; row < ROW_SIZE; row++) {
    const values = board
      .slice(row * ROW_SIZE, row * ROW_SIZE + ROW_SIZE)
      .map((cell) => (cell === null ? "." : cell))
      .join(" ");
    lines.push(values);
  }
  return lines.join("\n");
}
