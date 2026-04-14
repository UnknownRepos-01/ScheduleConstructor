"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { AppIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

const ANIMATION_MS = 200;

const modalClasses = {
  root: "fixed inset-0 z-[150] flex items-center justify-center p-4",
  overlay:
    "absolute inset-0 bg-black/50 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
  panel:
    "relative z-10 w-full max-w-2xl rounded-xl border border-border bg-bg-card p-5 shadow-2xl transition duration-200 data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 md:p-6",
  header: "mb-4 flex items-start justify-between gap-3",
  title: "text-lg font-semibold text-text-primary",
  closeButton: "text-text-tertiary hover:text-text-primary",
  body: "max-h-[calc(100vh-9rem)] overflow-y-auto pr-0.5",
} as const;

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    setIsVisible(false);
    const timeoutId = setTimeout(() => setIsMounted(false), ANIMATION_MS);
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const container = panelRef.current;
    if (!container) return;

    const firstInteractive = container.querySelector<HTMLElement>(
      "input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])",
    );
    (firstInteractive ?? container).focus();
  }, [isOpen]);

  if (!isMounted) return null;

  const state = isVisible ? "open" : "closed";

  return (
    <div className={modalClasses.root}>
      <button
        type="button"
        aria-label="Закрыть модальное окно"
        className={modalClasses.overlay}
        data-state={state}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        data-state={state}
        className={cn(modalClasses.panel, className)}
      >
        {title ? (
          <div className={modalClasses.header}>
            <h2 id={titleId} className={modalClasses.title}>{title}</h2>
            <button type="button" className={modalClasses.closeButton} onClick={onClose} aria-label="Закрыть">
              <AppIcon name="close" className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <div className={modalClasses.body}>{children}</div>
      </div>
    </div>
  );
}
