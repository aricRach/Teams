export const environment = {
  production: true,
  firebase: {
    // @ts-ignore
    apiKey: `${ANGULAR_FIREBASE_API_KEY}`,
    // @ts-ignore
    authDomain: `${ANGULAR_FIREBASE_AUTH_DOMAIN}`,
    // @ts-ignore
    projectId: `${ANGULAR_FIREBASE_PROJECT_ID}`,
    // @ts-ignore
    storageBucket: `${ANGULAR_FIREBASE_STORAGE_BUCKET}`,
    // @ts-ignore
    messagingSenderId: `${ANGULAR_FIREBASE_MESSAGING_SENDER_ID}`,
    // @ts-ignore
    appId: `${ANGULAR_FIREBASE_APP_ID}`,

  }
};
