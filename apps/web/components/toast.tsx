'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  id: number;
  message: string;
  action?: ToastAction;
}

type ShowToast = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast>(() => undefined);

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/**
 * Single bottom toast, as in the design: 2.4 s, or 5 s when it offers an action (Deshacer).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<ShowToast>((message, action) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    timer.current = setTimeout(() => setToast(null), action ? 5_000 : 2_400);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="contents">
        {toast && (
          <div
            key={toast.id}
            className="fixed bottom-[84px] left-1/2 z-30 flex max-w-[calc(100vw-32px)] -translate-x-1/2 animate-[toast-in_.2s_ease-out] items-center gap-3.5 rounded-lg bg-ink py-2.5 pr-3 pl-4 text-sm text-white shadow-[0_8px_24px_rgba(0,0,0,.2)]"
          >
            <span className="truncate">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  clearTimeout(timer.current);
                  setToast(null);
                  toast.action?.onClick();
                }}
                className="cursor-pointer rounded-md border border-white/70 bg-transparent px-2.5 py-1 text-[13px] font-semibold text-white hover:bg-white/12"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
