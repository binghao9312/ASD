const fs = require('fs');

// 1. useAuth.tsx
let useAuth = fs.readFileSync('src/hooks/useAuth.tsx', 'utf8');
useAuth = useAuth.replace(
  "name?: string;",
  "name?: string;\n  building?: string;\n  floor?: string;\n  floorRole?: string;"
);
useAuth = useAuth.replace(
  "import { doc, getDoc, setDoc } from 'firebase/firestore';",
  "import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';"
);
useAuth = useAuth.replace(
  "const userDoc = await getDoc(userDocRef);\n      if (userDoc.exists()) {\n        setUserData(userDoc.data() as UserData);\n      } else {",
  `const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {`
);
useAuth = useAuth.replace(
  "await setDoc(userDocRef, newUserData);\n        setUserData(newUserData);\n      }",
  `setDoc(userDocRef, newUserData);
        }
      });`
);
fs.writeFileSync('src/hooks/useAuth.tsx', useAuth);

// 2. Scan.tsx
let scan = fs.readFileSync('src/pages/Scan.tsx', 'utf8');
scan = scan.replace('旅客房床號', '房床號');
scan = scan.replace('min="1"', 'min="0"');
fs.writeFileSync('src/pages/Scan.tsx', scan);

console.log("Patched basic files.");
