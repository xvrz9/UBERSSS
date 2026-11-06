import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonContent, IonHeader, IonInput, IonProgressBar, IonSpinner, IonToolbar, NavController,
} from '@ionic/angular';
import { AuthService } from '../core/auth.service';
import { MockDataService } from '../core/mock-data.service';
import { EstadoViaje, Tarifa, Viaje } from '../core/models';

const ETIQUETAS: Record<EstadoViaje, string> = {
  buscando: 'Buscando conductor',
  asignado: 'Conductor asignado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.page.html',
  styleUrls: ['./cliente.page.scss'],
  imports: [
    FormsModule, CurrencyPipe, DatePipe, DecimalPipe,
    IonHeader, IonToolbar, IonContent, IonInput, IonButton, IonSpinner, IonProgressBar,
  ],
})
export class ClientePage implements OnInit {
  private auth = inject(AuthService);
  private datos = inject(MockDataService);
  private nav = inject(NavController);
  private destroyRef = inject(DestroyRef);

  readonly nombre = computed(() => this.auth.usuario()?.nombre.split(' ')[0] ?? '');
  readonly hoy = new Date();
  readonly etiquetas = ETIQUETAS;

  readonly origen = signal('');
  readonly destino = signal('');
  readonly errorRuta = signal('');
  readonly tarifa = signal<Tarifa | null>(null);
  readonly calculando = signal(false);
  readonly pidiendo = signal(false);

  readonly viajes = signal<Viaje[]>([]);
  readonly cargandoViajes = signal(true);

  // El viaje más reciente se muestra aparte mientras está buscando o asignado.
  readonly activo = computed(() => {
    const ultimo = this.viajes()[0];
    return ultimo && (ultimo.estado === 'buscando' || ultimo.estado === 'asignado') ? ultimo : null;
  });
  readonly recientes = computed(() => this.viajes().filter((v) => v !== this.activo()));
  readonly buscando = computed(() => this.activo()?.estado === 'buscando');

  ngOnInit(): void {
    this.datos.viajesCliente().subscribe((viajes) => {
      this.viajes.set(viajes);
      this.cargandoViajes.set(false);
      // Si se recargó la página mientras buscaba conductor, se retoma la espera.
      const pendiente = this.activo();
      if (pendiente?.estado === 'buscando') this.esperarConductor(pendiente.id);
    });
  }

  cambioRuta(): void {
    this.tarifa.set(null);
    this.errorRuta.set('');
  }

  calcularTarifa(): void {
    const origen = this.origen().trim();
    const destino = this.destino().trim();

    if (!origen || !destino) {
      this.errorRuta.set('Ingresa el origen y el destino.');
      return;
    }
    if (origen.toLowerCase() === destino.toLowerCase()) {
      this.errorRuta.set('El origen y el destino deben ser diferentes.');
      return;
    }

    this.calculando.set(true);
    this.datos.calcularTarifa(origen, destino).subscribe((tarifa) => {
      this.tarifa.set(tarifa);
      this.calculando.set(false);
    });
  }

  pedirViaje(): void {
    const tarifa = this.tarifa();
    if (!tarifa || this.buscando()) return;

    this.pidiendo.set(true);
    this.datos.pedirViaje(tarifa).subscribe((viaje) => {
      this.viajes.update((lista) => [viaje, ...lista]);
      this.pidiendo.set(false);
      this.tarifa.set(null);
      this.origen.set('');
      this.destino.set('');
      this.esperarConductor(viaje.id);
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.nav.navigateRoot('/login');
  }

  private esperarConductor(id: number): void {
    this.datos
      .esperarConductor(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((actualizado) => {
        if (!actualizado) return;
        this.viajes.update((lista) => lista.map((v) => (v.id === id ? actualizado : v)));
      });
  }
}
