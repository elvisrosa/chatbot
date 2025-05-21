import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { MenuOption } from 'src/app/models/Models';

@Component({
  selector: 'app-message-options',
  templateUrl: './message-options.component.html',
  styleUrls: ['./message-options.component.css'],
})

export class MessageOptionsComponent {

  @Input() options2: MenuOption[] = [];
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

  /**Nuevo */

  @Input() options: MenuOption[] = []
  @Input() triggerIcon = "expand_more"
  @Input() width = 180
  @Input() zIndex = 1000
  @Input() bgColor = "#ffffff"
  @Input() textColor = "#333333"
  @Input() iconColor = "#555555"
  @Input() triggerBgColor = "#ffffff"
  @Input() triggerColor = "#555555"
  @Input() boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)"

  @Output() optionSelected = new EventEmitter<any>()
  @Output() modalClosed = new EventEmitter<void>()
  @Output() modalOpened = new EventEmitter<void>()

  visible = false
  showTrigger = false


  toggleModal(event: Event) {
    event.stopPropagation()
    this.visible = !this.visible

    if (this.visible) {
      this.modalOpened.emit()
    } else {
      this.modalClosed.emit()
    }
  }

  closeModal() {
    if (this.visible) {
      this.visible = false
      this.modalClosed.emit()
    }
  }

  selectOption(option: MenuOption) {
    this.optionSelected.emit(option)
    this.closeModal()
  }

  showTriggerButton() {
    this.showTrigger = true
  }

  hideTriggerButton() {
    if (!this.visible) {
      this.showTrigger = false
    }
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    // Cerrar el modal si se hace clic fuera de él
    if (this.visible) {
      this.closeModal()
    }
  }

}
