# V-Board — App completa (React + Firebase)

**Descripción (español):**
Aplicación tipo Pinterest pero original (no copia). Logo en forma de una **v**, tema color 🎃 (pumpkin). Funcionalidades incluidas en este paquete de ejemplo:
- Registro / Inicio de sesión (email/password y Google)
- Subir fotos (Storage) con título/descripcion
- Feed con imágenes (estilo masonry simplificado)
- Comentar en las publicaciones
- Editar perfil, cambiar avatar
- Seguir estructura modular para seguir desarrollando

---

## Instrucciones rápidas
1. Crea un proyecto en Firebase (Authentication, Firestore y Storage). Copia las credenciales y colócalas en `.env.local` (ver ejemplo abajo).
2. `npm install` o `yarn` para instalar dependencias.
3. `npm run dev` para ejecutar en modo desarrollo (asumiendo Vite/React).
4. Ajusta reglas de Firestore y Storage adecuadamente antes de producción.

---

## Variables de entorno (`.env.local`)
```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

---

## Estructura de archivos (este documento contiene archivos principales)

--- package.json ---
```json
{
  "name": "v-board",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^9.20.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

--- tailwind.config.cjs ---
```js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pumpkin: '#FF7518'
      }
    }
  },
  plugins: []
}
```

--- src/firebase.js ---
```js
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
```

--- src/main.jsx ---
```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

--- src/styles.css ---
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { @apply bg-white text-slate-800 }
/* Tema pumpkin (🎃) */
.btn-pumpkin { @apply bg-pumpkin text-white rounded-lg px-4 py-2 shadow-md }
.border-pumpkin { border-color: #FF7518 }
```

--- src/App.jsx ---
```jsx
import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { auth, googleProvider } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Feed from './components/Feed'
import AuthPage from './components/AuthPage'
import UploadPage from './components/UploadPage'
import ProfilePage from './components/ProfilePage'

export default function App() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
    })
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen">
      <nav className="p-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Logo: v */}
          <Link to="/" className="flex items-center gap-2">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#FF7518" />
              <path d="M7 8 L12 16 L17 8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="font-semibold text-lg">V-Board</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/upload" className="btn-pumpkin">Subir</Link>
          {user ? (
            <>
              <Link to="/profile" className="px-3 py-2 rounded-md border border-gray-200">Mi perfil</Link>
              <button onClick={() => signOut(auth)} className="px-3 py-2 rounded-md border border-gray-200">Salir</button>
            </>
          ) : (
            <Link to="/auth" className="px-3 py-2 rounded-md border border-gray-200">Entrar</Link>
          )}
        </div>
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Feed user={user} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/upload" element={<UploadPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} />} />
        </Routes>
      </main>
    </div>
  )
}
```

--- src/components/AuthPage.jsx ---
```jsx
import React, { useState } from 'react'
import { auth, googleProvider } from '../firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      navigate('/')
    } catch (err) { alert(err.message) }
  }

  async function handleGoogle() {
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/')
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
        <input required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" type="password" className="w-full p-2 border rounded" />
        <button className="btn-pumpkin w-full">{isRegister ? 'Registrar' : 'Entrar'}</button>
      </form>
      <button onClick={handleGoogle} className="w-full mt-3 p-2 border rounded">Entrar con Google</button>
      <p className="mt-3 text-sm">
        <button onClick={() => setIsRegister(v => !v)} className="underline">{isRegister ? '¿Ya tienes cuenta? Entrar' : '¿No tienes cuenta? Crear una'}</button>
      </p>
    </div>
  )
}
```

--- src/components/UploadPage.jsx ---
```jsx
import React, { useState } from 'react'
import { storage, db } from '../firebase'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

export default function UploadPage({ user }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const navigate = useNavigate()

  if (!user) return <p>Debes iniciar sesión para subir fotos.</p>

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return alert('Selecciona una imagen')
    const id = uuidv4()
    const storageRef = ref(storage, `images/${user.uid}/${id}-${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)
    uploadTask.on('state_changed', null, (err) => alert(err.message), async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref)
      await addDoc(collection(db, 'posts'), {
        uid: user.uid,
        author: user.displayName || user.email,
        avatar: user.photoURL || null,
        title,
        description: desc,
        imageUrl: url,
        createdAt: serverTimestamp()
      })
      navigate('/')
    })
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Subir imagen</h2>
      <form onSubmit={handleUpload} className="space-y-3">
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        <input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded" />
        <textarea placeholder="Descripción" value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 border rounded" />
        <button className="btn-pumpkin">Publicar</button>
      </form>
    </div>
  )
}
```

--- src/components/Feed.jsx ---
```jsx
import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import PostCard from './PostCard'

export default function Feed() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Inicio</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  )
}
```

--- src/components/PostCard.jsx ---
```jsx
import React, { useState } from 'react'
import Comments from './Comments'

