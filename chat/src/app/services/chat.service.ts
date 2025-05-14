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
    return this.http.get(`http://localhost:8080/api/er/me/to`, { params: { 'receiverId': receiverId } });
  }

  markMessagesAsRead(messageIds: string[]): Observable<any> {
    return this.http.put(`http://localhost:8080/api/er/me/mark-as-read`, messageIds);

  }



}
