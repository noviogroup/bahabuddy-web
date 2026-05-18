/**
 * Dashboard shell + chrome components.
 *
 * Source of truth: Baha-Buddy-V2/lib/shared/widgets/main_shell.dart
 *                  Baha-Buddy-V2/lib/features/chat/screens/chat_screen.dart
 *
 * Import:
 *   import { DashboardShell, Sidebar, ChatPanel } from '@/components/dashboard'
 */

export { default as DashboardShell } from './DashboardShell'
export type { DashboardShellProps } from './DashboardShell'

export { default as Sidebar } from './Sidebar'
export type { SidebarProps } from './Sidebar'

export { default as ChatPanel } from './ChatPanel'
export type { ChatPanelProps, ChatPanelMode } from './ChatPanel'
