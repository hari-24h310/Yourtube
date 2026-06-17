import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCFYKNz9Dw_OSTIC7s046F0GX7oyKIFJus",
  authDomain: "yourtube-hari.firebaseapp.com",
  projectId: "yourtube-hari",
  storageBucket: "yourtube-hari.firebasestorage.app",
  messagingSenderId: "200032865433",
  appId: "1:200032865433:web:f1bba431b5536626103c08",
  measurementId: "G-GC3S120EVC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
