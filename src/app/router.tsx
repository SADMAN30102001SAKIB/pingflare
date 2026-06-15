import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { AppLayout } from './layouts/app-layout'
import { RootLayout } from './layouts/root-layout'
import { AuthPage } from './pages/auth-page'
import { DashboardPage } from './pages/dashboard-page'
import { LandingPage } from './pages/landing-page'
import { MonitorFormPage } from './pages/monitor-form-page'
import { PublicStatusPage } from './pages/public-status-page'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <AuthPage mode="login" />,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: () => <AuthPage mode="signup" />,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AppLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: DashboardPage,
})

const newMonitorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitors/new',
  component: () => <MonitorFormPage mode="create" />,
})

const editMonitorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitors/$monitorId',
  component: () => <MonitorFormPage mode="edit" />,
})

const publicStatusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/status/$slug',
  component: PublicStatusPage,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    loginRoute,
    signupRoute,
    appRoute.addChildren([dashboardRoute, newMonitorRoute, editMonitorRoute]),
    publicStatusRoute,
  ]),
  defaultPreload: 'intent',
  defaultPendingComponent: () => <div className="center-panel">Loading...</div>,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
