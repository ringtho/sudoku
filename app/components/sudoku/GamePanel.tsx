import { useEffect } from "react";
import { SudokuBoardView, type CollaboratorPresence } from "./Board";
import { NumberPad } from "./NumberPad";
import type { SudokuGame } from "../../hooks/useSudokuGame";
import { Button } from "../ui/button";
import { formatDuration } from "../../utils/time";
import { Clock } from "lucide-react";

type SudokuGamePanelProps = {
  game: SudokuGame;
  peers?: CollaboratorPresence[];
  lockedCells?: Record<number, { name: string; color: string }>;
  onHint?: () => void;
  hintsLeft?: number;
  highlightColor?: string;
  showPresenceBadges?: boolean;
  allowHints?: boolean;
  elapsedMs?: number | null;
  isTimerRunning?: boolean;
};

export function SudokuGamePanel({
  game,
  peers,
  lockedCells,
  onHint,
  hintsLeft,
  highlightColor,
  showPresenceBadges = true,
  allowHints = true,
  elapsedMs = null,
  isTimerRunning = false,
}: SudokuGamePanelProps) {
  const {
    board,
    notes,
    givenMap,
    selectedIndex,
    highlightValue,
    conflicts,
    numbersLeft,
    mode,
    isComplete,
    actions,
  } = game;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const value = Number.parseInt(event.key, 10);
        actions.setHighlightDigit(value);
        if (mode === "note") {
          actions.toggleNote(value);
        } else {
          actions.enterValue(value);
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        actions.clearCell();
        return;
      }

      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        actions.setMode(mode === "note" ? "value" : "note");
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(event.key);
      }
    };

    const moveSelection = (direction: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight") => {
      let next = selectedIndex ?? 0;
      if (direction === "ArrowUp") next = next - 9 < 0 ? next : next - 9;
      if (direction === "ArrowDown") next = next + 9 >= board.length ? next : next + 9;
      if (direction === "ArrowLeft") next = next % 9 === 0 ? next : next - 1;
      if (direction === "ArrowRight") next = (next + 1) % 9 === 0 ? next : next + 1;
      actions.selectCell(next);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, board.length, mode, selectedIndex]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex flex-col items-center gap-6">
        <div className="w-full">
          <div className="flex items-center justify-between rounded-2xl border border-blue-100/80 bg-gradient-to-r from-blue-50 via-white to-purple-50 px-4 py-3 text-sm shadow-sm ring-1 ring-black/5 dark:border-blue-500/20 dark:bg-gradient-to-r dark:from-slate-950 dark:via-slate-950/80 dark:to-purple-950/40 dark:ring-white/5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Match time</span>
              {isTimerRunning ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-300"
                    aria-hidden="true"
                  />
                  Live
                </span>
              ) : null}
            </div>
            <span className="font-mono text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {elapsedMs !== null ? formatDuration(elapsedMs) : "—"}
            </span>
          </div>
        </div>
        <SudokuBoardView
          board={board}
          notes={notes}
          givenMap={givenMap}
          selectedIndex={selectedIndex}
          highlightValue={highlightValue}
          conflicts={conflicts}
          lockedCells={lockedCells}
          onSelectCell={actions.selectCell}
          peers={peers}
          highlightColor={highlightColor}
          showPresenceBadges={showPresenceBadges}
        />
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          {isComplete ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-600 dark:text-emerald-400">
              Puzzle complete! 🎉
            </span>
          ) : selectedIndex === null ? (
            "Select a cell to start playing."
          ) : conflicts.size > 0 ? (
            "Resolve highlighted conflicts to stay on track."
          ) : (
            "Tip: press N to toggle note mode, Backspace to clear."
          )}
        </div>
      </div>
      <div className="flex w-full flex-col gap-4 lg:max-w-xs">
        <NumberPad
          onInput={(value) => (mode === "note" ? actions.toggleNote(value) : actions.enterValue(value))}
          onClear={actions.clearCell}
          onHint={allowHints ? onHint : undefined}
          mode={mode}
          numbersLeft={numbersLeft}
          setMode={actions.setMode}
          hintsLeft={allowHints ? hintsLeft : undefined}
          onHighlightDigit={actions.setHighlightDigit}
          activeDigit={highlightValue}
        />
      <div className="rounded-3xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Game status</h3>
          <dl className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <dt>Conflicts</dt>
              <dd className={conflicts.size > 0 ? "text-red-500" : "text-emerald-500"}>
                {conflicts.size > 0 ? conflicts.size : "None"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Cells solved</dt>
              <dd>
                {board.filter((cell, index) => cell !== null && !givenMap[index]).length} /{" "}
                {board.filter((_, index) => !givenMap[index]).length}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Mode</dt>
              <dd className="font-medium">{mode === "note" ? "Note" : "Value"}</dd>
            </div>
            {typeof hintsLeft === "number" ? (
              <div className="flex items-center justify-between">
                <dt>Hints left</dt>
                <dd className="font-medium">{hintsLeft}</dd>
              </div>
            ) : null}
          </dl>
          <Button variant="ghost" className="mt-4 w-full justify-center" onClick={actions.resetGame}>
            Reset puzzle
          </Button>
        </div>
        {peers && peers.length > 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Players online</h3>
            <ul className="mt-3 space-y-2">
              {peers.map((peer) => (
                <li key={peer.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: peer.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-gray-700 dark:text-gray-200">{peer.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {peer.cellIndex === null ? "Browsing" : `Cell ${peer.cellIndex + 1}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
