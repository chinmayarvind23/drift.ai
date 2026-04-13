"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import {
  buildAuthActionHref,
  DEFAULT_AUTH_RETURN_TO,
  type AuthAction
} from "@/lib/auth-navigation";

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

      event.preventDefault();
      const origin = window.location.origin;
      window.location.replace(buildAuthActionHref(action, returnTo, origin));
    }

    return <a ref={ref} href={fallbackHref} onClick={handleClick} {...props} />;
  }
);

AuthActionLink.displayName = "AuthActionLink";
