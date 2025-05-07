import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private _authenticated = new BehaviorSubject<boolean>(false);
  private _user = new BehaviorSubject<any>(null);

  public readonly authenticated$ = this._authenticated.asObservable();
  public readonly user$ = this._user.asObservable();

  constructor(private http: HttpClient) {
    if (this.getToken()) {
      this._authenticated.next(true);
    }
  }

  getToken(): string {
    return localStorage.getItem('tksrtath') || '';
  }

  setToken(token: string) {
    localStorage.setItem('tksrtath', token);
    this._authenticated.next(true);
  }

  deleteToken() {
    localStorage.removeItem('tksrtath');
  }

  get isAuthenticated(): boolean {
    return this._authenticated.value;
  }

  login(user: any) {
    return this.http.post<Response>('http://localhost:8080/api/auth/anon', user);
  }

  register(user: any) {
    return this.http.post('http://localhost:8080/api/auth/register', user);
  }

  logout() {
    this.deleteToken();
    return this.http.post('http://localhost:8080/api/auth/logout', {});
  }

}


export class Response {
  statusCode: number = 0;
  message: string = '';
  data: any;
}
