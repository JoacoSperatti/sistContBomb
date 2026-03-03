import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {

  apiKey: "AIzaSyDIpbXajZacZNkORsxXEexzCWQd5aYMiIw",
  authDomain: "bomberos-ab92d.firebaseapp.com",
  projectId: "bomberos-ab92d",
  storageBucket: "bomberos-ab92d.firebasestorage.app",
  messagingSenderId: "853211296244",
  appId: "1:853211296244:web:b054c7f71600b5af87c9a1"

};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);