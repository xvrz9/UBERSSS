import { Routes } from '@angular/router';
import { authGuard, invitadoGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cliente',
    canActivate: [authGuard, roleGuard('cliente')],
    loadComponent: () => import('./cliente/cliente.page').then((m) => m.ClientePage),
  },
  {
    path: 'conductor',
    canActivate: [authGuard, roleGuard('conductor')],
    loadComponent: () => import('./conductor/conductor.page').then((m) => m.ConductorPage),
  },
  { path: '**', redirectTo: 'login' },
];
