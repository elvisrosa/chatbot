import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MenuOption } from 'src/app/models/Models';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export interface UserProfile {
  name: string;
  role: string;
  avatar?: string;
}

@Component({
  selector: 'app-dropdownmenu',
  templateUrl: './dropdownmenu.component.html',
  styleUrls: ['./dropdownmenu.component.css']
})
export class DropdownmenuComponent implements OnChanges {

  @Input() isOpen = false; // Este input ahora es más informativo que funcional para el *ngIf
  @Input() sections: MenuSection[] = [];
  @Input() userProfile?: UserProfile;
  @Input() width? = '200px'; // Puedes ajustar el valor por defecto
  @Input() maxHeight? = '300px'; // Puedes ajustar el valor por defecto
  @Input() title? = 'PRIMEAPP';
  @Input() logo?: string;



  // ✅ ESTA ES LA CLAVE: Recibe la posición calculada
  @Input() position?: { x: number; y: number } = { x: 0, y: 0 };
  @Output() itemClick = new EventEmitter<MenuItem>();
  @Output() closeMenu = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) { }
  ngOnChanges(changes: SimpleChanges): void {
    console.log('Changes detected:', this.isOpen);
  }

  onItemClick(item: MenuItem, event: Event) {
    event.stopPropagation();
    this.itemClick.emit(item);
    if (item.action) {
      item.action();
    }
    this.close();
  }

  close() {
    this.closeMenu.emit();
  }

  // @HostListener('keydown.escape')
  // @HostListener('document:click', ['$event'])
  // clickOutside(event: Event) {
  //   if (!this.elementRef.nativeElement.contains(event.target)) {
  //     this.close();
  //   }
  // }

  // ✅ Previene que clicks dentro del dropdown lo cierren
  onDropdownClick(event: Event) {
    event.stopPropagation();
  }
}