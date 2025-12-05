
import React, { useState, useEffect } from 'react';
import { User, Pin, ViewMode, Notification } from './types';
import { generateFeedContent } from './services/geminiService';
import { PinCard } from './components/PinCard';
import { PinDetail } from './components/PinDetail';
import { CreatePinModal } from './components/CreatePinModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { 
  PlusIcon, BarChartIcon, HeartIcon, TrashIcon, RefreshIcon, 
  AlertTriangleIcon, SearchIcon, MoonIcon, SunIcon, LayoutIcon, SettingsIcon, EditIcon, VerifiedIcon, BellIcon, GlobeIcon
} from './components/Icons';

const DUMMY_USER: User = {
  id: 'u1',
  name: 'Alex Design',
  email: 'alex@vistoria.app',
  avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex&backgroundType=gradientLinear&clothing=blazerAndShirt&clothingColor=black',
  bio: 'Diseñador visual & coleccionista de momentos. Buscando inspiración en lo cotidiano.',
  website: 'alex.design',
  gender: 'no-binario',
  language: 'es',
  accountType: 'personal',
  isVerified: false
};

const DUMMY_NOTIFICATIONS_DATA = [
  { text: 'le gustó tu Visio "Atardecer Urbano".', type: 'like' as const },
  { text: 'empezó a seguirte.', type: 'follow' as const },
  { text: 'guardó tu Visio "Ideas Minimalistas".', type: 'save' as const },
  { text: 'le gustó tu Visio "Café de mañana".', type: 'like' as const },
  { text: 'empezó a seguirte.', type: 'follow' as const },
];

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [groundingData, setGroundingData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Profile Tab State
  const [profileTab, setProfileTab] = useState<'created' | 'saved'>('created');
  
  // State for Trash Management
  const [trashPinToConfirm, setTrashPinToConfirm] = useState<Pin | null>(null);
  const [pinToDelete, setPinToDelete] = useState<Pin | null>(null);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Initialize App and Theme Logic
  useEffect(() => {
    // Only load data after splash is mostly done or immediately in background
    loadMorePins();
    cleanupTrash();

    // PWA Install Prompt Listener
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Get Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.log("Geolocation error (optional):", error)
      );
    }
    
    // --- Theme Logic Start ---
    const userPreference = localStorage.getItem('vistoria-theme');
    const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark: boolean) => {
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // 1. Check preference on load
    if (userPreference) {
      // If user has manually set a preference, respect it
      applyTheme(userPreference === 'dark');
    } else {
      // Otherwise, follow system
      applyTheme(systemQuery.matches);
    }

    // 2. Listen for system changes
    const handleSystemChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if the user hasn't manually locked a preference in localStorage
      if (!localStorage.getItem('vistoria-theme')) {
        applyTheme(e.matches);
      }
    };

    systemQuery.addEventListener('change', handleSystemChange);
    
    // --- Notification Simulation ---
    const notifTimer = setInterval(() => {
        if (Math.random() > 0.6) { // 40% chance every interval
            addRandomNotification();
        }
    }, 12000); // Check every 12 seconds

    return () => {
      systemQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      clearInterval(notifTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  const addRandomNotification = () => {
    const randomData = DUMMY_NOTIFICATIONS_DATA[Math.floor(Math.random() * DUMMY_NOTIFICATIONS_DATA.length)];
    const seed = Math.random().toString(36).substring(7);
    // FIX: Enforce clothing to prevent split/naked avatars in notifications
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundType=gradientLinear&clothing=blazerAndShirt,collarAndSweater,graphicShirt,hoodie,overall,shirtCrewNeck,shirtScoopNeck,shirtVNeck`;
    
    const newNotif: Notification = {
        id: Date.now().toString(),
        type: randomData.type,
        user: `Usuario${Math.floor(Math.random() * 1000)}`,
        userAvatar: avatarUrl,
        text: randomData.text,
        time: 'Ahora mismo',
        read: false
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 9)]); // Keep last 10
    setHasUnread(true);
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setHasUnread(false);
  };

  const toggleNotifications = () => {
    if (!showNotifications && hasUnread) {
        markNotificationsRead();
    }
    setShowNotifications(!showNotifications);
  };

  // Manual Theme Toggle
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vistoria-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vistoria-theme', 'light');
    }
  };

  const cleanupTrash = () => {
    setPins(currentPins => {
      const now = new Date();
      return currentPins.filter(pin => {
        if (!pin.deletedAt) return true;
        const deletedDate = new Date(pin.deletedAt);
        const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 30;
      });
    });
  };

  const loadMorePins = async () => {
    if (loading) return;
    setLoading(true);
    // If we are in search view and have a query, load more of that query
    const query = (viewMode === 'search' && searchQuery) ? searchQuery : undefined;
    const { pins: newPins, groundingMetadata } = await generateFeedContent(12, query, userLocation);
    
    // Only set grounding data if it's a fresh search (handled in handleSearchKeyDown),
    // but here we are loading more, so we might append pins.
    // If it's a feed load, we just append.
    setPins(prev => [...prev, ...newPins as Pin[]]); 
    setLoading(false);
  };

  const handleLogin = (provider: string) => {
    setUser(DUMMY_USER);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setViewMode('home');
    setShowSettingsModal(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleUpdatePin = (updatedPin: Pin) => {
    setPins(prev => prev.map(p => p.id === updatedPin.id ? updatedPin : p));
    if (selectedPin?.id === updatedPin.id) {
      setSelectedPin(updatedPin);
    }
  };

  const handleRequestMoveToTrash = (pinId: string) => {
    const pin = pins.find(p => p.id === pinId);
    if (pin) {
      setPinToDelete(pin);
    }
  };

  const handleConfirmMoveToTrash = () => {
    if (!pinToDelete) return;
    const now = new Date().toISOString();
    setPins(prev => prev.map(p => p.id === pinToDelete.id ? { ...p, deletedAt: now } : p));
    if (selectedPin?.id === pinToDelete.id) setSelectedPin(null);
    setPinToDelete(null);
  };

  const handleRestorePin = (pinId: string) => {
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, deletedAt: undefined } : p));
    setTrashPinToConfirm(null);
  };

  const handlePermanentDelete = (pinId: string) => {
    setPins(prev => prev.filter(p => p.id !== pinId));
    setTrashPinToConfirm(null);
  };

  const handleCreatePin = (data: { title: string; description: string; imageUrl: string; tags?: string[] }) => {
    const newPin: Pin = {
      id: `user-${Date.now()}`,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      aspectRatio: 'aspect-square',
      author: {
        name: user?.name || 'Anónimo',
        avatar: user?.avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Anonymous&backgroundType=gradientLinear&clothing=blazerAndShirt',
        id: user?.id,
        isVerified: user?.isVerified
      },
      stats: { likes: 0, views: 0, saves: 0 },
      tags: data.tags || [],
      comments: []
    };
    
    setPins(prev => [newPin, ...prev]);
    setShowCreateModal(false);
    setViewMode('profile');
    setProfileTab('created');
  };

  const openCreateModal = () => {
    if (!user) setShowLoginModal(true);
    else setShowCreateModal(true);
  };

  const getDaysLeft = (dateStr?: string) => {
    if (!dateStr) return 30;
    const deletedDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Real-time filtering for local items
    if (e.target.value) setViewMode('search');
    else if (viewMode === 'search') {
      setViewMode('home');
      setGroundingData(null);
    }
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery) {
        setLoading(true);
        setViewMode('search');
        setPins([]); 
        setGroundingData(null); // Clear previous grounding data
        
        const { pins: newPins, groundingMetadata } = await generateFeedContent(12, searchQuery, userLocation);
        
        setPins(newPins as Pin[]);
        setGroundingData(groundingMetadata);
        setLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(tag === activeTag ? null : tag);
    if (selectedPin) setSelectedPin(null);
  };

  // --- Filtering Logic ---
  const activePins = pins.filter(p => !p.deletedAt);
  const trashPins = pins.filter(p => p.deletedAt);

  let displayPins = activePins;

  if (viewMode === 'trash') {
    displayPins = trashPins;
  } else if (viewMode === 'saved') {
    displayPins = activePins.filter(p => p.isSaved);
  } else if (viewMode === 'profile') {
     if (profileTab === 'created') {
       displayPins = activePins.filter(p => p.author.id === user?.id);
     } else {
       displayPins = activePins.filter(p => p.isSaved);
     }
  }

  // Apply Local Search Filtering (in addition to the AI generation on Enter)
  if (searchQuery && viewMode !== 'search') { 
    // If simply typing without hitting enter, filter local (except if we just did an AI search)
    displayPins = displayPins.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (activeTag) {
    displayPins = displayPins.filter(p => p.tags.includes(activeTag));
  }

  // Helper to extract Maps chunks
  const mapsChunks = groundingData?.groundingChunks?.filter((chunk: any) => chunk.maps);

  return (
    <div className={`min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans transition-colors duration-300`}>
      
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto px-4 h-20 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
             {/* Logo */}
             <div 
               className="flex items-center gap-2 cursor-pointer group" 
               onClick={() => { setViewMode('home'); setSearchQuery(''); setActiveTag(null); setGroundingData(null); }}
             >
                <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-white font-bold text-xl">V</span>
                </div>
                <span className="hidden md:block font-bold text-xl tracking-tight">Vistoria</span>
             </div>

             {/* Desktop Nav */}
             <div className="hidden md:flex gap-1">
               <button onClick={() => { setViewMode('home'); setGroundingData(null); }} className={`px-4 py-2 rounded-full font-medium transition-colors ${viewMode === 'home' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>Inicio</button>
               <button onClick={openCreateModal} className="px-4 py-2 rounded-full font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Crear</button>
             </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative group">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-rose-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar inspiración... (Presiona Enter para generar)" 
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-rose-500 outline-none transition-all dark:text-white"
              />
              {activeTag && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-rose-200" onClick={() => setActiveTag(null)}>
                  #{activeTag} <span className="text-xs ml-1">×</span>
                </div>
              )}
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
             
             {/* Notification Bell */}
             <div className="relative">
                <button 
                  onClick={toggleNotifications}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 relative"
                  title="Notificaciones"
                >
                  <BellIcon className="w-6 h-6" filled={showNotifications} />
                  {hasUnread && (
                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-zinc-950 rounded-full animate-pulse"></span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Actualizaciones</h3>
                          <span className="text-xs text-rose-500 font-medium cursor-pointer" onClick={() => setNotifications([])}>Limpiar</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">
                                No tienes notificaciones nuevas.
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex gap-3 transition-colors border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                                    <div className="relative">
                                        <img src={notif.userAvatar} className="w-10 h-10 rounded-full bg-zinc-200 object-cover" alt="User" />
                                        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border border-white dark:border-zinc-900 ${notif.type === 'like' ? 'bg-red-500 text-white' : notif.type === 'save' ? 'bg-zinc-800 text-white' : 'bg-blue-500 text-white'}`}>
                                            {notif.type === 'like' && <HeartIcon className="w-2 h-2" filled />}
                                            {notif.type === 'save' && <div className="w-2 h-2 bg-white rounded-sm" />}
                                            {notif.type === 'follow' && <PlusIcon className="w-2 h-2" />}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-zinc-800 dark:text-zinc-200">
                                            <span className="font-bold">{notif.user}</span> {notif.text}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1">{notif.time}</p>
                                    </div>
                                    {!notif.read && <div className="w-2 h-2 bg-rose-500 rounded-full self-center"></div>}
                                </div>
                            ))
                        )}
                      </div>
                  </div>
                )}
             </div>

             {/* Theme Toggle */}
             <button 
               onClick={toggleTheme} 
               className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
               title={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
               aria-label="Cambiar tema"
             >
               {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
             </button>

             {user ? (
               <>
                <button 
                  onClick={() => setViewMode('trash')}
                  className={`p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 relative ${viewMode === 'trash' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-zinc-500'}`}
                  title="Papelera"
                >
                  <TrashIcon className="w-6 h-6" />
                  {trashPins.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-zinc-950 rounded-full"></span>
                  )}
                </button>
                <div 
                   className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${viewMode === 'profile' ? 'border-rose-500 p-0.5' : 'border-transparent'}`} 
                   onClick={() => setViewMode('profile')}
                >
                  <img src={user.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                </div>
               </>
             ) : (
               <button onClick={() => setShowLoginModal(true)} className="px-5 py-2.5 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30">
                 Entrar
               </button>
             )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 px-4 pb-12 max-w-[1800px] mx-auto min-h-screen">
        
        {/* VIEW: PROFILE */}
        {viewMode === 'profile' && user && (
           <div className="flex flex-col items-center mb-12 animate-in slide-in-from-bottom-4 duration-500">
              <div className="relative group">
                 <img src={user.avatar} alt={user.name} className="w-32 h-32 rounded-full object-cover mb-4 shadow-xl border-4 border-white dark:border-zinc-800" />
                 {user.isVerified && (
                     <div className="absolute top-0 right-0 bg-white dark:bg-zinc-900 rounded-full p-1.5 shadow-md z-10">
                        <VerifiedIcon className="w-8 h-8 text-blue-500" />
                     </div>
                 )}
                 <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="absolute bottom-4 right-0 p-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:scale-110 transition-transform"
                    title="Editar foto"
                 >
                    <SettingsIcon className="w-4 h-4" />
                 </button>
              </div>
              <h1 className="text-3xl font-bold mb-1 dark:text-white flex items-center gap-2">
                 {user.name}
                 {user.isVerified && <VerifiedIcon className="w-6 h-6 text-blue-500" />}
              </h1>
              <div className="flex gap-2 mb-2 items-center">
                {user.gender && user.gender !== 'prefiero-no-decir' && (
                  <span className="text-xs text-zinc-400 capitalize bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                      {user.gender}
                  </span>
                )}
                {user.accountType === 'business' && (
                  <span className="text-xs text-white bg-zinc-900 dark:bg-white dark:text-black font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {user.businessCategory || 'Empresa'}
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-sm mb-2">@{user.email.split('@')[0]}</p>
              {user.website && (
                  <a href={`https://${user.website}`} target="_blank" rel="noreferrer" className="text-rose-600 font-semibold text-sm mb-3 hover:underline">
                      {user.website}
                  </a>
              )}
              <p className="text-center max-w-md text-zinc-600 dark:text-zinc-300 mb-6 px-4">
                  {user.bio || 'Sin biografía.'}
              </p>

              <div className="flex gap-3 mb-8">
                 <button onClick={() => setShowSettingsModal(true)} className="px-6 py-2 bg-zinc-200 dark:bg-zinc-800 font-semibold rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2">
                    <EditIcon className="w-4 h-4" /> Editar Perfil
                 </button>
                 <button className="px-6 py-2 bg-zinc-200 dark:bg-zinc-800 font-semibold rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                    Compartir
                 </button>
              </div>

              {/* Profile Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 w-full max-w-3xl px-4">
                 <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="block text-2xl font-bold dark:text-white">{activePins.filter(p => p.author.id === user.id).length}</span>
                    <span className="text-xs text-zinc-500 font-semibold uppercase">Creados</span>
                 </div>
                 <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="block text-2xl font-bold dark:text-white">{activePins.filter(p => p.isSaved).length}</span>
                    <span className="text-xs text-zinc-500 font-semibold uppercase">Guardados</span>
                 </div>
                 <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="block text-2xl font-bold dark:text-white">1.2k</span>
                    <span className="text-xs text-zinc-500 font-semibold uppercase">Seguidores</span>
                 </div>
                 <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                    <span className="block text-2xl font-bold dark:text-white">850</span>
                    <span className="text-xs text-zinc-500 font-semibold uppercase">Siguiendo</span>
                 </div>
              </div>

              {/* Profile Tabs */}
              <div className="flex gap-8 border-b border-zinc-200 dark:border-zinc-800 w-full max-w-4xl justify-center mb-8">
                 <button 
                   onClick={() => setProfileTab('created')}
                   className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${profileTab === 'created' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
                 >
                   Creado por ti
                 </button>
                 <button 
                   onClick={() => setProfileTab('saved')}
                   className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${profileTab === 'saved' ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500 hover:text-zinc-900'}`}
                 >
                   Guardado
                 </button>
              </div>
           </div>
        )}

        {/* VIEW: TRASH HEADER */}
        {viewMode === 'trash' && (
          <div className="mb-8 text-center bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrashIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold mb-2 text-red-900 dark:text-red-100">Papelera de Reciclaje</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Gestiona tus Visios eliminados. Se eliminarán permanentemente en <span className="font-bold">30 días</span>.
            </p>
          </div>
        )}

        {/* VIEW: HOME/SEARCH HEADER */}
        {viewMode === 'home' && !searchQuery && (
            <div className="text-center mb-10 pt-4">
                <h2 className="text-4xl font-bold mb-3 tracking-tight dark:text-white">
                  Encuentra tu próxima <span className="text-rose-500">historia visual</span>
                </h2>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['Fotografía', 'Arte Digital', 'Viajes', 'Comida', 'Minimalismo'].map(tag => (
                    <button key={tag} onClick={() => { setActiveTag(tag); setSearchQuery(tag); setViewMode('search'); }} className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
            </div>
        )}

        {/* VIEW: SEARCH RESULTS HEADER */}
        {viewMode === 'search' && searchQuery && (
             <div className="text-center mb-8">
                 <p className="text-zinc-500 dark:text-zinc-400">Resultados para:</p>
                 <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">"{searchQuery}"</h2>
                 
                 {/* Google Maps Grounding Display */}
                 {mapsChunks && mapsChunks.length > 0 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-3 animate-in slide-in-from-bottom-2">
                        {mapsChunks.map((chunk: any, i: number) => (
                           <a 
                             key={i} 
                             href={chunk.maps.uri} 
                             target="_blank" 
                             rel="noreferrer"
                             className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-900/30"
                           >
                             <GlobeIcon className="w-4 h-4" />
                             {chunk.maps.title}
                           </a>
                        ))}
                    </div>
                 )}

                 {!loading && (
                    <p className="text-xs text-zinc-400 mt-4">Contenido generado con IA {mapsChunks && mapsChunks.length > 0 && '& Google Maps'}</p>
                 )}
             </div>
        )}

        {/* Empty States */}
        {displayPins.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
             <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
               {viewMode === 'trash' ? <TrashIcon className="w-10 h-10 text-zinc-300" /> : <LayoutIcon className="w-10 h-10 text-zinc-300" />}
             </div>
             <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
               {viewMode === 'trash' ? 'La papelera está vacía' : viewMode === 'profile' ? 'Aún no hay Visios aquí' : 'No encontramos resultados'}
             </h3>
             <p className="text-zinc-500 max-w-xs">
               {viewMode === 'trash' ? 'Todo limpio.' : viewMode === 'profile' ? 'Crea tu primer Visio o guarda algo que te inspire.' : 'Intenta con otra búsqueda o presiona Enter para crear.'}
             </p>
             {viewMode === 'profile' && profileTab === 'created' && (
                 <button onClick={openCreateModal} className="mt-6 px-6 py-2 bg-rose-600 text-white rounded-full font-bold shadow-lg shadow-rose-500/30">
                     Crear primer Visio
                 </button>
             )}
          </div>
        )}

        {/* Masonry Grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4 mx-auto pb-20">
          {displayPins.map(pin => (
            <div key={pin.id} className="relative group break-inside-avoid">
               {viewMode === 'trash' ? (
                 <div 
                   onClick={() => setTrashPinToConfirm(pin)}
                   className="relative rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
                 >
                   <img 
                      src={pin.imageUrl} 
                      alt={pin.title} 
                      className={`w-full object-cover ${pin.aspectRatio} grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all`}
                    />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                       <span className="font-bold mb-2 text-center">{pin.title}</span>
                       <div className="text-xs bg-red-600 px-3 py-1 rounded-full mb-4 shadow-lg font-mono">
                         {getDaysLeft(pin.deletedAt)} días
                       </div>
                       <p className="text-xs text-center text-zinc-300">Clic para restaurar o eliminar</p>
                    </div>
                 </div>
               ) : (
                 <PinCard pin={pin} onClick={setSelectedPin} />
               )}
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-rose-500 animate-pulse">Generando ideas con IA...</p>
          </div>
        )}

        {/* Load More Trigger */}
        {!loading && (viewMode === 'home' || viewMode === 'search') && displayPins.length > 0 && (
           <div className="flex justify-center mt-8">
             <button onClick={loadMorePins} className="px-8 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-full font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors dark:text-white flex items-center gap-2">
               <RefreshIcon className="w-4 h-4" /> Cargar más
             </button>
           </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Pin Detail */}
      {selectedPin && !selectedPin.deletedAt && (
        <PinDetail 
          pin={selectedPin} 
          user={user}
          onClose={() => setSelectedPin(null)} 
          onUpdatePin={handleUpdatePin}
          onDeletePin={handleRequestMoveToTrash}
          onTagClick={handleTagClick}
          onLogin={() => setShowLoginModal(true)}
        />
      )}

      {/* Trash Confirm (Move TO Trash) */}
      {pinToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setPinToDelete(null)}>
           <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">¿Mover a la papelera?</h2>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl mb-6 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  El Visio se mantendrá en la papelera durante <span className="text-red-500 font-bold">30 días</span> antes de eliminarse permanentemente.
                </p>
              </div>
              <div className="space-y-3">
                <button onClick={handleConfirmMoveToTrash} className="w-full py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20">Sí, mover a la papelera</button>
                <button onClick={() => setPinToDelete(null)} className="w-full py-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium text-sm">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* Trash Management (IN Trash) */}
      {trashPinToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setTrashPinToConfirm(null)}>
           <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangleIcon className="w-8 h-8 text-zinc-500" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Gestión de Papelera</h2>
              <p className="text-zinc-500 mb-6 text-sm">Quedan {getDaysLeft(trashPinToConfirm.deletedAt)} días para borrar.</p>
              <div className="space-y-3">
                <button onClick={() => handleRestorePin(trashPinToConfirm.id)} className="w-full py-3 px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                   <RefreshIcon className="w-4 h-4" /> Restaurar Visio
                </button>
                <button onClick={() => handlePermanentDelete(trashPinToConfirm.id)} className="w-full py-3 px-4 border border-zinc-200 dark:border-zinc-700 text-red-600 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2">
                   <TrashIcon className="w-4 h-4" /> Eliminar Definitivamente
                </button>
                <button onClick={() => setTrashPinToConfirm(null)} className="w-full py-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 text-sm">Cerrar</button>
              </div>
           </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showSettingsModal && user && (
          <ProfileSettingsModal 
            user={user}
            onClose={() => setShowSettingsModal(false)}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            installPrompt={installPrompt}
            onInstall={handleInstallApp}
          />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePinModal onClose={() => setShowCreateModal(false)} onCreate={handleCreatePin} />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowLoginModal(false)}>
           <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-md text-center shadow-2xl animate-in zoom-in-95 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500"></div>
              <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/20">
                  <span className="text-white font-bold text-3xl">V</span>
              </div>
              <h2 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white">Únete a Vistoria</h2>
              <p className="text-zinc-500 mb-8">Donde las ideas visuales cobran vida.</p>
              
              <div className="space-y-3">
                <button onClick={() => handleLogin('google')} className="w-full py-3 px-4 border border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-semibold dark:text-white">
                   <span>G</span> Continuar con Google
                </button>
                <button onClick={() => handleLogin('facebook')} className="w-full py-3 px-4 bg-[#1877F2] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
                   Continuar con Facebook
                </button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">o con email</span></div>
                </div>
                <input type="email" placeholder="Correo electrónico" className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-rose-500 dark:text-white" />
                <button onClick={() => handleLogin('email')} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg">
                  Iniciar Sesión
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Mobile FAB */}
      <button onClick={openCreateModal} className="fixed bottom-6 right-6 md:hidden w-14 h-14 bg-rose-600 text-white rounded-full shadow-xl flex items-center justify-center z-30 hover:scale-105 active:scale-95 transition-transform shadow-rose-600/30">
        <PlusIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

export default App;
