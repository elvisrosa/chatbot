import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor() { }

  formatLastSeen(lastSeen: string): string {
    if(!lastSeen) return 'Última vez desconocida';
    const date = new Date(lastSeen);
    if (isNaN(date.getTime())) return 'Última vez desconocida';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Última vez hoy a las ${time}`;
    if (isYesterday) return `Última vez ayer a las ${time}`;

    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    const day = date.toLocaleDateString('es-ES', options);
    return `Última vez el ${day} a las ${time}`;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "send":
        return "check"
      case "delivered":
        return "done_all"
      case "read":
        return "done_all"
      case "done_all":
        return "done_all"
      case "pendig_acceptance":
        return "check"
      default:
        return "schedule"
    }
  }

}
