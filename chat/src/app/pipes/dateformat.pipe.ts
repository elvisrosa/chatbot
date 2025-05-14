import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateformat'
})
export class DateformatPipe implements PipeTransform {

  transform(date: any | string | number): string {
    if (!date) return ""

    const inputDate = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (this.isSameDay(inputDate, today)) {
      return "Hoy"
    }
    else if (this.isSameDay(inputDate, yesterday)) {
      return "Ayer"
    }
    else if (this.isThisWeek(inputDate)) {
      return this.getDayName(inputDate)
    }
    else if (this.isThisYear(inputDate)) {
      return `${this.getDayName(inputDate)}, ${this.getMonthName(inputDate)} ${inputDate.getDate()}`
    }
    else {
      return `${inputDate.getDate()} de ${this.getMonthName(inputDate)} de ${inputDate.getFullYear()}`
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  private isThisWeek(date: Date): boolean {
    const today = new Date()
    const firstDayOfWeek = new Date(today)
    firstDayOfWeek.setDate(today.getDate() - today.getDay())

    const lastDayOfWeek = new Date(firstDayOfWeek)
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6)

    return date >= firstDayOfWeek && date <= lastDayOfWeek
  }

  private isThisYear(date: Date): boolean {
    return date.getFullYear() === new Date().getFullYear()
  }

  private getDayName(date: Date): string {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    return days[date.getDay()]
  }

  private getMonthName(date: Date): string {
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    return months[date.getMonth()]
  }
}
