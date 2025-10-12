import clsx from "clsx";
import type { MouseEventHandler } from "react";

type PresenceIndicator = {
  id: string;
  name: string;
  color: string;
};

type SudokuCellProps = {
  value: number | null;
  notes?: number[];
  isGiven?: boolean;
  isSelected?: boolean;
  isRowColHighlighted?: boolean;
  isSameValueHighlighted?: boolean;
  isConflict?: boolean;
  isLocked?: boolean;
  presence?: PresenceIndicator[];
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
};

export function SudokuCell({
  value,
  notes = [],
  isGiven,
  isSelected,
  isRowColHighlighted,
  isSameValueHighlighted,
  isConflict,
  isLocked,
  presence,
  onClick,
  className,
}: SudokuCellProps) {
  const showNotes = value === null && notes.length > 0;
  const ariaLabel = value
    ? `Value ${value}${isGiven ? ", given" : ""}`
    : notes.length > 0
      ? `Notes ${notes.join(", ")}`
      : "Empty cell";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={clsx(
        "relative flex aspect-square w-full select-none items-center justify-center border text-lg font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        "border-slate-200/80 bg-white text-slate-700 dark:border-slate-700/70 dark:bg-slate-950 dark:text-slate-200",
        isGiven ? "text-slate-900 dark:text-slate-100" : null,
        isRowColHighlighted && !isSelected ? "bg-slate-100 dark:bg-slate-800" : null,
        isSameValueHighlighted && !isSelected ? "bg-amber-100/70 dark:bg-amber-500/20" : null,
        isConflict ? "bg-rose-50 text-rose-600 ring-1 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-100" : null,
        isSelected
          ? "z-10 ring-2 ring-slate-400 shadow-sm dark:ring-slate-300"
          : "hover:bg-slate-100 dark:hover:bg-slate-800",
        isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        className,
      )}
      onClick={onClick}
      disabled={isLocked}
    >
      {value !== null ? (
        <span className={clsx("text-2xl leading-none", isGiven ? "font-semibold" : "font-medium")}>
          {value}
        </span>
      ) : showNotes ? (
        <NotesGrid notes={notes} />
      ) : (
        null
      )}
      {presence?.length ? (
        <span className="absolute right-1 top-1 flex gap-1">
          {presence.map((person) => (
            <span
              key={person.id}
              className="h-2 w-2 rounded-full ring-1 ring-white/70 dark:ring-slate-900"
              style={{ backgroundColor: person.color }}
              title={person.name}
            />
          ))}
        </span>
      ) : null}
      {isLocked ? (
        <span className="absolute inset-x-0 bottom-1 mx-auto w-max rounded-full bg-orange-500/20 px-2 text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:bg-orange-400/20 dark:text-orange-300">
          Locked
        </span>
      ) : null}
    </button>
  );
}

function NotesGrid({ notes }: { notes: number[] }) {
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-0.5 text-[11px] leading-3 text-slate-400 dark:text-slate-500">
      {Array.from({ length: 9 }, (_, index) => index + 1).map((digit) => (
        <span key={digit} className="flex items-center justify-center">
          {notes.includes(digit) ? digit : ""}
        </span>
      ))}
    </div>
  );
}
