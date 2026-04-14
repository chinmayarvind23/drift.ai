"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import {
  buildAuthActionHref,
  DEFAULT_AUTH_RETURN_TO,
  type AuthAction
} from "@/lib/auth-navigation";
import {
  AUDIT_STATE_STORAGE_KEY,
  AUDIT_STORAGE_SECRET_KEY
} from "@/lib/audit-persistence";
import { clearCachedAccountStatus } from "@/lib/account-status-cache";

interface AuthActionLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  action: AuthAction;
  returnTo?: string;
}

export const AuthActionLink = forwardRef<HTMLAnchorElement, AuthActionLinkProps>(
  ({ action, returnTo = DEFAULT_AUTH_RETURN_TO, onClick, ...props }, ref) => {
    const fallbackHref = buildAuthActionHref(action, returnTo);

    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      if (action !== "logout") {
        return;
      }

      event.preventDefault();
      const origin = window.location.origin;

      window.localStorage.removeItem(AUDIT_STATE_STORAGE_KEY);
      window.localStorage.removeItem(AUDIT_STORAGE_SECRET_KEY);
      clearCachedAccountStatus(window.localStorage);

      window.location.replace(buildAuthActionHref(action, returnTo, origin));
    }

    return <a ref={ref} href={fallbackHref} onClick={handleClick} {...props} />;
  }
);

AuthActionLink.displayName = "AuthActionLink";
