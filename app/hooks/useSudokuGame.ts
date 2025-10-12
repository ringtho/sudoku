import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_SIZE,
  boardToString,
  findConflicts,
  isBoardComplete,
  stringToBoard,
  type SudokuBoard,
  ROW_SIZE,
} from "../libs/sudoku";

export type NotesRecord = Record<number, number[]>;

export type SudokuSerializedState = {
  board: string;
  notes: NotesRecord;
  updatedAt: number;
};

export type SudokuGameOptions = {
  puzzle: string;
  solution: string;
  initialState?: Partial<SudokuSerializedState>;
  onChange?: (state: SudokuSerializedState) => void;
};

export type SudokuMode = "value" | "note";

type NumbersLeft = Record<number, number>;

function mergeBoards(puzzleBoard: SudokuBoard, candidate?: SudokuBoard): SudokuBoard {
  if (!candidate) return puzzleBoard.slice();
  return puzzleBoard.map((value, index) => {
    if (value !== null) return value;
    const candidateValue = candidate[index];
    return candidateValue && candidateValue >= 1 && candidateValue <= 9 ? candidateValue : null;
  });
}

function normalizeNotes(notes: NotesRecord | undefined): NotesRecord {
  if (!notes) return {};
  const normalized: NotesRecord = {};
  for (const key of Object.keys(notes)) {
    const index = Number(key);
    if (Number.isNaN(index) || index < 0 || index >= BOARD_SIZE) continue;
    const unique = Array.from(
      new Set(
        (notes[index] ?? []).filter((value) => Number.isInteger(value) && value >= 1 && value <= 9),
      ),
    ).sort((a, b) => a - b);
    if (unique.length > 0) {
      normalized[index] = unique;
    }
  }
  return normalized;
}

function serializeNotes(notes: NotesRecord): NotesRecord {
  return Object.fromEntries(
    Object.entries(notes).map(([key, values]) => [
      Number(key),
      Array.from(new Set(values)).sort((a, b) => a - b),
    ]),
  );
}

function computeNumbersLeft(board: SudokuBoard): NumbersLeft {
  const counts: NumbersLeft = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
  for (const value of board) {
    if (value) {
      counts[value] = Math.max(0, (counts[value] ?? 0) - 1);
    }
  }
  return counts;
}

export function useSudokuGame({
  puzzle,
  initialState,
  onChange,
}: SudokuGameOptions) {
  const puzzleBoard = useMemo(() => stringToBoard(puzzle), [puzzle]);
  const givenMap = useMemo(() => puzzleBoard.map((cell) => cell !== null), [puzzleBoard]);

  const [board, setBoard] = useState<SudokuBoard>(() =>
    mergeBoards(puzzleBoard, stringToBoard(initialState?.board ?? puzzle)),
  );
  const [notes, setNotes] = useState<NotesRecord>(() => normalizeNotes(initialState?.notes));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<SudokuMode>("value");

  const boardRef = useRef(board);
  const notesRef = useRef(notes);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const emitChange = useCallback(
    (nextBoard: SudokuBoard, nextNotes: NotesRecord) => {
      if (!onChange) return;
      onChange({
        board: boardToString(nextBoard),
        notes: serializeNotes(nextNotes),
        updatedAt: Date.now(),
      });
    },
    [onChange],
  );

  const applyState = useCallback(
    (nextBoard: SudokuBoard, nextNotes: NotesRecord, shouldEmit = true) => {
      boardRef.current = nextBoard;
      notesRef.current = nextNotes;
      setBoard(nextBoard);
      setNotes(nextNotes);
      if (shouldEmit) {
        emitChange(nextBoard, nextNotes);
      }
    },
    [emitChange],
  );

  const selectCell = useCallback(
    (index: number | null) => {
      if (index === null) {
        setSelectedIndex(null);
        return;
      }
      if (index < 0 || index >= BOARD_SIZE) return;
      setSelectedIndex(index);
    },
    [setSelectedIndex],
  );

  const clearCell = useCallback(() => {
    if (selectedIndex === null) return;
    if (givenMap[selectedIndex]) return;

    const nextBoard = boardRef.current.slice();
    nextBoard[selectedIndex] = null;
    const nextNotes = { ...notesRef.current };
    delete nextNotes[selectedIndex];
    applyState(nextBoard, nextNotes);
  }, [applyState, givenMap, selectedIndex]);

  const enterValue = useCallback(
    (value: number) => {
      if (selectedIndex === null) return;
      if (givenMap[selectedIndex]) return;
      if (!Number.isInteger(value) || value < 1 || value > 9) return;

      const nextBoard = boardRef.current.slice();
      if (nextBoard[selectedIndex] === value) return;
      nextBoard[selectedIndex] = value;
      const nextNotes = { ...notesRef.current };
      delete nextNotes[selectedIndex];
      applyState(nextBoard, nextNotes);
    },
    [applyState, givenMap, selectedIndex],
  );

  const toggleNote = useCallback(
    (value: number) => {
      if (selectedIndex === null) return;
      if (givenMap[selectedIndex]) return;
      if (!Number.isInteger(value) || value < 1 || value > 9) return;

      const nextNotes = { ...notesRef.current };
      const existing = new Set(nextNotes[selectedIndex] ?? []);
      if (existing.has(value)) {
        existing.delete(value);
      } else {
        existing.add(value);
      }
      const entries = Array.from(existing).sort((a, b) => a - b);
      if (entries.length === 0) {
        delete nextNotes[selectedIndex];
      } else {
        nextNotes[selectedIndex] = entries;
      }
      applyState(boardRef.current.slice(), nextNotes);
    },
    [applyState, givenMap, selectedIndex],
  );

  const applyRemoteState = useCallback(
    (state: SudokuSerializedState) => {
      const remoteBoard = mergeBoards(puzzleBoard, stringToBoard(state.board));
      const remoteNotes = normalizeNotes(state.notes);
      applyState(remoteBoard, remoteNotes, false);
    },
    [applyState, puzzleBoard],
  );

  const resetGame = useCallback(() => {
    applyState(puzzleBoard.slice(), {});
    setSelectedIndex(null);
    setMode("value");
  }, [applyState, puzzleBoard]);

  const highlightValue = selectedIndex !== null ? board[selectedIndex] : null;
  const conflicts = useMemo(() => findConflicts(board), [board]);
  const numbersLeft = useMemo(() => computeNumbersLeft(board), [board]);
  const isComplete = useMemo(() => isBoardComplete(board), [board]);

  return {
    board,
    notes,
    givenMap,
    selectedIndex,
    mode,
    conflicts,
    highlightValue,
    numbersLeft,
    isComplete,
    actions: {
      selectCell,
      enterValue,
      toggleNote,
      clearCell,
      setMode,
      applyRemoteState,
      resetGame,
    },
  };
}

export function indexToRowColumn(index: number) {
  const row = Math.floor(index / ROW_SIZE);
  const column = index % ROW_SIZE;
  return { row, column };
}

export type SudokuGame = ReturnType<typeof useSudokuGame>;
