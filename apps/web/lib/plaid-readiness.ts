export interface PlaidEndpoint {
  method: "GET" | "POST";
  path: string;
  purpose: string;
}

export interface PlaidReadiness {
  mode: "sandbox";
  requiredEnv: string[];
  endpoints: PlaidEndpoint[];
  nextStep: string;
}

export function getPlaidReadiness(): PlaidReadiness {
  return {
    mode: "sandbox",
    requiredEnv: ["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"],
    endpoints: [
      {
        method: "GET",
        path: "/plaid/status",
        purpose: "Checks whether the backend can call Plaid."
      },
      {
        method: "POST",
        path: "/plaid/link-token",
        purpose: "Creates the short-lived token used by Plaid Link."
      },
      {
        method: "POST",
        path: "/plaid/sandbox/public-token",
        purpose: "Creates a sandbox public token for test institutions."
      },
      {
        method: "POST",
        path: "/plaid/sync",
        purpose: "Pulls added, modified, and removed transactions."
      }
    ],
    nextStep: "Add sandbox credentials, create a Link token, exchange the public token, then sync transactions."
  };
}
