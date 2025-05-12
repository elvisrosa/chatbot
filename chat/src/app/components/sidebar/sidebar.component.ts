import { HttpResponse } from '@angular/common/http';
import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';
import { WsService } from 'src/app/services/ws.service';

@Component({
  selector: "app-sidebar",
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})

export class SidebarComponent implements OnInit {

  @Input() contacts: any[] = []
  @Input() autenticated: boolean = false
  @Output() contactSelected = new EventEmitter<number>()
  activeContact: any = {}
  contacts2: any[] = [];
  searchTerm = ""

  constructor(private userService: UserService, private auth: AuthService, private ws: WsService) { }

  ngOnInit(): void {
    this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
    });
    this.getContact();
  }

  getContact() {
    this.userService.getContacts().subscribe({
      next: (response) => {
        this.contacts2 = response;
      },
      error: (error: any) => { },
      complete: () => { }
    })
  }


  getActiveContac(): void {
    this.auth.activeContact$.subscribe(contact => this.activeContact = contact);
  }


  get filteredContacts() {
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase()
      return this.contacts2.filter(
        (contact) => contact.name.toLowerCase().includes(term) || contact.username.toLowerCase().includes(term),
      )
    }
    return this.contacts2;
  }

  selectContact(contact: number) {
    this.auth.setActiveContact(contact);
    this.ws.resetValueTyping();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "sent":
        return "check"
      case "delivered":
        return "done_all"
      case "read":
        return "done_all"
      default:
        return "schedule"
    }
  }

}
