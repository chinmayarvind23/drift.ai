"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PaymentButtonProps {
  href: string | null;
  label: string;
}

export function PaymentButton({ href, label }: PaymentButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startCheckout() {
    if (href) {
      window.location.assign(href);
      return;
    }

    setIsLoading(true);
    setMessage("Opening checkout...");

    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST"
      });
      const body = (await response.json()) as { ok: boolean; url?: string; error?: string };

      if (!body.ok || !body.url) {
        setMessage(body.error ?? "Checkout is not ready yet.");
        return;
      }

      window.location.assign(body.url);
    } catch {
      setMessage("Checkout is not ready yet.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button className="h-10 rounded-[8px]" disabled={isLoading} onClick={startCheckout}>
        {isLoading ? "Opening checkout..." : label}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
