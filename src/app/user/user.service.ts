import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  //
  // private orgName!: string;
  // auth = getAuth();
  // provider = new GoogleAuthProvider();
  //
  // user = signal<any>(null)

  constructor() { }
  //
  // setOrgName(orgName: string) {
  //   this.orgName = orgName;
  // }
  //
  // googleLogin() {
  //   signInWithPopup(this.auth, this.provider)
  //     .then((result) => {
  //       const user = result.user;
  //       this.user.set(user);
  //       console.log("User signed in:", user);
  //     })
  //     .catch((error) => {
  //       console.error("Error during Google sign-in:", error.message);
  //     });
  // }
}
