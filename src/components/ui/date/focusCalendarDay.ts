/**
 * Initial focus target for a react-day-picker popover: the selected day,
 * otherwise today's / the first enabled day button.
 */
export function focusInitialCalendarDay(container: HTMLElement): HTMLElement | null {
  return (
    container.querySelector<HTMLElement>('[aria-selected="true"] button:not([disabled])') ??
    container.querySelector<HTMLElement>('[data-today] button:not([disabled])') ??
    container.querySelector<HTMLElement>('button.rdp-day_button:not([disabled])')
  )
}
