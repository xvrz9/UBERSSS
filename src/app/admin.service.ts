import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  // Trae las métricas generales. Endpoint: GET /api/admin/dashboard
  dashboard(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_URL}/admin/dashboard`));
  }

  // Lista conductores pendientes de aprobación. Endpoint: GET /api/admin/drivers?approval_status=pending
  conductoresPendientes(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_URL}/admin/drivers?approval_status=pending`));
  }

  // Aprueba o rechaza un conductor. Endpoint: PATCH /api/admin/drivers/{id}/approval
  cambiarAprobacion(id: number, approval_status: string, admin_notes: string): Promise<any> {
    return firstValueFrom(
      this.http.patch(`${API_URL}/admin/drivers/${id}/approval`, { approval_status, admin_notes })
    );
  }
}