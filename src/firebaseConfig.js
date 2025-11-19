import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDxRzachN_Vcmt0YY0JO6Q-WwcndJd1iA0",
  authDomain: "mapa-solidario-19fa6.firebaseapp.com",
  projectId: "mapa-solidario-19fa6",
  storageBucket: "mapa-solidario-19fa6.firebasestorage.app",
  messagingSenderId: "955723554900",
  appId: "1:955723554900:web:ba1f6f9f0c424c9f9d8dc1",
  measurementId: "G-BPDNNFL6YP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

