import { Button } from "../ui/button";
import type { SudokuMode } from "../../hooks/useSudokuGame";

type NumberPadProps = {
  onInput: (value: number) => void;
  onClear: () => void;
  onHint?: () => void;
  mode: SudokuMode;
  numbersLeft: Record<number, number>;
  setMode: (mode: SudokuMode) => void;
};

export function NumberPad({
  onInput,
  onClear,
  onHint,
  mode,
  numbersLeft,
  setMode,
}: NumberPadProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, index) => index + 1).map((digit) => (
          <Button
            key={digit}
            variant="outline"
            className="flex h-12 w-full flex-col items-center justify-center rounded-2xl border border-gray-300 text-base font-semibold dark:border-gray-700"
            onClick={() => onInput(digit)}
          >
            {digit}
            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
              left: {numbersLeft[digit]}
            </span>
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="ghost"
          className={mode === "value" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : undefined}
          onClick={() => setMode("value")}
        >
          Value mode
        </Button>
        <Button
          variant="ghost"
          className={mode === "note" ? "bg-purple-500/10 text-purple-600 dark:text-purple-300" : undefined}
          onClick={() => setMode("note")}
        >
          Note mode
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onClear}>
          Clear
        </Button>
        <Button variant="outline" onClick={onHint} disabled={!onHint}>
          Hint (coming soon)
        </Button>
      </div>
    </div>
  );
}
