export type Rol = 'cliente' | 'conductor';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export type EstadoViaje = 'buscando' | 'asignado' | 'completado' | 'cancelado';

export interface ConductorAsignado {
  nombre: string;
  vehiculo: string;
  placa: string;
  minutosLlegada: number;
}

export interface Viaje {
  id: number;
  fecha: string;
  origen: string;
  destino: string;
  valor: number;
  estado: EstadoViaje;
  conductor?: ConductorAsignado;
}

export interface Tarifa {
  origen: string;
  destino: string;
  distanciaKm: number;
  minutos: number;
  valor: number;
}

export type EstadoSolicitud = 'pendiente' | 'en_curso';

export interface Solicitud {
  id: number;
  pasajero: string;
  origen: string;
  destino: string;
  distanciaKm: number;
  valor: number;
  estado: EstadoSolicitud;
}

export interface ResumenDia {
  fecha: string;
  viajes: number;
  ganancias: number;
}
