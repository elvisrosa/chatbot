import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-pending',
  templateUrl: './chat-pending.component.html',
  styleUrls: ['./chat-pending.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatPendingComponent {

}
