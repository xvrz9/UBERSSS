import { Injectable } from '@angular/core';
import { Observable, delay, map, of, timer } from 'rxjs';
import { ConductorAsignado, ResumenDia, Solicitud, Tarifa, Viaje } from './models';

// Simula el backend en memoria + localStorage. Cada método devuelve un Observable
// con una pequeña demora, igual que lo haría HttpClient. Para volver a la API real
// basta con cambiar el cuerpo de cada método por la llamada HTTP correspondiente.

const CLAVES = {
  viajes: 'cliente_viajes',
  solicitudes: 'conductor_solicitudes',
  disponible: 'conductor_disponible',
  resumen: 'conductor_resumen',
};

const LUGARES = [
  'Parque Santander',
  'Terminal de Transportes',
  'Universidad Surcolombiana',
  'C.C. San Pedro Plaza',
  'Aeropuerto Benito Salas',
  'Malecón del Río Magdalena',
  'Hospital Universitario',
  'C.C. Unicentro Neiva',
];

const PASAJEROS = ['Andrea Torres', 'Julián Rojas', 'Natalia Pérez', 'Mateo Castro', 'Valentina Díaz', 'Santiago Muñoz'];

const CONDUCTOR_DEMO: ConductorAsignado = {
  nombre: 'Carlos Ramírez',
  vehiculo: 'Chevrolet Spark gris',
  placa: 'JKL 482',
  minutosLlegada: 4,
};

@Injectable({ providedIn: 'root' })
export class MockDataService {
  // ---------- Cliente ----------

  // Reemplaza POST /api/client/estimate-fare
  calcularTarifa(origen: string, destino: string): Observable<Tarifa> {
    const distanciaKm = Math.round(aleatorio(2.5, 14) * 10) / 10;
    const minutos = Math.round(distanciaKm * 2.4 + aleatorio(3, 8));
    const valor = Math.max(6500, redondear(4200 + distanciaKm * 1150 + minutos * 220));
    return conDemora({ origen, destino, distanciaKm, minutos, valor });
  }

  viajesCliente(): Observable<Viaje[]> {
    return conDemora(this.leerViajes());
  }

