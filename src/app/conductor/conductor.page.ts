import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import {
  IonButton, IonContent, IonHeader, IonSpinner, IonToggle, IonToolbar, NavController,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { MockDataService } from '../core/mock-data.service';
import { ResumenDia, Solicitud } from '../core/models';

@Component({
  selector: 'app-conductor',
  templateUrl: './conductor.page.html',
  styleUrls: ['./conductor.page.scss'],
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe,
    IonHeader, IonToolbar, IonContent, IonButton, IonToggle, IonSpinner,
  ],
})
export class ConductorPage implements OnInit {
  private auth = inject(AuthService);
  private datos = inject(MockDataService);
  private nav = inject(NavController);

  readonly nombre = computed(() => this.auth.usuario()?.nombre.split(' ')[0] ?? '');
  readonly hoy = new Date();

  readonly cargando = signal(true);
  readonly disponible = signal(false);
  readonly resumen = signal<ResumenDia>({ fecha: '', viajes: 0, ganancias: 0 });
  readonly solicitudes = signal<Solicitud[]>([]);
  readonly buscandoSolicitudes = signal(false);
  // Id de la solicitud que se está procesando, para bloquear sus botones.
  readonly procesando = signal<number | null>(null);

  readonly enCurso = computed(() => this.solicitudes().find((s) => s.estado === 'en_curso') ?? null);
  readonly pendientes = computed(() => this.solicitudes().filter((s) => s.estado === 'pendiente'));

  ngOnInit(): void {
    forkJoin({
      disponible: this.datos.disponibilidad(),
      resumen: this.datos.resumenHoy(),
      solicitudes: this.datos.solicitudes(),
    }).subscribe(({ disponible, resumen, solicitudes }) => {
      this.disponible.set(disponible);
      this.resumen.set(resumen);
      this.solicitudes.set(solicitudes);
      this.cargando.set(false);
    });
  }

  cambiarDisponibilidad(disponible: boolean): void {
    this.disponible.set(disponible);
    this.datos.cambiarDisponibilidad(disponible).subscribe(() => {
      if (disponible && this.pendientes().length === 0) this.buscarSolicitudes();
    });
  }

  buscarSolicitudes(): void {
    this.buscandoSolicitudes.set(true);
    this.datos.solicitudes().subscribe((lista) => {
      this.solicitudes.set(lista);
      this.buscandoSolicitudes.set(false);
    });
  }

  aceptar(id: number): void {
    this.procesando.set(id);
    this.datos.aceptar(id).subscribe((lista) => this.terminarAccion(lista));
  }

  rechazar(id: number): void {
    this.procesando.set(id);
    this.datos.rechazar(id).subscribe((lista) => this.terminarAccion(lista));
  }

  finalizar(id: number): void {
    this.procesando.set(id);
    this.datos.finalizar(id).subscribe((resumen) => {
      this.resumen.set(resumen);
      this.solicitudes.update((lista) => lista.filter((s) => s.id !== id));
      this.procesando.set(null);
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.nav.navigateRoot('/login');
  }

  private terminarAccion(lista: Solicitud[]): void {
    this.solicitudes.set(lista);
    this.procesando.set(null);
  }
}