export default function PostCard({ post }) {
  const [showComments, setShowComments] = useState(false)
  return (
    <div className="border rounded overflow-hidden shadow-sm">
      <img src={post.imageUrl} alt={post.title} className="w-full h-56 object-cover" />
      <div className="p-3">
        <h3 className="font-semibold">{post.title}</h3>
        <p className="text-sm text-gray-600">{post.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {post.avatar ? <img src={post.avatar} className="w-8 h-8 rounded-full" alt="avatar" /> : <div className="w-8 h-8 rounded-full bg-gray-200" />}
            <span className="text-sm">{post.author}</span>
          </div>
          <button onClick={() => setShowComments(s => !s)} className="text-sm">Comentarios</button>
        </div>
        {showComments && <Comments postId={post.id} />}
      </div>
    </div>
  )
}
```

--- src/components/Comments.jsx ---
```jsx
import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth } from '../firebase'

export default function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('postId', '==', postId), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => unsub()
  }, [postId])

  async function handleComment(e) {
    e.preventDefault()
    if (!auth.currentUser) return alert('Debes iniciar sesión para comentar')
    if (!text.trim()) return
    await addDoc(collection(db, 'comments'), {
      postId,
      text,
      uid: auth.currentUser.uid,
      author: auth.currentUser.displayName || auth.currentUser.email,
      createdAt: serverTimestamp()
    })
    setText('')
  }

  return (
    <div className="mt-3">
      <div className="space-y-2 max-h-48 overflow-auto">
        {comments.map(c => (
          <div key={c.id} className="text-sm border-b py-1">
            <strong>{c.author}</strong> <span className="text-gray-600">{c.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleComment} className="mt-2 flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 p-2 border rounded" />
        <button className="btn-pumpkin">Enviar</button>
      </form>
    </div>
  )
}
```

--- src/components/ProfilePage.jsx ---
```jsx
import React, { useState, useEffect } from 'react'
import { auth, storage, db } from '../firebase'
import { updateProfile } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'

export default function ProfilePage({ user }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [posts, setPosts] = useState([])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'posts'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => unsub()
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    let photoURL = user.photoURL
    if (avatarFile) {
      const storageRef = ref(storage, `avatars/${user.uid}/${avatarFile.name}`)
      const task = uploadBytesResumable(storageRef, avatarFile)
      await new Promise((res, rej) => task.on('state_changed', null, rej, res))
      photoURL = await getDownloadURL(task.snapshot.ref)
    }
    await updateProfile(user, { displayName, photoURL })
    alert('Perfil actualizado')
  }

  if (!user) return <p>Inicia sesión para ver tu perfil.</p>

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Mi perfil</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex items-center gap-3">
          <img src={user.photoURL || '/default-avatar.png'} className="w-16 h-16 rounded-full" alt="avatar" />
          <div>
            <input placeholder="Nombre visible" value={displayName} onChange={e=>setDisplayName(e.target.value)} className="p-2 border rounded" />
            <input type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files[0])} className="mt-2" />
          </div>
        </div>
        <button className="btn-pumpkin">Guardar</button>
      </form>

      <section className="mt-6">
        <h3 className="font-semibold">Mis publicaciones</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {posts.map(p => (
            <div key={p.id} className="border rounded overflow-hidden">
              <img src={p.imageUrl} alt={p.title} className="w-full h-40 object-cover" />
              <div className="p-2"><strong>{p.title}</strong></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

--- Notas de seguridad y producción ---
- Cambia las reglas de Firestore y Storage para limitar escritura/lectura según usuarios.
- Valida tamaño y tipo de archivos en el cliente y, si es posible, en Cloud Functions.
- Evita exponer claves en clientes públicos; usa reglas de seguridad de Firebase.

--- Prompt recomendado para generar el logo (IA / diseñador) ---
```
Diseña un logo minimalista en forma de letra "v" para una app llamada "V-Board". Debe ser simple, reconocible como ícono app, y versátil (funcione como favicon y en avatar). Paleta principal: color pumpkin (#FF7518) y blanco. Estilo: plano (flat), líneas limpias, sin gradientes complejos. Entregar en SVG y PNG. Variantes: círculo con la "v" blanca sobre fondo pumpkin; solo la "v" en pumpkin sobre fondo transparente.
```

--- Otras sugerencias / mejoras futuras ---
- Añadir paginación/infinite scroll en el feed
- Implementar likes y guardados (colecciones)
- Mejorar diseño del masonry (usar librería como react-masonry-css)
- Subir imágenes a múltiples resoluciones y servir versiones optimizadas
- Moderación de contenido: reportes y filtros

--- Fin del paquete ---

¡Abre este archivo en el editor del canvas para copiar/pegar los archivos en tu proyecto!
