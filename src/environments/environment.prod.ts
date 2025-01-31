export const environment = {
  production: true,
  firebase: {
    apiKey: (window as any)['env']?.NG_APP_FIREBASE_API_KEY || '',
    authDomain: (window as any)['env']?.NG_APP_FIREBASE_AUTH_DOMAIN || '',
    projectId: (window as any)['env']?.NG_APP_FIREBASE_PROJECT_ID || '',
    storageBucket: (window as any)['env']?.NG_APP_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: (window as any)['env']?.NG_APP_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: (window as any)['env']?.NG_APP_FIREBASE_APP_ID || ''
  }
};
