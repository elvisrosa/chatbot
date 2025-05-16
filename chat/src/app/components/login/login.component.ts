import { HttpStatusCode } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { UserLogin } from 'src/app/models/Models';
import { AuthService } from 'src/app/services/auth.service';
import { ThemeService } from 'src/app/services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  passwordVisibility: boolean = false;
  loading: boolean = false;
  username: string = '';
  password: string = '';

  @Input() isDarkMode: boolean = false;

  constructor(private auth: AuthService) { }

  ngOnInit(): void {
  }

  togglePassword(): void {
    this.passwordVisibility = !this.passwordVisibility;
  }

  login(): void {
    const user: UserLogin = {
      username: this.username,
      password: this.password
    };
    this.loading = true;
    this.auth.login(user).subscribe({
      next: (response) => {
        console.log('Usuario logueado', response)
      },
      error: (error) => {
        console.error('Login failed', error);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });

  }

}
