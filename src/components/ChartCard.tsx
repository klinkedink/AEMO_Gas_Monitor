import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

interface Props {
  title: string;
  children: ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  loading?: boolean;
}

export function ChartCard({ title, children, empty, emptyTitle, emptyBody, loading }: Props) {
  return (
    <section className="chart-card">
      <header className="chart-card-head">
        <h2>{title}</h2>
        <span className="unit-pill">TJ/d</span>
      </header>
      <div className="chart-card-body">
        {loading ? (
          <EmptyState title="Loading AEMO history…">Fetching Actual Flow and Storage (full history zip).</EmptyState>
        ) : empty ? (
          <EmptyState title={emptyTitle ?? "No matching facilities"}>
            {emptyBody ??
              "This group has no rows in the selected window. Facilities are not invented."}
          </EmptyState>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
