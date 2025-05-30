import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuOption } from 'src/app/models/Models';

export interface MenuItem2 {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
}

export interface MenuSection {
  title?: string;
  items: MenuItem2[];
}

export interface UserProfile {
  name: string;
  role: string;
  avatar?: string;
}

@Component({
  selector: 'app-dropdownmenu',
  templateUrl: './dropdownmenu.component.html',
  styleUrls: ['./dropdownmenu.component.css'],
  standalone: true
})
export class DropdownmenuComponent implements OnChanges {


  items: MenuItem[] = [
    {
      label: 'Inicio',
      icon: 'pi pi-home',
      routerLink: ['/dashboard'],
      tooltip: 'Ir al inicio',
      tooltipPosition: 'right'
    },
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      items: [
        {
          label: 'Ver Perfil',
          icon: 'pi pi-id-card',
          routerLink: ['/perfil']
        },
        {
          label: 'Editar Perfil',
          icon: 'pi pi-pencil',
          routerLink: ['/perfil/editar'],
          badge: '¡Nuevo!',
          badgeStyleClass: 'bg-green-500'
        }
      ]
    },
    {
      label: 'Mensajes',
      icon: 'pi pi-envelope',
      routerLink: ['/mensajes'],
      badge: '5',
      badgeStyleClass: 'bg-red-500'
    },
    {
      separator: true
    },
    {
      label: 'Configuración',
      icon: 'pi pi-cog',
      items: [
        {
          label: 'Cuenta',
          icon: 'pi pi-user-edit',
          routerLink: ['/configuracion/cuenta']
        },
        {
          label: 'Notificaciones',
          icon: 'pi pi-bell',
          routerLink: ['/configuracion/notificaciones']
        }
      ]
    },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => {
        console.log('Sesión cerrada');
        // Aquí puedes llamar a un método de logout, navegación, etc.
      },
      styleClass: 'text-red-500 font-bold'
    }
  ];

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

  onItemClick(item: MenuItem2, event: Event) {
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