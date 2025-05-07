import { Component, Input, OnInit } from '@angular/core';
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
    const user = {
      username: this.username,
      password: this.password
    };
    this.loading = true;
    this.auth.login(user).subscribe({
      next: (response) => {
        this.auth.setToken(response.data);
        this.loading = false;
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
