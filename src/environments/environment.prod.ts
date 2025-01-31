export const environment = {
  production: true,
  firebase: {
    // @ts-ignore
    apiKey: import.meta.env['NG_APP_FIREBASE_API_KEY'],
    // @ts-ignore
    authDomain: import.meta.env["NG_APP_FIREBASE_AUTH_DOMAIN"],
    // @ts-ignore
    projectId: import.meta.env["NG_APP_FIREBASE_PROJECT_ID"],
    // @ts-ignore
    storageBucket: import.meta.env["NG_APP_FIREBASE_STORAGE_BUCKET"],
    // @ts-ignore
    messagingSenderId: import.meta.env["NG_APP_FIREBASE_MESSAGING_SENDER_ID"],
    // @ts-ignore
    appId: import.meta.env["NG_APP_FIREBASE_APP_ID"]
  }
};
