"use client";

import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  idleText: string;
  pendingText?: string;
  confirmMessage: string;
  className?: string;
};

export default function ConfirmSubmitButton({
  idleText,
  pendingText = "Working...",
  confirmMessage,
  className,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}
