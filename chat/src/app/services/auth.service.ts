import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, concat, concatMap, Observable, of, switchMap, take, tap } from 'rxjs';
import { Contact, Response, UserLogin } from '../models/Models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private authenticatedSubject = new BehaviorSubject<Contact | null>(null);
  public authenticated$ = this.authenticatedSubject.asObservable();

  private _activeContactSubject = new BehaviorSubject<Contact | null>(null);
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

  setActiveContact(contact: Contact): void {
    if (contact) {
      console.log('Emitiendo nuevo valor al active contact', contact.username)
      this._activeContactSubject.next(contact);
    }
  }

  getActiveContact(): Contact | null {
    return this._activeContactSubject.value;
  }

  login(user: UserLogin): Observable<Contact> {
    return this.http.post<Response>('http://localhost:8080/api/auth/anon', user).pipe(
      tap(respose => {
        if (respose?.data) {
          this.setToken(respose.data)
        }
      }),
      switchMap(() => this.loadUserAuthenticated())
    )
  }

  loadUserAuthenticated(): Observable<Contact> {
    return this.http.get<Response>('http://localhost:8080/api/auth/load/me/user').pipe(
      switchMap(resp => {
        const user = resp.data as Contact;
        this.authenticateUser(user);
        return of(user);
      })
    );
  }

  updateUser(contact: Contact): void {
    this.authenticateUser(contact);
  }

  logout(): void {
    this.deleteToken();
    this.authenticatedSubject.next(null);
    this._activeContactSubject.next(null);
  }

  authenticateUser(contact: Contact): void {
    this.authenticatedSubject.next(contact);
  }

  get userAutenticated() {
    return this.authenticatedSubject.value;
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

}

