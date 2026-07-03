"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  className: string;
  message: string;
  pendingLabel?: string;
};

export function ConfirmSubmitButton({
  children,
  className,
  message,
  pendingLabel = "Memproses",
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={[
        className,
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none",
      ].join(" ")}
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }

        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
