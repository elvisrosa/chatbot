import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  constructor() { }

  toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }

  get isDarkMode(): boolean {
    const isDarkMode = localStorage.getItem('dm');
    return isDarkMode ? JSON.parse(isDarkMode) : false;
  }

  toggleTheme() {
    const isDarkMode = localStorage.getItem('dm');
    if (isDarkMode && isDarkMode === 'true') {
      localStorage.setItem('dm', JSON.stringify(false));
      document.body.classList.remove('dark-mode');
    } else {
      localStorage.setItem('dm', JSON.stringify(true));
      document.body.classList.add('dark-mode');
    }

  }



}
