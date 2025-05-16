import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private htt: HttpClient, private auth: AuthService) { }

  public getContacts(): Observable<any> {
    const token = this.auth.getToken();
    return this.htt.get<Response>('http://localhost:8080/api/er/me/contacts', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
}
