import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountSyncCard } from "@/components/account-sync-card";
import { AuthActionLink } from "@/components/auth-action-link";
import { auth0, isAuth0Configured } from "@/lib/auth0";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AccountPageProps {
  searchParams?: Promise<{
    auth?: string;
  }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = searchParams ? await searchParams : {};
  const configured = isAuth0Configured();
  const session = auth0 ? await auth0.getSession() : null;
  const googleAuthEnabled = process.env.NEXT_PUBLIC_AUTH0_GOOGLE_ENABLED === "true";
  const authNotice =
    params.auth === "complete"
      ? "Signed in. Your account sync is ready."
      : params.auth === "expired"
        ? "That sign-in screen expired. Start sign-in again from here."
        : null;

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
        {authNotice ? (
          <div className="mt-4 rounded-[8px] border border-border bg-muted/35 px-4 py-3 text-sm text-foreground">
            {authNotice}
          </div>
        ) : null}

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
                <>
                  <Button className="h-10 rounded-[8px]" asChild>
                    <AuthActionLink action="login">Sign in</AuthActionLink>
                  </Button>
                  <Button className="h-10 rounded-[8px]" variant="outline" asChild>
                    <AuthActionLink action="signup">Sign up</AuthActionLink>
                  </Button>
                  {googleAuthEnabled ? (
                    <Button className="h-10 rounded-[8px]" variant="outline" asChild>
                      <AuthActionLink action="google">Continue with Google</AuthActionLink>
                    </Button>
                  ) : null}
                </>
              ) : null}
              {configured && session ? (
                <Button className="h-10 rounded-[8px]" variant="outline" asChild>
                  <AuthActionLink action="logout">Sign out</AuthActionLink>
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
