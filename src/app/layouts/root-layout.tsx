import { Outlet } from '@tanstack/react-router'

export function RootLayout() {
  return (
    <div className="root-shell">
      <Outlet />
    </div>
  )
}
