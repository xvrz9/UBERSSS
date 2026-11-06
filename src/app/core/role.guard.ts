import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './models';

// Solo deja pasar al rol indicado; los demás vuelven a su propio dashboard.
export const roleGuard = (rol: Rol): CanActivateFn => () => {
  const auth = inject(AuthService);
  const usuario = auth.usuario();
  if (!usuario) return inject(Router).createUrlTree(['/login']);
  return usuario.rol === rol ? true : inject(Router).createUrlTree([auth.rutaInicio(usuario.rol)]);
};
