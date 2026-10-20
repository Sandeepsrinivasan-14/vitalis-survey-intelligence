/** A single parsed spreadsheet cell (CSV or Excel). */
export type SheetCell = string | number | boolean | null | undefined;

/** Parsed spreadsheet rows; the first row is expected to hold the headers. */
export type SheetData = SheetCell[][];
