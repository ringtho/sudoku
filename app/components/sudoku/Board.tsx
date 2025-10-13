import clsx from "clsx";
import { memo, useMemo } from "react";
import { SudokuCell } from "./Cell";
import type { SudokuBoard } from "../../libs/sudoku";
import type { NotesRecord } from "../../hooks/useSudokuGame";
import { ROW_SIZE } from "../../libs/sudoku";

export type CollaboratorPresence = {
  id: string;
  name: string;
  color: string;
  cellIndex: number | null;
};

type SudokuBoardProps = {
  board: SudokuBoard;
  notes: NotesRecord;
  givenMap: boolean[];
  selectedIndex: number | null;
  highlightValue: number | null;
  conflicts: Set<number>;
  onSelectCell: (index: number) => void;
  peers?: CollaboratorPresence[];
  lockedCells?: Record<number, { name: string; color: string }>;
  highlightColor?: string;
  showPresenceBadges?: boolean;
};

export const SudokuBoardView = memo(function SudokuBoardView({
  board,
  notes,
  givenMap,
  selectedIndex,
  highlightValue,
  conflicts,
  onSelectCell,
  peers,
  lockedCells = {},
  highlightColor,
  showPresenceBadges = true,
}: SudokuBoardProps) {
  const presenceByCell = useMemo(() => {
    const map = new Map<number, CollaboratorPresence[]>();
    peers?.forEach((peer) => {
      if (peer.cellIndex === null) return;
      const existing = map.get(peer.cellIndex) ?? [];
      existing.push(peer);
      map.set(peer.cellIndex, existing);
    });
    return map;
  }, [peers]);

  const selectedRow = selectedIndex !== null ? Math.floor(selectedIndex / ROW_SIZE) : null;
  const selectedCol = selectedIndex !== null ? selectedIndex % ROW_SIZE : null;

  return (
    <div className="relative w-full max-w-[520px]">
      <div className="grid aspect-square grid-cols-9 gap-[1px] rounded-2xl bg-slate-300/80 p-[1px] shadow-sm dark:bg-slate-700/60">
        {board.map((value, index) => {
          const row = Math.floor(index / ROW_SIZE);
          const col = index % ROW_SIZE;
          const isSelected = selectedIndex === index;
          const isRowColHighlighted =
            selectedRow !== null && selectedCol !== null && (row === selectedRow || col === selectedCol);
          const isSameValueHighlighted =
            highlightValue !== null && highlightValue === value && value !== null && !isGivenCell(givenMap, index);
          const isConflict = conflicts.has(index);
          const locked = Boolean(lockedCells[index]);
          const presence = showPresenceBadges ? presenceByCell.get(index) : undefined;
          const presenceColor = presence && presence.length ? presence[0].color : undefined;
          const isShaded = (Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 0;

          return (
            <div key={index} className="relative">
              <SudokuCell
                value={value}
                notes={notes[index] ?? []}
                isGiven={isGivenCell(givenMap, index)}
                isSelected={isSelected}
                isRowColHighlighted={isRowColHighlighted}
                isSameValueHighlighted={isSameValueHighlighted}
                isConflict={isConflict}
                isLocked={locked}
                presence={presence}
                onClick={() => onSelectCell(index)}
                className={clsx(
                  "border-0",
                  isShaded ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-950",
                )}
                selectionColor={highlightColor}
                style={presenceColor && !isSelected ? { boxShadow: `0 0 0 2px ${presenceColor}` } : undefined}
              />
              {presence && presence.length ? (
                <div className="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 gap-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {presence.map((person) => (
                    <span
                      key={person.id}
                      className="rounded-full px-2 py-0.5 shadow"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-slate-400/70 dark:border-slate-500/70" />
      {[1 / 3, 2 / 3].map((fraction) => (
        <div
          key={`h-${fraction}`}
          className="pointer-events-none absolute left-0 right-0 h-[2px] bg-slate-400/70 dark:bg-slate-500/70"
          style={{ top: `calc(${fraction * 100}% - 1px)` }}
        />
      ))}
      {[1 / 3, 2 / 3].map((fraction) => (
        <div
          key={`v-${fraction}`}
          className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-slate-400/70 dark:bg-slate-500/70"
          style={{ left: `calc(${fraction * 100}% - 1px)` }}
        />
      ))}
    </div>
  );
});

function isGivenCell(givenMap: boolean[], index: number) {
  return Boolean(givenMap[index]);
}
