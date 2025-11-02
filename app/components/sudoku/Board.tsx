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
  photoURL?: string | null;
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
            highlightValue !== null && highlightValue === value && value !== null;
          const isConflict = conflicts.has(index);
          const locked = Boolean(lockedCells[index]);
          const cellPresence = showPresenceBadges ? presenceByCell.get(index) : undefined;
          const presenceColor = cellPresence && cellPresence.length ? cellPresence[0].color : undefined;
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
                presence={cellPresence}
                showPresenceBadge={false}
                onClick={() => onSelectCell(index)}
                className={clsx(
                  "border-0",
                  isShaded ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-950",
                )}
                selectionColor={highlightColor}
                style={presenceColor && !isSelected ? { boxShadow: `0 0 0 2px ${presenceColor}` } : undefined}
              />
              {cellPresence && cellPresence.length ? (
                <div className="pointer-events-none absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1">
                  <div className="flex -space-x-1.5">
                    {cellPresence.slice(0, 3).map((person) => {
                      const initials = person.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <div
                          key={person.id}
                          className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-white/90 bg-slate-500 text-[8px] font-semibold text-white shadow-sm dark:border-slate-900"
                          style={!person.photoURL ? { backgroundColor: person.color } : undefined}
                          title={person.name}
                        >
                          {person.photoURL ? (
                            <img
                              src={person.photoURL}
                              alt={person.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            initials || "?"
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {cellPresence.length > 3 ? (
                    <span className="rounded-full bg-gray-900/80 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm dark:bg-white/20">
                      +{cellPresence.length - 3}
                    </span>
                  ) : null}
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
