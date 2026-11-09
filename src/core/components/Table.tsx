import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

interface TableProps {
  columns: ReactNode[];
  rows: ReactNode[][];
  emptyText?: string;
  className?: string;
}

export function Table({ columns, rows, emptyText = "رکوردی یافت نشد.", className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-border bg-surface ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-2 border-b border-border">
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-4 py-3 text-right font-medium text-foreground-muted whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-foreground-subtle">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-foreground whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Th(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="px-4 py-3 text-right font-medium text-foreground-muted" {...props} />;
}

export function Td(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-4 py-3" {...props} />;
}
