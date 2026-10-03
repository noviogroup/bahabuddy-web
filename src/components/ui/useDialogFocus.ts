'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('inert') && element.getAttribute('aria-hidden') !== 'true',
  )
}

export interface UseDialogFocusOptions {
  /** Whether the dialog/popover is currently shown. */
  open: boolean
  /** The dialog/popover element. */
  containerRef: RefObject<HTMLElement>
  /** Called on Escape. Omit when the caller already handles Escape. */
  onClose?: () => void
  /** Element to focus on open; defaults to the first focusable element. */
  getInitialFocus?: (container: HTMLElement) => HTMLElement | null | undefined
  /** Keep Tab / Shift+Tab inside the container (modal dialogs). */
  trapFocus?: boolean
  /** Return focus to the element that was focused before opening. Default true. */
  restoreFocus?: boolean
}

/**
 * Shared focus management for dialogs and popovers (WCAG 2.4.3 / 2.1.2):
 * remembers the opener, moves focus inside on open, optionally traps Tab,
 * closes on Escape, and restores focus to the opener on close.
 */
export function useDialogFocus({
  open,
  containerRef,
  onClose,
  getInitialFocus,
  trapFocus = false,
  restoreFocus = true,
}: UseDialogFocusOptions) {
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const getInitialFocusRef = useRef(getInitialFocus)
  onCloseRef.current = onClose
  getInitialFocusRef.current = getInitialFocus

  useEffect(() => {
    if (!open) return

    const active = document.activeElement
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null

    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container || container.contains(document.activeElement)) return
      const target = getInitialFocusRef.current?.(container) ?? getFocusableElements(container)[0] ?? container
      if (target === container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1')
      target.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      const container = containerRef.current
      if (!container) return

      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (!trapFocus || event.key !== 'Tab') return
      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement
      if (event.shiftKey && (activeElement === first || !container.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !container.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      const opener = openerRef.current
      openerRef.current = null
      if (!restoreFocus || !opener || !opener.isConnected) return
      // Only pull focus back when it would otherwise be lost (inside the
      // closed dialog or dropped to <body>), not when the user moved on.
      const current = document.activeElement
      const container = containerRef.current
      if (!current || current === document.body || (container && container.contains(current))) {
        opener.focus()
      }
    }
  }, [open, containerRef, trapFocus, restoreFocus])
}
