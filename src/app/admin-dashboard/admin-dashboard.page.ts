import { Component, OnInit } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonCard, IonCardContent
} from '@ionic/angular';
import { AuthService } from '../auth.service';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonCard, IonCardContent],
})
export class AdminDashboardPage implements OnInit {
  metricas: { nombre: string; valor: string }[] = [];
  pendientes: any[] = [];
  error = '';
  info = '';

  constructor(private auth: AuthService, private adminApi: AdminService) {}

  // Al abrir la pantalla carga métricas y conductores pendientes
  ngOnInit() {
    this.cargarMetricas();
    this.cargarPendientes();
  }

  // Trae los KPIs y los arma como tarjetas. Endpoint: GET /api/admin/dashboard
  async cargarMetricas() {
    try {
      const res: any = await this.adminApi.dashboard();
      const s = res.stats;
      this.metricas = [
        { nombre: 'Clientes', valor: String(s.total_clients) },
        { nombre: 'Conductores', valor: String(s.total_drivers) },
        { nombre: 'Pendientes de aprobar', valor: String(s.pending_drivers) },
        { nombre: 'Conductores aprobados', valor: String(s.approved_drivers) },
        { nombre: 'Viajes activos', valor: String(s.active_trips) },
        { nombre: 'Viajes completados', valor: String(s.completed_trips) },
        { nombre: 'Viajes cancelados', valor: String(s.cancelled_trips) },
        { nombre: 'Ingresos totales', valor: '$' + Number(s.total_revenue).toLocaleString('es-CO') },
      ];
    } catch (e: any) {
      this.error = this.mensaje(e);
    }
  }

  // Lista los conductores en espera. Endpoint: GET /api/admin/drivers?approval_status=pending
  async cargarPendientes() {
    try {
      const res: any = await this.adminApi.conductoresPendientes();
      this.pendientes = res.drivers || [];
    } catch (e: any) {
      this.error = this.mensaje(e);
    }
  }

  // Aprueba o rechaza un conductor. Endpoint: PATCH /api/admin/drivers/{id}/approval
  async decidir(driver: any, estado: string) {
    this.error = '';
    this.info = '';
    try {
      await this.adminApi.cambiarAprobacion(
        driver.id,
        estado,
        estado === 'approved' ? 'Documentación verificada.' : 'Rechazado por el administrador.'
      );
      this.info = estado === 'approved' ? 'Conductor aprobado.' : 'Conductor rechazado.';
      await this.cargarPendientes();
      await this.cargarMetricas();
    } catch (e: any) {
      this.error = this.mensaje(e);
    }
  }

  // Cierra sesión. Endpoint: POST /api/auth/logout
  salir() {
    this.auth.logout();
  }

  // Convierte un error HTTP en un mensaje para mostrar
  private mensaje(e: any): string {
    if (e.status === 0) return 'No hay conexión con el servidor';
    if (e.status === 403) return 'Esta cuenta no es administrador';
    return e?.error?.message || 'Error inesperado';
  }
}