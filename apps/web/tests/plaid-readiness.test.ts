import { describe, expect, it } from "vitest";
import { getPlaidReadiness } from "../lib/plaid-readiness";

describe("getPlaidReadiness", () => {
  it("lists the sandbox routes and required server secrets", () => {
    const readiness = getPlaidReadiness();

    expect(readiness.mode).toBe("sandbox");
    expect(readiness.requiredEnv).toEqual(["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"]);
    expect(readiness.endpoints.map((endpoint) => endpoint.path)).toContain("/plaid/link-token");
    expect(readiness.endpoints.map((endpoint) => endpoint.path)).toContain(
      "/plaid/sandbox/public-token"
    );
  });
});
