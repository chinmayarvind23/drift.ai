import { describe, expect, it } from "vitest";
import {
  AUDIT_STATE_STORAGE_KEY,
  decryptAuditState,
  encryptAuditState,
  parsePersistedAuditState,
  serializeAuditState,
  type PersistedAuditState
} from "../lib/audit-persistence";

describe("audit persistence", () => {
  it("round-trips active evidence, local edits, scenario, and source", () => {
    const state: PersistedAuditState = {
      sourceLabel: "Maya Chen",
      sourceMessage: "Loaded 90 synthetic transactions for Maya Chen.",
      selectedSyntheticUserId: "maya-new-job",
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
          source: "seed"
        }
      ],
      transactionEdits: {
        "txn-1": {
          category: "Education",
          note: "Conference meal."
        }
      }
    };

    const restored = parsePersistedAuditState(serializeAuditState(state));

    expect(AUDIT_STATE_STORAGE_KEY).toBe("drift.audit.v1");
    expect(restored).toEqual(state);
  });

  it("ignores malformed persisted state", () => {
    expect(parsePersistedAuditState("{bad json")).toBeNull();
    expect(parsePersistedAuditState(JSON.stringify({ version: 999 }))).toBeNull();
  });

  it("encrypts persisted state so merchant names are not stored as plain text", async () => {
    const state: PersistedAuditState = {
      sourceLabel: "Plaid sandbox",
      sourceMessage: "Synced Plaid data.",
      selectedSyntheticUserId: null,
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
      transactionEdits: {}
    };

    const encrypted = await encryptAuditState(state, "test-secret");
    const restored = await decryptAuditState(encrypted, "test-secret");

    expect(encrypted).not.toContain("Bar Luce");
    expect(encrypted).not.toContain("Plaid sandbox");
    expect(restored).toEqual(state);
  });
});
