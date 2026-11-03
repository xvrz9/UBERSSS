import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton
} from '@ionic/angular';
import { AuthService } from '../auth.service';
import { ClientService } from '../client.service';

// Angular 22 no usa Zone.js por defecto: cambiar una propiedad normal después de un
// "await" no repinta la pantalla. Por eso todo lo que se muestra en la vista es un signal:
// al hacer .set() Angular sabe que debe actualizar la plantilla.

@Component({
  selector: 'app-client-dashboard',
  templateUrl: './client-dashboard.page.html',
  styleUrls: ['./client-dashboard.page.scss'],
  standalone: true,
  imports: [FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton],
})
export class ClientDashboardPage implements OnInit, OnDestroy {
  // Lugares de ejemplo en Neiva (coordenadas aproximadas) para no escribir lat/long a mano
  lugares = [
    { nombre: 'Parque Santander', lat: 2.9273, lng: -75.2896 },
    { nombre: 'Terminal de Transportes', lat: 2.9437, lng: -75.2954 },
    { nombre: 'Universidad Surcolombiana', lat: 2.9389, lng: -75.2889 },
    { nombre: 'Centro Comercial San Pedro Plaza', lat: 2.9380, lng: -75.2800 },
    { nombre: 'Aeropuerto Benito Salas', lat: 2.9501, lng: -75.2940 },
  ];

  origen = signal(this.lugares[0]);
  destino = signal(this.lugares[1]);

  estimado = signal<any>(null);   // resultado de estimar tarifa
  activo = signal<any>(null);     // solicitud o viaje activo
  tipo = signal('');              // 'request' | 'trip'
  error = signal('');
  info = signal('');
  estimando = signal(false);      // carga del botón "Estimar tarifa"
  solicitando = signal(false);    // carga del botón "Solicitar viaje"
  cancelando = signal(false);

  private timer: any;
  private consultando = false;    // evita consultas encimadas si la API tarda más de 5 s

  constructor(private auth: AuthService, private clientApi: ClientService) {}

  // Al abrir la pantalla revisa si ya hay un viaje activo y repite cada 5 segundos
  ngOnInit() {
    this.cargarActivo();
    this.timer = setInterval(() => this.cargarActivo(), 5000);
  }

  // Detiene el temporizador al salir de la pantalla
  ngOnDestroy() {
    clearInterval(this.timer);
  }

  // Ionic reutiliza las páginas: al volver al dashboard se consulta de inmediato
  ionViewWillEnter() {
    this.cargarActivo();
  }

  // Consulta el estado actual. Endpoint: GET /api/client/active
  async cargarActivo() {
    if (this.consultando) return;
    this.consultando = true;
    try {
      const res: any = await this.clientApi.viajeActivo();
      if (res.has_active) {
        this.activo.set(res.data);
        this.tipo.set(res.type);
        this.estimado.set(null);
      } else {
        if (this.activo()) this.info.set('Tu viaje terminó o fue cancelado.');
        this.activo.set(null);
        this.tipo.set('');
      }
    } catch (e) {
      // Si falla la red se conserva el último estado conocido
    } finally {
      this.consultando = false;
    }
  }

  // Al cambiar origen o destino, la tarifa anterior ya no sirve
  cambiarRuta() {
    this.estimado.set(null);
    this.error.set('');
  }

  // Arma el cuerpo con coordenadas de origen y destino
  private coordenadas() {
    return {
      origin_latitude: this.origen().lat,
      origin_longitude: this.origen().lng,
      destination_latitude: this.destino().lat,
      destination_longitude: this.destino().lng,
    };
  }

  // Calcula la tarifa estimada. Endpoint: POST /api/client/estimate-fare
  async estimar() {
    this.error.set('');
    this.info.set('');
    if (this.origen() === this.destino()) {
      this.error.set('El origen y el destino no pueden ser iguales');
      return;
    }
    this.estimando.set(true);
    try {
      const res: any = await this.clientApi.estimarTarifa(this.coordenadas());
      this.estimado.set(res.estimate);
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.estimando.set(false);
    }
  }

  // Crea la solicitud de viaje. Endpoint: POST /api/client/ride-requests
  async solicitar() {
    if (this.solicitando()) return;
    this.error.set('');
    this.info.set('');
    this.solicitando.set(true);
    try {
      await this.clientApi.solicitarViaje({
        origin_name: this.origen().nombre,
        origin_latitude: this.origen().lat,
        origin_longitude: this.origen().lng,
        destination_name: this.destino().nombre,
        destination_latitude: this.destino().lat,
        destination_longitude: this.destino().lng,
      });
      this.consultando = false;   // forzar la consulta aunque haya una del temporizador en curso
      await this.cargarActivo();
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.solicitando.set(false);
    }
  }

  // Cancela la solicitud o viaje activo. Endpoint: POST /api/client/cancel/{id}
  async cancelar() {
    const activo = this.activo();
    if (!activo || this.cancelando()) return;
    this.error.set('');
    this.cancelando.set(true);
    try {
      await this.clientApi.cancelar(activo.id, 'Cancelado por el cliente');
      this.activo.set(null);
      this.tipo.set('');
      this.info.set('Solicitud cancelada.');
    } catch (e: any) {
      this.error.set(this.mensaje(e));
    } finally {
      this.cancelando.set(false);
    }
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout
  salir() {
    this.auth.logout();
  }

  // Texto legible para cada estado del viaje
  etiqueta(status: string): string {
    const m: any = {
      requested: 'Buscando conductor',
      assigned: 'Conductor asignado',
      driver_arrived: 'Tu conductor llegó',
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
    const errors = e?.error?.errors;
    return errors ? (Object.values(errors).flat() as string[]).join(' | ') : e?.error?.message || 'Error inesperado';
  }
}
