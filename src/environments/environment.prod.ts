export const environment = {
  production: true,
  firebase: {
    // @ts-ignore
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'],
    // @ts-ignore
    authDomain: process.env["NG_APP_FIREBASE_AUTH_DOMAIN"],
    // @ts-ignore
    projectId: process.env["NG_APP_FIREBASE_PROJECT_ID"],
    // @ts-ignore
    storageBucket: process.env["NG_APP_FIREBASE_STORAGE_BUCKET"],
    // @ts-ignore
    messagingSenderId: process.env["NG_APP_FIREBASE_MESSAGING_SENDER_ID"],
    // @ts-ignore
    appId: process.env["NG_APP_FIREBASE_APP_ID"]
  }
};
