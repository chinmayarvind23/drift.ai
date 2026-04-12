"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { EvidenceRow } from "@/components/audit-ui";
import { DRIFT_CATEGORY_TAXONOMY, filterEvidenceTransactions, paginateEvidenceTransactions } from "@/lib/evidence-review";

export default function EvidencePage() {
  const { applyEvidenceEdit, editedTransactions, transactionEdits } = useAuditWorkspace();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const sortedEvidence = useMemo(
    () => editedTransactions.slice().sort((left, right) => right.transactionDate.localeCompare(left.transactionDate)),
    [editedTransactions]
  );
  const filtered = useMemo(() => filterEvidenceTransactions(sortedEvidence, { category, search }), [category, search, sortedEvidence]);
  const evidencePage = useMemo(() => paginateEvidenceTransactions(filtered, page), [filtered, page]);

  function updateCategory(nextCategory: string) {
    setCategory(nextCategory);
    setPage(1);
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    setPage(1);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 lg:py-8">
      <div className="surface-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Evidence review</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Correct the evidence before trusting the audit. Local edits override imported or synced categories.
            </p>
          </div>
          <Badge className="w-fit rounded-[8px] border-border bg-background text-muted-foreground">
            {Object.keys(transactionEdits).length} local edits
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr]">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Filter category</span>
            <select className="field-control" value={category} onChange={(event) => updateCategory(event.target.value)}>
              <option value="all">All categories</option>
              {DRIFT_CATEGORY_TAXONOMY.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Search evidence</span>
            <input className="field-control" placeholder="Merchant, category, date, or note" value={search} onChange={(event) => updateSearch(event.target.value)} />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {evidencePage.items.length > 0 ? evidencePage.items.map((transaction) => <EvidenceRow key={transaction.sourceHash} transaction={transaction} onEdit={applyEvidenceEdit} />) : (
            <div className="surface-card text-sm leading-6 text-muted-foreground">
              Load a test profile or import a CSV on the Scan page to review evidence.
            </div>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {evidencePage.items.length} of {evidencePage.totalItems} matching transactions. Page {evidencePage.page} of {evidencePage.totalPages}.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 rounded-[8px] border-border bg-background" disabled={evidencePage.page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              <Button variant="outline" className="h-9 rounded-[8px] border-border bg-background" disabled={evidencePage.page === evidencePage.totalPages} onClick={() => setPage((current) => Math.min(evidencePage.totalPages, current + 1))}>Next</Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
