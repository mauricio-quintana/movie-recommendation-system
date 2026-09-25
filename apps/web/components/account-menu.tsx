'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { SignOutButton } from './sign-out-button';

interface AccountMenuProps {
  username: string | null;
  /** 'avatar' in the desktop header, 'tab' in the mobile tab bar. */
  variant: 'avatar' | 'tab';
}

export function AccountMenu({ username, variant }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = (event: PointerEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !rootRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);

    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!username) {
    return variant === 'avatar' ? (
      <Link href="/login" className="btn-secondary btn-sm flex-none">
        Ingresar
      </Link>
    ) : (
      <Link
        href="/login"
        className="flex min-w-16 flex-col items-center gap-0.5 text-muted no-underline"
      >
        <span aria-hidden="true" className="text-base">
          ☺
        </span>
        Cuenta
      </Link>
    );
  }

  const trigger =
    variant === 'avatar' ? (
      <span className="flex size-[30px] items-center justify-center rounded-full border border-ink text-xs font-semibold uppercase">
        {username[0]}
      </span>
    ) : (
      <span className="flex min-w-16 flex-col items-center gap-0.5 text-muted">
        <span aria-hidden="true" className="text-base">
          ☺
        </span>
        Cuenta
      </span>
    );

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        type="button"
        aria-label={`Cuenta de ${username}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-[inherit] text-ink"
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          className={`absolute z-40 flex min-w-52 flex-col gap-3 rounded-[10px] border border-line bg-white p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,.12)] ${
            variant === 'avatar'
              ? 'top-[calc(100%+10px)] right-0'
              : 'right-0 bottom-[calc(100%+14px)]'
          }`}
        >
          <span className="kicker">SESIÓN INICIADA</span>
          <span className="truncate text-[15px] font-semibold">{username}</span>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
