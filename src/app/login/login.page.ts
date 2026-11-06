import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonSpinner, NavController } from '@ionic/angular';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [ReactiveFormsModule, IonContent, IonInput, IonButton, IonSpinner],
})
export class LoginPage {
  private auth = inject(AuthService);
  private nav = inject(NavController);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly cargando = signal(false);
  readonly error = signal('');

  readonly cuentasDemo = [
    { rol: 'Cliente', email: 'cliente@test.com' },
    { rol: 'Conductor', email: 'conductor@test.com' },
  ];

  usarCuenta(email: string): void {
    this.form.setValue({ email, password: '123456' });
    this.error.set('');
  }

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.cargando.set(true);
    this.error.set('');

    this.auth.login(email, password).subscribe({
      next: (usuario) => {
        this.cargando.set(false);
        this.nav.navigateRoot(this.auth.rutaInicio(usuario.rol));
      },
      error: (e: Error) => {
        this.cargando.set(false);
        this.error.set(e.message);
      },
    });
  }
}
