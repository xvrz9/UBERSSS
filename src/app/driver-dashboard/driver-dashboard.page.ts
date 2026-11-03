import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonToggle, IonInput
} from '@ionic/angular';
import { AuthService } from '../auth.service';
import { DriverService } from '../driver.service';

@Component({
  selector: 'app-driver-dashboard',
  templateUrl: './driver-dashboard.page.html',
  styleUrls: ['./driver-dashboard.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonToggle, IonInput],
})
export class DriverDashboardPage implements OnInit, OnDestroy {
  disponible = false;
  solicitudes: any[] = [];
  viaje: any = null;        // viaje en curso del conductor (se guarda en localStorage)
  distancia: any = 1;       // distancia real al finalizar
  duracion: any = 5;        // duración real al finalizar
  error = '';
  info = '';
  private timer: any;

  constructor(private auth: AuthService, private driverApi: DriverService) {}

  // Recupera el viaje en curso (si lo hay) y refresca la lista de solicitudes cada 5 segundos
  ngOnInit() {
    const guardado = localStorage.getItem('activeTrip');
    if (guardado) this.viaje = JSON.parse(guardado);
    this.timer = setInterval(() => this.cargarSolicitudes(), 5000);
  }

  // Detiene el temporizador al salir de la pantalla
  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // Cambia la disponibilidad al mover el toggle. Endpoint: PUT /api/driver/availability
  async onToggle(ev: any) {
    const quiere = ev.detail.checked;
    if (quiere === this.disponible) return;
    this.error = '';
    this.info = '';
    try {
      await this.driverApi.cambiarDisponibilidad(quiere ? 'available' : 'unavailable');
      this.disponible = quiere;
      if (quiere) await this.cargarSolicitudes();
      else this.solicitudes = [];
    } catch (e: any) {
      // 403: conductor aún no aprobado por el administrador
      this.disponible = false;
      this.error = this.mensaje(e);
    }
  }

  // Trae las solicitudes pendientes. Endpoint: GET /api/driver/ride-requests
  async cargarSolicitudes() {
    if (!this.disponible || this.viaje) return;
    try {
      const res: any = await this.driverApi.solicitudes();
      this.solicitudes = res.requests || [];
    } catch (e) {}
  }

  // Acepta una solicitud. Endpoint: POST /api/driver/ride-requests/{id}/accept
  // Si otro conductor la tomó primero, el backend responde 409.
  async aceptar(s: any) {
    this.error = '';
    this.info = '';
    try {
      const res: any = await this.driverApi.aceptar(s.id);
      this.viaje = { ...res.trip, origin_name: s.origin_name, destination_name: s.destination_name };
      this.distancia = s.estimated_distance_km;
      this.guardarViaje();
      this.solicitudes = [];
    } catch (e: any) {
      this.error = this.mensaje(e);
      this.cargarSolicitudes();
    }
  }

  // Registra la llegada al punto de recogida. Endpoint: POST /api/driver/trips/{id}/arrive
  async llegar() {
    await this.accionViaje(() => this.driverApi.llegar(this.viaje.id));
  }

  // Inicia el recorrido. Endpoint: POST /api/driver/trips/{id}/start
  async iniciar() {
    await this.accionViaje(() => this.driverApi.iniciar(this.viaje.id));
  }

  // Finaliza el viaje. Endpoint: POST /api/driver/trips/{id}/complete
  async finalizar() {
    this.error = '';
    try {
      const res: any = await this.driverApi.finalizar(this.viaje.id, Number(this.distancia), Number(this.duracion));
      this.info = 'Viaje finalizado. Tarifa final: $' + Number(res.trip.final_fare).toLocaleString('es-CO');
      this.viaje = null;
      localStorage.removeItem('activeTrip');
      this.disponible = true; // el backend lo deja disponible al completar
    } catch (e: any) {
      this.error = this.mensaje(e);
    }
  }

  // Ejecuta arrive/start y actualiza el estado del viaje con la respuesta
  private async accionViaje(fn: () => Promise<any>) {
    this.error = '';
    try {
      const res: any = await fn();
      this.viaje = { ...this.viaje, status: res.trip.status };
      this.guardarViaje();
    } catch (e: any) {
      this.error = this.mensaje(e);
    }
  }

  // Guarda el viaje en localStorage para no perderlo al recargar
  private guardarViaje() {
    localStorage.setItem('activeTrip', JSON.stringify(this.viaje));
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout
  salir() {
    localStorage.removeItem('activeTrip');
    this.auth.logout();
  }

  // Texto legible para cada estado del viaje
  etiqueta(status: string): string {
    const m: any = {
      assigned: 'Ve por el pasajero',
      driver_arrived: 'Esperando al pasajero',
      in_progress: 'En viaje',
    };
    return m[status] || status;
  }

  // Formatea dinero en pesos colombianos
  moneda(n: number): string {
    return '$' + Number(n).toLocaleString('es-CO');
  }

  // Convierte un error HTTP en un mensaje para mostrar
  private mensaje(e: any): string {
    if (e.status === 0) return 'No hay conexión con el servidor';
    return e?.error?.message || 'Error inesperado';
  }
}