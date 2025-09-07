// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA9_cCFYwLyIcWfkoq8t6hZZAlloKpzj5I",
  authDomain: "trading-app-aa262.firebaseapp.com",
  projectId: "trading-app-aa262",
  storageBucket: "trading-app-aa262.firebasestorage.app",
  messagingSenderId: "378385965869",
  appId: "1:378385965869:web:a919ecb57a10db70e7e9a4",
  measurementId: "G-K5W93N786W"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
