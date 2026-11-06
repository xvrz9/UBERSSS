import { Injectable, signal } from '@angular/core';
import { Observable, delay, of, tap, throwError, timer, switchMap } from 'rxjs';
import { Rol, Sesion, Usuario } from './models';

const CLAVE_SESION = 'sesion';

// Usuarios de prueba. Reemplaza a POST /api/auth/login mientras no haya backend.
const USUARIOS: (Usuario & { password: string })[] = [
  { id: 1, nombre: 'Laura Gómez', email: 'cliente@test.com', password: '123456', rol: 'cliente' },
  { id: 2, nombre: 'Carlos Ramírez', email: 'conductor@test.com', password: '123456', rol: 'conductor' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly usuario = signal<Usuario | null>(this.leerSesion()?.usuario ?? null);

  // Misma firma que tendría con HttpClient: devuelve un Observable con el usuario.
  login(email: string, password: string): Observable<Usuario> {
    const encontrado = USUARIOS.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    );

    if (!encontrado) {
      return timer(500).pipe(
        switchMap(() => throwError(() => new Error('Correo o contraseña incorrectos')))
      );
    }

    const { id, nombre, rol } = encontrado;
    const usuario: Usuario = { id, nombre, email: encontrado.email, rol };
    const sesion: Sesion = { token: `mock-${usuario.id}-${Date.now()}`, usuario };

    return of(usuario).pipe(
      delay(500),
      tap(() => {
        localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        this.usuario.set(usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(CLAVE_SESION);
    this.usuario.set(null);
  }

  estaAutenticado(): boolean {
    return this.usuario() !== null;
  }

  rutaInicio(rol: Rol | undefined = this.usuario()?.rol): string {
    if (rol === 'cliente') return '/cliente';
    if (rol === 'conductor') return '/conductor';
    return '/login';
  }

  private leerSesion(): Sesion | null {
    try {
      const datos = localStorage.getItem(CLAVE_SESION);
      return datos ? (JSON.parse(datos) as Sesion) : null;
    } catch {
      return null;
    }
  }
}
