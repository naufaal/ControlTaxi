/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthenticatedRouteRouteImport } from './routes/_authenticated/route'
import { Route as AuthRouteImport } from './routes/auth'
import { Route as CookiesRouteImport } from './routes/cookies'
import { Route as PrivacidadRouteImport } from './routes/privacidad'
import { Route as EliminarCuentaRouteImport } from './routes/eliminar-cuenta'
import { Route as AuthenticatedAdminRouteImport } from './routes/_authenticated/admin'
import { Route as AuthenticatedPanelRouteImport } from './routes/_authenticated/panel'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)

const AuthenticatedRouteRoute = AuthenticatedRouteRouteImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRouteImport,
} as any)

const AuthRoute = AuthRouteImport.update({
  id: '/auth',
  path: '/auth',
  getParentRoute: () => rootRouteImport,
} as any)

const CookiesRoute = CookiesRouteImport.update({
  id: '/cookies',
  path: '/cookies',
  getParentRoute: () => rootRouteImport,
} as any)

const PrivacidadRoute = PrivacidadRouteImport.update({
  id: '/privacidad',
  path: '/privacidad',
  getParentRoute: () => rootRouteImport,
} as any)

const EliminarCuentaRoute = EliminarCuentaRouteImport.update({
  id: '/eliminar-cuenta',
  path: '/eliminar-cuenta',
  getParentRoute: () => rootRouteImport,
} as any)

const AuthenticatedAdminRoute = AuthenticatedAdminRouteImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

const AuthenticatedPanelRoute = AuthenticatedPanelRouteImport.update({
  id: '/panel',
  path: '/panel',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/cookies': typeof CookiesRoute
  '/privacidad': typeof PrivacidadRoute
  '/eliminar-cuenta': typeof EliminarCuentaRoute
  '/admin': typeof AuthenticatedAdminRoute
  '/panel': typeof AuthenticatedPanelRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/auth': typeof AuthRoute
  '/cookies': typeof CookiesRoute
  '/privacidad': typeof PrivacidadRoute
  '/eliminar-cuenta': typeof EliminarCuentaRoute
  '/admin': typeof AuthenticatedAdminRoute
  '/panel': typeof AuthenticatedPanelRoute
}

export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/_authenticated': typeof AuthenticatedRouteRouteWithChildren
  '/auth': typeof AuthRoute
  '/cookies': typeof CookiesRoute
  '/privacidad': typeof PrivacidadRoute
  '/eliminar-cuenta': typeof EliminarCuentaRoute
  '/_authenticated/admin': typeof AuthenticatedAdminRoute
  '/_authenticated/panel': typeof AuthenticatedPanelRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/auth' | '/cookies' | '/privacidad' | '/eliminar-cuenta' | '/admin' | '/panel'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/auth' | '/cookies' | '/privacidad' | '/eliminar-cuenta' | '/admin' | '/panel'
  id:
    | '__root__'
    | '/'
    | '/_authenticated'
    | '/auth'
    | '/cookies'
    | '/privacidad'
    | '/eliminar-cuenta'
    | '/_authenticated/admin'
    | '/_authenticated/panel'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthenticatedRouteRoute: typeof AuthenticatedRouteRouteWithChildren
  AuthRoute: typeof AuthRoute
  CookiesRoute: typeof CookiesRoute
  PrivacidadRoute: typeof PrivacidadRoute
  EliminarCuentaRoute: typeof EliminarCuentaRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedRouteRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/auth': {
      id: '/auth'
      path: '/auth'
      fullPath: '/auth'
      preLoaderRoute: typeof AuthRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/cookies': {
      id: '/cookies'
      path: '/cookies'
      fullPath: '/cookies'
      preLoaderRoute: typeof CookiesRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/privacidad': {
      id: '/privacidad'
      path: '/privacidad'
      fullPath: '/privacidad'
      preLoaderRoute: typeof PrivacidadRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/eliminar-cuenta': {
      id: '/eliminar-cuenta'
      path: '/eliminar-cuenta'
      fullPath: '/eliminar-cuenta'
      preLoaderRoute: typeof EliminarCuentaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated/admin': {
      id: '/_authenticated/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AuthenticatedAdminRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/panel': {
      id: '/_authenticated/panel'
      path: '/panel'
      fullPath: '/panel'
      preLoaderRoute: typeof AuthenticatedPanelRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
  }
}

interface AuthenticatedRouteRouteChildren {
  AuthenticatedAdminRoute: typeof AuthenticatedAdminRoute
  AuthenticatedPanelRoute: typeof AuthenticatedPanelRoute
}

const AuthenticatedRouteRouteChildren: AuthenticatedRouteRouteChildren = {
  AuthenticatedAdminRoute: AuthenticatedAdminRoute,
  AuthenticatedPanelRoute: AuthenticatedPanelRoute,
}

const AuthenticatedRouteRouteWithChildren =
  AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  AuthRoute: AuthRoute,
  CookiesRoute: CookiesRoute,
  PrivacidadRoute: PrivacidadRoute,
  EliminarCuentaRoute: EliminarCuentaRoute,
}

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
