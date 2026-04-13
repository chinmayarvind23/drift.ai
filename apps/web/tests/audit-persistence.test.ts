import { describe, expect, it } from "vitest";
import {
  AUDIT_STATE_STORAGE_KEY,
  decryptAuditState,
  encryptAuditState,
  isRemovedSyntheticProfileState,
  parsePersistedAuditState,
  serializeAuditState,
  type PersistedAuditState
} from "../lib/audit-persistence";

describe("audit persistence", () => {
  it("round-trips active evidence, local edits, scenario, and source", () => {
    const state: PersistedAuditState = {
      sourceLabel: "Imported CSV",
      sourceMessage: "Imported 18 transactions from evidence-review.csv.",
      projectionScenario: {
        years: 20,
        annualReturnRate: 0.09
      },
      transactions: [
        {
          transactionDate: "2026-03-15",
          merchantName: "Bar Luce",
          amountCents: 12000,
          category: "Dining",
          sourceHash: "txn-1",
          source: "seed" as const
        }
      ],
      transactionEdits: {
        "txn-1": {
          category: "Education",
          note: "Conference meal."
        }
      },
      behaviorInsights: {},
      interceptDecisions: [],
      lastSyncAt: null
    };

    const restored = parsePersistedAuditState(serializeAuditState(state));

    expect(AUDIT_STATE_STORAGE_KEY).toBe("drift.audit.v1");
    expect(restored).toEqual(state);
  });

  it("ignores malformed persisted state", () => {
    expect(parsePersistedAuditState("{bad json")).toBeNull();
    expect(parsePersistedAuditState(JSON.stringify({ version: 999 }))).toBeNull();
  });

  it("identifies old persisted synthetic profile sessions for migration", () => {
    const staleTransactions = [
      {
        transactionDate: "2026-03-15",
        merchantName: "Bar Luce",
        amountCents: 12000,
        category: "Dining",
        sourceHash: "txn-1",
        source: "seed" as const
      }
    ];
    const staleState = {
      sourceLabel: "Maya Chen",
      sourceMessage: "Loaded 90 synthetic transactions for Maya Chen.",
      selectedSyntheticUserId: "maya-new-job",
      projectionScenario: {
        years: 10,
        annualReturnRate: 0.07
      },
      transactions: staleTransactions,
      transactionEdits: {},
      behaviorInsights: {},
      interceptDecisions: [],
      lastSyncAt: null
    };
    const importedState: PersistedAuditState = {
      sourceLabel: "Imported CSV",
      sourceMessage: "Imported 18 transactions from evidence-review.csv.",
      projectionScenario: {
        years: 10,
        annualReturnRate: 0.07
      },
      transactions: staleTransactions,
      transactionEdits: {},
      behaviorInsights: {},
      interceptDecisions: [],
      lastSyncAt: null
    };

    expect(isRemovedSyntheticProfileState(staleState)).toBe(true);
    expect(isRemovedSyntheticProfileState(importedState)).toBe(false);
  });

  it("encrypts persisted state so merchant names are not stored as plain text", async () => {
    const state: PersistedAuditState = {
      sourceLabel: "Plaid sandbox",
      sourceMessage: "Synced Plaid data.",
      projectionScenario: {
        years: 10,
        annualReturnRate: 0.07
      },
      transactions: [
        {
          transactionDate: "2026-03-15",
          merchantName: "Bar Luce",
          amountCents: 12000,
          category: "Dining",
          sourceHash: "hashed-source",
          source: "plaid"
        }
      ],
      transactionEdits: {},
      behaviorInsights: {},
      interceptDecisions: [],
      lastSyncAt: "2026-04-12T10:00:00.000Z"
    };

    const encrypted = await encryptAuditState(state, "test-secret");
    const restored = await decryptAuditState(encrypted, "test-secret");

    expect(encrypted).not.toContain("Bar Luce");
    expect(encrypted).not.toContain("Plaid sandbox");
    expect(restored).toEqual(state);
  });

  it("restores older imported states with new local-memory defaults", () => {
    const restored = parsePersistedAuditState(JSON.stringify({
      version: 1,
      state: {
        sourceLabel: "Imported CSV",
        sourceMessage: "Imported 12 transactions from sample-drift.csv.",
        projectionScenario: {
          years: 10,
          annualReturnRate: 0.07
        },
        transactions: null,
        transactionEdits: {}
      }
    }));

    expect(restored?.behaviorInsights).toEqual({});
    expect(restored?.interceptDecisions).toEqual([]);
    expect(restored?.lastSyncAt).toBeNull();
  });
});
