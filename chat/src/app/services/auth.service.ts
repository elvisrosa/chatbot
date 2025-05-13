import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, take, tap } from 'rxjs';
import { Contact, Response } from '../models/Models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private authenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public authenticated$ = this.authenticatedSubject.asObservable();

  private _activeContactSubject = new BehaviorSubject<Contact>(new Contact());
  public activeContact$ = this._activeContactSubject.asObservable();

  constructor(private http: HttpClient) { }

  getToken(): string {
    return localStorage.getItem('tksrtath') || '';
  }

  setToken(token: string) {
    localStorage.setItem('tksrtath', token);
  }

  deleteToken() {
    localStorage.removeItem('tksrtath');
  }

  get isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }


  setActiveContact(contact: Contact): void {
    console.log('Emitiendo nuevo valor al active contact', contact.username)
    this._activeContactSubject.next(contact);
  }

  getActiveContact(): Contact {
    return this._activeContactSubject.value;
  }


  login(user: any) {
    return this.http.post<Response>('http://localhost:8080/api/auth/anon', user).pipe(
      tap(resp => {
        this.setToken(resp.data)
        this.authenticatedSubject.next(true)
      })
    )
  }

  register(user: any) {
    return this.http.post('http://localhost:8080/api/auth/register', user);
  }

  logout() {
    this.deleteToken();
    return this.http.post('http://localhost:8080/api/auth/logout', {});
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

}

