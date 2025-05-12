import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private http: HttpClient, private auth: AuthService) { }

  public getMessages(receiverId: string): Observable<any> {
    const token = this.auth.getToken();
    return this.http.get(`http://localhost:8080/api/er/me/to`, { params: { 'receiverId': receiverId || '' }, headers: { 'Authorization': `Bearer ${token}` } });
  }

  markMessagesAsRead(messageIds: string[]): Observable<any> {
    const token = this.auth.getToken();
    return this.http.put(`http://localhost:8080/api/er/me/mark-as-read`, messageIds, { headers: { 'Authorization': `Bearer ${token}` } });

  }



}
