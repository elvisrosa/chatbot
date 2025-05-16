import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Action } from 'rxjs/internal/scheduler/Action';
import { MenuOption } from 'src/app/models/Models';

@Component({
  selector: 'app-message-options',
  templateUrl: './message-options.component.html',
  styles: [`
  .dropdown-menu1 {
    position: absolute;
    right: 0;
    z-index: 1000;
    display: none;
    min-width: 220px;
    background-color: var(--color-primary) !important;

  }
  .dropdown-menu1.show {
    display: block;
  }

  .dropdown-content {
    position: relative;
    border-radius: 8px;
    box-shadow: 0 4px 20px var(--color-primary);
    overflow: hidden;
    animation: fadeIn 0.2s ease;
    z-index: 1001;
    border: none;
    color: var(--color-text);
  }

  :host-context(.dark-mode) .dropdown-content {
    background-color: #2a2a2a;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .dropdown-item {
    padding: 12px 16px;
    font-size: 14px;
    color: var(--color-text);
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .dropdown-divider {
    height: 1px;
    background-color: #444;
    margin: 4px 0;
  }
  .dropdown-item:hover {
    background-color: var(--color-bg);
  }

  :host-context(.dark-mode) .dropdown-item {
    color: #f5f5f5;
  }

  :host-context(.dark-mode) .dropdown-item:hover {
    background-color: #3a3a3a;
  }

  :host-context(.dark-mode) .dropdown-divider {
    background-color: #444;
  }
`]
})

export class MessageOptionsComponent {

  @Input() options: MenuOption[] = [];
  @Input() showMenu = false;
  @Output() optionClicked = new EventEmitter<string>();
  @Output() backdropClicked = new EventEmitter<void>();

  optionClick(option: string): void {
    if(!option) return;
    this.optionClicked.emit(option);
  }

  onBackdropClick(): void {
    this.backdropClicked.emit();
  }

}
