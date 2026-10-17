import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Shield, 
  Coins, 
  Sparkles, 
  RefreshCw, 
  Mail, 
  CheckCircle, 
  Plus, 
  Dices, 
  ArrowLeftRight, 
  PlusCircle,
  Image as ImageIcon,
  UserCheck,
  UserX
} from 'lucide-react';

export default function App() {
  // Estados de Usuario y Autenticación
  const [currentUser, setCurrentUser] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  
  // Datos de la App (Base de Datos)
  const [users, setUsers] = useState([]);
  const [cards, setCards] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Formularios y Ruleta
  const [activeTab, setActiveTab] = useState('shop'); // 'shop', 'creator', 'wheel', 'trades', 'admin'
  const [spinning, setSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);

  // Formulario Creador de Cartas
  const [newCard, setNewCard] = useState({
    title: '',
    type: 'Pokémon',
    effect: '',
    price: 100,
    stock: 5,
    imageUrl: ''
  });

  // Formulario Nuevo Intercambio Pokémon X/Y
  const [newTrade, setNewTrade] = useState({
    offeredPokemon: '',
    level: 50,
    requestedItem: ''
  });

  // Cargar datos al iniciar y escuchar cambios en tiempo real
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);

    const { data: userData } = await supabase.from('users').select('*');
    if (userData) setUsers(userData);

    const { data: cardData } = await supabase.from('cards').select('*');
    if (cardData) setCards(cardData);

    const { data: tradeData } = await supabase.from('trades').select('*');
    if (tradeData) setTrades(tradeData);

    setLoading(false);
  }

  // Registro o Inicio de Sesión por Correo
  async function handleLoginOrRegister(e) {
    e.preventDefault();
    if (!emailInput) return;

    const formattedEmail = emailInput.trim().toLowerCase();

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', formattedEmail)
      .single();

    if (existingUser) {
      setCurrentUser(existingUser);
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          email: formattedEmail,
          name: nameInput.trim() || formattedEmail.split('@')[0],
          role: 'player',
          status: 'pending',
          coins: 100
        }])
        .select()
        .single();

      if (!error && newUser) {
        setCurrentUser(newUser);
      }
    }
  }

  // Aprobar Acceso de Usuario (Solo Admin)
  async function approveUser(userId) {
    await supabase
      .from('users')
      .update({ status: 'approved' })
      .eq('id', userId);
    fetchData();
  }

  // Modificar Saldo de Monedas de un Jugador
  async function updateUserCoins(userId, amount) {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const newBalance = Math.max(0, target.coins + amount);
    await supabase
      .from('users')
      .update({ coins: newBalance })
      .eq('id', userId);

    if (currentUser?.id === userId) {
      setCurrentUser({ ...currentUser, coins: newBalance });
    }
    fetchData();
  }

  // Crear una Nueva Carta Personalizada (Admin)
  async function handleCreateCard(e) {
    e.preventDefault();
    if (!newCard.title || newCard.price <= 0) return;

    await supabase.from('cards').insert([{
      title: newCard.title,
      type: newCard.type,
      effect: newCard.effect,
      price: Number(newCard.price),
      stock: Number(newCard.stock),
      image_url: newCard.imageUrl || 'https://via.placeholder.com/150'
    }]);

    setNewCard({ title: '', type: 'Pokémon', effect: '', price: 100, stock: 5, imageUrl: '' });
    setActiveTab('shop');
    fetchData();
  }

  // Publicar una Oferta de Intercambio Pokémon X/Y
  async function handleCreateTrade(e) {
    e.preventDefault();
    if (!newTrade.offeredPokemon) return;

    await supabase.from('trades').insert([{
      user_email: currentUser.email,
      offered_pokemon: newTrade.offeredPokemon,
      level: Number(newTrade.level),
      requested_item: newTrade.requestedItem,
      status: 'open'
    }]);

    setNewTrade({ offeredPokemon: '', level: 50, requestedItem: '' });
    fetchData();
  }

  // Girar la Ruleta
  function spinWheel() {
    if (currentUser.coins < 20 || spinning) return;

    setSpinning(true);
    setWheelResult(null);

    // Descontar 20 monedas
    updateUserCoins(currentUser.id, -20);

    setTimeout(() => {
      const prizes = [
        { name: '50 Monedas', coins: 50 },
        { name: 'Carta Común', coins: 0 },
        { name: '100 Monedas (¡Super Premio!)', coins: 100 },
        { name: 'Sin Premio', coins: 0 },
        { name: '20 Monedas (Reembolso)', coins: 20 },
      ];
      const win = prizes[Math.floor(Math.random() * prizes.length)];
      
      if (win.coins > 0) {
        updateUserCoins(currentUser.id, win.coins);
      }

      setWheelResult(win.name);
      setSpinning(false);
    }, 2500);
  }

  // Pantalla de Carga
  if (loading && !users.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin w-10 h-10 text-yellow-400 mb-3" />
        <p className="font-bold tracking-wider text-slate-300">Cargando datos de Kalos Locke...</p>
      </div>
    );
  }

  // Pantalla de Inicio / Registro por Correo
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-yellow-400 tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8" /> KALOS LOCKE HUB
            </h1>
            <p className="text-slate-400 text-sm mt-1">Ingresa tu correo para unirte al torneo</p>
          </div>

          <form onSubmit={handleLoginOrRegister} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase">Correo Electrónico</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase">Nombre o Apodo</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ej. Entrenador Red"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg transition text-sm uppercase tracking-wider"
            >
              Ingresar al Torneo
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Pantalla de Espera (Aprobación Pendiente)
  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-yellow-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <Mail className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold">Acceso Pendiente</h2>
          <p className="text-slate-400 text-sm mt-2">
            El correo <span className="text-yellow-300 font-mono">{currentUser.email}</span> ha sido registrado.
          </p>
          <p className="text-slate-400 text-xs mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
            El administrador debe aprobar tu usuario para que puedas usar la tienda y realizar intercambios.
          </p>
          <button 
            onClick={() => setCurrentUser(null)} 
            className="mt-6 text-xs text-slate-500 underline hover:text-white"
          >
            Cerrar e intentar con otra cuenta
          </button>
        </div>
      </div>
    );
  }

  // Aplicación Principal (Usuario Aprobado)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra Superior Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-black text-2xl text-yellow-400 tracking-wider">KALOS LOCKE</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
            currentUser.role === 'admin' ? 'bg-purple-950 text-purple-300 border-purple-800' : 'bg-blue-950 text-blue-300 border-blue-800'
          }`}>
            Rol: {currentUser.role}
          </span>
        </div>

        {/* Navegación Pestanas */}
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'shop' ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            Tienda
          </button>
          <button
            onClick={() => setActiveTab('wheel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'wheel' ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            Ruleta Kalos
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'trades' ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            Intercambios X/Y
          </button>
          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('creator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'creator' ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                + Crear Carta
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                Panel Admin
              </button>
            </>
          )}
        </nav>

        {/* Contador de Monedas y Perfil */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 border border-yellow-500/40 px-4 py-1.5 rounded-full">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-yellow-400 text-sm">{currentUser.coins} Pts</span>
          </div>

          <button
            onClick={() => setCurrentUser(null)}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido Según la Pestaña Activa */}
      <main className="p-6 max-w-7xl mx-auto w-full flex-1">
        
        {/* PESTAÑA: TIENDA DE CARTAS */}
        {activeTab === 'shop' && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-slate-200">Tienda de Cartas y Objetos</h2>
            {cards.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay cartas disponibles en este momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map(card => (
                  <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-yellow-500/50 transition">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-yellow-400 bg-yellow-950/50 px-2.5 py-1 rounded border border-yellow-800">
                          {card.type}
                        </span>
                        <span className="text-xs text-slate-400">Stock: {card.stock}</span>
                      </div>
                      <h3 className="font-bold text-xl text-white mt-1">{card.title}</h3>
                      <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{card.effect}</p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                      <span className="font-bold text-lg text-yellow-400">{card.price} Pts</span>
                      <button 
                        disabled={currentUser.coins < card.price || card.stock <= 0}
                        className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition"
                      >
                        Comprar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA: CREADOR DE CARTAS (ADMIN) */}
        {activeTab === 'creator' && currentUser.role === 'admin' && (
          <section className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" /> Creador de Cartas
            </h2>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Título de la Carta</label>
                <input
                  type="text"
                  required
                  value={newCard.title}
                  onChange={e => setNewCard({ ...newCard, title: e.target.value })}
                  placeholder="Ej. Pokeball Especial, Mega-Evolución"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Tipo</label>
                  <select
                    value={newCard.type}
                    onChange={e => setNewCard({ ...newCard, type: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400"
                  >
                    <option value="Pokémon">Pokémon</option>
                    <option value="Objeto">Objeto</option>
                    <option value="Estado">Estado</option>
                    <option value="Batalla">Batalla</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Precio (Monedas)</label>
                  <input
                    type="number"
                    required
                    value={newCard.price}
                    onChange={e => setNewCard({ ...newCard, price: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-semibold">Efecto / Descripción</label>
                <textarea
                  value={newCard.effect}
                  onChange={e => setNewCard({ ...newCard, effect: e.target.value })}
                  placeholder="Escribe lo que hace esta carta en el Locke..."
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400 h-24"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg transition uppercase text-sm"
              >
                Guardar y Publicar en la Tienda
              </button>
            </form>
          </section>
        )}

        {/* PESTAÑA: RULETA DE LA SUERTE */}
        {activeTab === 'wheel' && (
          <section className="max-w-md mx-auto text-center bg-slate-900 border border-slate-800 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2 flex items-center justify-center gap-2">
              <Dices className="w-6 h-6" /> Ruleta Kalos
            </h2>
            <p className="text-xs text-slate-400 mb-6">Costo por giro: <span className="text-yellow-400 font-bold">20 Monedas</span></p>

            <div className={`w-48 h-48 mx-auto mb-6 rounded-full border-8 border-yellow-500 flex items-center justify-center bg-slate-950 transition-transform duration-1000 ${spinning ? 'animate-spin' : ''}`}>
              <Sparkles className="w-16 h-16 text-yellow-400" />
            </div>

            {wheelResult && (
              <div className="bg-slate-950 border border-yellow-500/50 p-4 rounded-xl mb-6">
                <p className="text-xs text-slate-400">¡Resultado!</p>
                <p className="text-lg font-bold text-yellow-400 mt-1">{wheelResult}</p>
              </div>
            )}

            <button
              onClick={spinWheel}
              disabled={spinning || currentUser.coins < 20}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold py-3 rounded-lg transition uppercase text-sm"
            >
              {spinning ? 'Girando...' : 'Girar Ruleta'}
            </button>
          </section>
        )}

        {/* PESTAÑA: INTERCAMBIOS POKÉMON X/Y */}
        {activeTab === 'trades' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulario para publicar oferta */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h3 className="font-bold text-lg mb-4 text-yellow-400 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" /> Ofrecer Pokémon
              </h3>
              <form onSubmit={handleCreateTrade} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Pokémon Ofrecido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Greninja, Lucario"
                    value={newTrade.offeredPokemon}
                    onChange={e => setNewTrade({ ...newTrade, offeredPokemon: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">Nivel</label>
                  <input
                    type="number"
                    value={newTrade.level}
                    onChange={e => setNewTrade({ ...newTrade, level: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-semibold">¿Qué pides a cambio?</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carta Revivir o 100 Pts"
                    value={newTrade.requestedItem}
                    onChange={e => setNewTrade({ ...newTrade, requestedItem: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-3 rounded-lg transition text-xs uppercase"
                >
                  Publicar Oferta
                </button>
              </form>
            </div>

            {/* Lista de Intercambios */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h3 className="font-bold text-lg mb-4 text-slate-200">Mercado de Intercambios Activos</h3>
              {trades.length === 0 ? (
                <p className="text-slate-500 text-xs py-8 text-center">No hay intercambios publicados aún.</p>
              ) : (
                <div className="space-y-3">
                  {trades.map(trade => (
                    <div key={trade.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500">{trade.user_email}</span>
                        <p className="font-bold text-yellow-400 text-base">{trade.offered_pokemon} <span className="text-xs text-slate-400">(Nv. {trade.level})</span></p>
                        <p className="text-xs text-slate-300 mt-1">Busca: <span className="text-slate-100 font-semibold">{trade.requested_item}</span></p>
                      </div>
                      <button className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-lg font-bold transition">
                        Aceptar Intercambio
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* PESTAÑA: PANEL DE ADMINISTRADOR */}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6" /> Control de Permisos y Monedas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(u => (
                <div key={u.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-white">{u.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.status === 'approved' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                        {u.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {u.coins} Pts
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {u.status === 'pending' && (
                      <button
                        onClick={() => approveUser(u.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Aprobar
                      </button>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateUserCoins(u.id, 50)}
                        className="bg-yellow-600 hover:bg-yellow-500 text-xs px-2 py-1 rounded font-bold"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => updateUserCoins(u.id, -50)}
                        className="bg-slate-800 hover:bg-slate-700 text-xs px-2 py-1 rounded font-bold"
                      >
                        -50
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
