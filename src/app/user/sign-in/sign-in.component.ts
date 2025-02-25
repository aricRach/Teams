import {Component, inject, OnInit} from '@angular/core';
import {UserService} from '../user.service';

@Component({
  selector: 'app-sign-in',
  imports: [],
  templateUrl: './sign-in.component.html',
  standalone: true,
  styleUrl: './sign-in.component.scss'
})
export class SignInComponent{

  private userService = inject(UserService);

  login() {
    this.userService.googleLogin();
  }

}