  // Reemplaza POST /api/client/ride-requests
  pedirViaje(tarifa: Tarifa): Observable<Viaje> {
    const viaje: Viaje = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      origen: tarifa.origen,
      destino: tarifa.destino,
      valor: tarifa.valor,
      estado: 'buscando',
    };
    this.guardar(CLAVES.viajes, [viaje, ...this.leerViajes()]);
    return conDemora(viaje);
  }

  // Simula que un conductor acepta la solicitud a los pocos segundos.
  esperarConductor(id: number): Observable<Viaje | undefined> {
    return timer(aleatorio(3500, 5500)).pipe(
      map(() => {
        const viajes = this.leerViajes().map((v) =>
          v.id === id && v.estado === 'buscando'
            ? { ...v, estado: 'asignado' as const, conductor: CONDUCTOR_DEMO }
            : v
        );
        this.guardar(CLAVES.viajes, viajes);
        return viajes.find((v) => v.id === id);
      })
    );
  }

  // ---------- Conductor ----------

  disponibilidad(): Observable<boolean> {
    return conDemora(this.leer<boolean>(CLAVES.disponible) ?? true);
  }

  // Reemplaza PUT /api/driver/availability
  cambiarDisponibilidad(disponible: boolean): Observable<boolean> {
    this.guardar(CLAVES.disponible, disponible);
    return conDemora(disponible);
  }

  // Reemplaza GET /api/driver/ride-requests. Si no quedan, llegan solicitudes nuevas.
  solicitudes(): Observable<Solicitud[]> {
    let lista = this.leer<Solicitud[]>(CLAVES.solicitudes) ?? [];
    if (lista.length === 0) {
      lista = generarSolicitudes(3);
      this.guardar(CLAVES.solicitudes, lista);
    }
    return conDemora(lista);
  }

  // Reemplaza POST /api/driver/ride-requests/{id}/accept
  aceptar(id: number): Observable<Solicitud[]> {
    return conDemora(this.actualizarSolicitudes((lista) =>
      lista.map((s) => (s.id === id ? { ...s, estado: 'en_curso' as const } : s))
    ));
  }

  rechazar(id: number): Observable<Solicitud[]> {
    return conDemora(this.actualizarSolicitudes((lista) => lista.filter((s) => s.id !== id)));
  }

  // Reemplaza POST /api/driver/trips/{id}/complete
  finalizar(id: number): Observable<ResumenDia> {
    const solicitud = (this.leer<Solicitud[]>(CLAVES.solicitudes) ?? []).find((s) => s.id === id);
    this.actualizarSolicitudes((lista) => lista.filter((s) => s.id !== id));

    const resumen = this.leerResumen();
    if (solicitud) {
      resumen.viajes += 1;
      resumen.ganancias += solicitud.valor;
      this.guardar(CLAVES.resumen, resumen);
    }
    return conDemora(resumen);
  }

  resumenHoy(): Observable<ResumenDia> {
    return conDemora(this.leerResumen());
  }

  // ---------- Almacenamiento ----------

  private leerViajes(): Viaje[] {
    const viajes = this.leer<Viaje[]>(CLAVES.viajes);
    if (viajes) return viajes;
    const iniciales = viajesIniciales();
    this.guardar(CLAVES.viajes, iniciales);
    return iniciales;
  }

  private leerResumen(): ResumenDia {
    const hoy = fechaHoy();
    const resumen = this.leer<ResumenDia>(CLAVES.resumen);
    if (resumen?.fecha === hoy) return resumen;
    // Primer ingreso del día: se arranca con un par de viajes ya hechos.
    const inicial: ResumenDia = { fecha: hoy, viajes: 2, ganancias: 27800 };
    this.guardar(CLAVES.resumen, inicial);
    return inicial;
  }

  private actualizarSolicitudes(cambio: (lista: Solicitud[]) => Solicitud[]): Solicitud[] {
    const lista = cambio(this.leer<Solicitud[]>(CLAVES.solicitudes) ?? []);
    this.guardar(CLAVES.solicitudes, lista);
    return lista;
  }

  private leer<T>(clave: string): T | null {
    try {
      const datos = localStorage.getItem(clave);
      return datos ? (JSON.parse(datos) as T) : null;
    } catch {
      return null;
    }
  }

  private guardar(clave: string, valor: unknown): void {
    localStorage.setItem(clave, JSON.stringify(valor));
  }
}

function conDemora<T>(valor: T): Observable<T> {
  return of(valor).pipe(delay(aleatorio(300, 600)));
}

function aleatorio(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function redondear(valor: number): number {
  return Math.round(valor / 100) * 100;
}

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function elegir<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

function generarSolicitudes(cantidad: number): Solicitud[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const origen = elegir(LUGARES);
    const destino = elegir(LUGARES.filter((l) => l !== origen));
    const distanciaKm = Math.round(aleatorio(2, 12) * 10) / 10;
    return {
      id: Date.now() + i,
      pasajero: elegir(PASAJEROS),
      origen,
      destino,
      distanciaKm,
      valor: Math.max(6500, redondear(4200 + distanciaKm * 1650)),
      estado: 'pendiente' as const,
    };
  });
}

function viajesIniciales(): Viaje[] {
  const haceDias = (dias: number, hora: number) => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    d.setHours(hora, 15, 0, 0);
    return d.toISOString();
  };
  return [
    { id: 3, fecha: haceDias(1, 18), origen: 'Universidad Surcolombiana', destino: 'C.C. San Pedro Plaza', valor: 9800, estado: 'completado' },
    { id: 2, fecha: haceDias(3, 7), origen: 'Parque Santander', destino: 'Aeropuerto Benito Salas', valor: 14500, estado: 'completado' },
    { id: 1, fecha: haceDias(6, 20), origen: 'Terminal de Transportes', destino: 'Hospital Universitario', valor: 11200, estado: 'cancelado' },
  ];
}
