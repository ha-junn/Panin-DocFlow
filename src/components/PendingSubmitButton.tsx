"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  children: ReactNode;
  className: string;
  pendingLabel: string;
};

export function PendingSubmitButton({
  children,
  className,
  pendingLabel,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
