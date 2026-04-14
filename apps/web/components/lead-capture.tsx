"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { LeadIntent } from "@/lib/account-sync";
import type { ReportPdfInput } from "@/lib/report-pdf";

export function LeadCapture({
  buttonLabel = "Send me my Drift report",
  intent = "report",
  reportAttachment
}: {
  buttonLabel?: string;
  intent?: LeadIntent;
  reportAttachment?: ReportPdfInput;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");

    const response = await fetch("/api/interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, intent, report: reportAttachment })
    });
    const body = await response.json() as {
      ok: boolean;
      emailSent?: boolean;
      emailError?: string;
      error?: string;
      storage?: string;
      lead?: unknown;
    };

    if (!body.ok) {
      setMessage(body.error ?? "Could not save this email.");
      return;
    }

    if (body.storage === "local_only") {
      window.localStorage.setItem("drift.interestLead", JSON.stringify(body.lead));
      setMessage(
        body.emailSent
          ? "Email sent. Saved locally too."
          : `Saved locally. ${body.emailError ?? "Email is not configured yet."}`
      );
      return;
    }

    setMessage(
      body.emailSent
        ? "Email sent."
        : `Saved to your account. ${body.emailError ?? "Email is not configured yet."}`
    );
    setEmail("");
  }

  return (
    <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={submitLead}>
      <input
        aria-label="Email address"
        className="min-h-10 flex-1 rounded-[8px] border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        type="email"
        value={email}
      />
      <Button className="h-10 rounded-[8px]" type="submit">
        {buttonLabel}
      </Button>
      {message ? <p className="text-sm text-muted-foreground sm:self-center">{message}</p> : null}
    </form>
  );
}
