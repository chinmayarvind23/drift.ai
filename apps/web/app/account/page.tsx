import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountSyncCard } from "@/components/account-sync-card";
import { auth0, isAuth0Configured } from "@/lib/auth0";

export default async function AccountPage() {
  const configured = isAuth0Configured();
  const session = auth0 ? await auth0.getSession() : null;

  return (
    <section className="mx-auto max-w-4xl px-5 py-6 md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          Private account
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Account sync</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Sign in only when you want backup across devices. Drift keeps raw transaction rows out of account sync.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="surface-card">
            <p className="text-sm font-semibold">Auth0 sign-in</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {configured
                ? session
                  ? `Signed in as ${session.user.email ?? session.user.name ?? "your Auth0 account"}.`
                  : "Auth0 is configured. Sign in to enable personal cloud backup."
                : "Add Auth0 keys to enable sign-in."}
            </p>
            <div className="mt-4 flex gap-2">
              {configured && !session ? (
                <Button className="h-10 rounded-[8px]" asChild>
                  <a href="/auth/login">Sign in</a>
                </Button>
              ) : null}
              {configured && session ? (
                <Button className="h-10 rounded-[8px]" variant="outline" asChild>
                  <a href="/auth/logout">Sign out</a>
                </Button>
              ) : null}
            </div>
            {!configured ? (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Required: AUTH0_SECRET, APP_BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET.
              </p>
            ) : null}
          </div>

          <AccountSyncCard />
        </div>
      </div>
    </section>
  );
}
