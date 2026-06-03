"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type LoadingLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  target?: string;
  title?: string;
  "aria-label"?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function shouldSkipLoading(event: MouseEvent<HTMLAnchorElement>, target?: string) {
  return (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    Boolean(target && target !== "_self")
  );
}

export function LoadingLink({
  children,
  className,
  pendingLabel,
  target,
  onClick,
  ...props
}: LoadingLinkProps) {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isPending) {
      return;
    }

    const timeout = window.setTimeout(() => setIsPending(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [isPending]);

  return (
    <Link
      {...props}
      target={target}
      aria-busy={isPending}
      className={[className, isPending ? "pointer-events-none opacity-80" : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        onClick?.(event);

        if (!shouldSkipLoading(event, target)) {
          setIsPending(true);
        }
      }}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Link>
  );
}
