import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  loading?: boolean;
}

export function ChartCard({
  title,
  subtitle,
  children,
  empty,
  emptyTitle,
  emptyBody,
  loading,
}: Props) {
  return (
    <section className="chart-card">
      <header className="chart-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <span className="unit-pill">TJ/d</span>
      </header>
      <div className="chart-card-body">
        {loading ? (
          <EmptyState title="Loading AEMO Last31…">Fetching Actual Flow and Storage CSV.</EmptyState>
        ) : empty ? (
          <EmptyState title={emptyTitle ?? "No matching facilities"}>
            {emptyBody ??
              "This operator group has no PROD rows in the current Last31 extract. Nothing is invented."}
          </EmptyState>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
