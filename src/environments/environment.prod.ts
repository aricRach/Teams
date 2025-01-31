export const environment = {
  production: true,
  firebase: {
    // @ts-ignore
    apiKey: window["env"]["NG_FIREBASE_API_KEY"],
    // @ts-ignore
    authDomain: window["env"]["NG_FIREBASE_AUTH_DOMAIN"],
    // @ts-ignore
    projectId: window["env"]["NG_FIREBASE_PROJECT_ID"],
    // @ts-ignore
    storageBucket: window["env"]["NG_FIREBASE_STORAGE_BUCKET"],
    // @ts-ignore
    messagingSenderId: window["env"]["NG_FIREBASE_MESSAGING_SENDER_ID"],
    // @ts-ignore
    appId: window["env"]["NG_FIREBASE_APP_ID"]
  }
};
