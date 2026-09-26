'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  /** Message shown under the field (e.g. passwords that do not match). */
  hint?: ReactNode;
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

/**
 * Password input with a button to show or hide what is being typed.
 */
export function PasswordField({ label, hint, className = '', ...input }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();

  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <span className="relative flex">
        <input
          {...input}
          type={visible ? 'text' : 'password'}
          aria-describedby={hint ? hintId : undefined}
          className={`w-full rounded-lg border border-field bg-white py-2.5 pr-11 pl-3 text-[15px] font-normal outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink aria-invalid:border-danger aria-invalid:focus-visible:outline-danger ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-lg border-none bg-transparent text-subtle hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
        >
          <EyeIcon open={!visible} />
        </button>
      </span>
      {hint && (
        <span
          id={hintId}
          className={`text-xs ${input['aria-invalid'] ? 'font-semibold text-danger' : 'font-normal text-muted'}`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
