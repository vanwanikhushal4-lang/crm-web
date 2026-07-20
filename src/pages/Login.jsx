import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, ArrowRight } from 'lucide-react';
import { loginUser } from '../api/apiFunctions/Login/Login_api_function';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoClicked, setLogoClicked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Refs for cursor animations
  const cursorRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // 1. Move the glowing orb to smoothly track the cursor
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }

      // 2. Apply a 3D parallax tilt to the glass panel based on cursor screen position
      if (panelRef.current) {
        const winX = window.innerWidth / 2;
        const winY = window.innerHeight / 2;
        // Calculate rotation degrees (max 8 degrees tilt)
        const rotateX = ((e.clientY - winY) / winY) * -8;
        const rotateY = ((e.clientX - winX) / winX) * 8;

        panelRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const res = await loginUser(username, password);
      
      const token = res.data?.jwtToken || res.data?.token || res.token || res.data?.jwt;
      const userDetails = res.data?.user || res.user || res.data;
      const roleType = res.data?.roleType || userDetails?.roleType;
      const roleRaw = res.data?.role || userDetails?.role;
      
      if (token) {
        localStorage.setItem('jwtToken', token);
      }
      
      if (userDetails) {
        localStorage.setItem('userId', res.data?.userId || userDetails.id || userDetails.userId || '');
        localStorage.setItem('roleType', roleType ? String(roleType) : '');
        localStorage.setItem('role', roleRaw ? String(roleRaw) : '');

        const first = String(userDetails.firstName || userDetails.firstname || userDetails.first_name || '').trim();
        const last = String(userDetails.lastName || userDetails.lastname || userDetails.last_name || '').trim();
        const fullName = `${first} ${last}`.trim() || userDetails.name || userDetails.username || userDetails.email || username || '';
        localStorage.setItem('userName', fullName);
      }

      const normalizeRole = (v) => String(v || '').toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
      const effectiveRole = normalizeRole(roleRaw || roleType || '');
      
      const isAdmin = effectiveRole === "admin";
      const isChiefAdmin = effectiveRole === "chiefadmin";

      if (isChiefAdmin || isAdmin) {
        navigate('/admin');
      } else {
        navigate('/sales');
      }
      
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#03060c]">
      {/* Background Gradients & Effects */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#03060c] to-[#010204] opacity-90" />
      
      {/* Cursor Follower Glow */}
      <div 
        ref={cursorRef}
        className="pointer-events-none fixed top-[-300px] left-[-300px] w-[600px] h-[600px] rounded-full z-0 transition-transform duration-300 ease-out will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* 3D Glass Login Panel */}
      <div 
        ref={panelRef}
        className="relative z-10 w-full max-w-[420px] p-10 m-4 rounded-[2rem] bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] transition-transform duration-200 ease-out will-change-transform"
      >
        <div className="flex flex-col items-center mb-10">
          {/* Interactive Scatter Text Logo */}
          <div 
            onClick={() => {
              if (logoClicked) return;
              setLogoClicked(true);
              setTimeout(() => setLogoClicked(false), 2000); // Snap back after 2 seconds
            }}
            className="cursor-pointer bg-white/5 p-4 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.04)] mb-8 border border-white/10 select-none overflow-visible"
            title="Click me!"
          >
            <div className="flex font-black text-[42px] tracking-tighter" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {"BIZDRIVE".split("").map((char, index) => {
                // Hardcoded playful explosion paths for each letter
                const scatterPaths = [
                  { x: -140, y: -90, r: -65, c: '#3b82f6' }, // B (Blue)
                  { x: -60, y: -160, r: 140, c: '#ec4899' }, // I (Pink)
                  { x: 20, y: -110, r: -90, c: '#10b981' },  // Z (Green)
                  { x: 110, y: -140, r: 220, c: '#f59e0b' }, // D (Orange)
                  { x: 160, y: -70, r: -160, c: '#8b5cf6' }, // R (Purple)
                  { x: -110, y: 90, r: 100, c: '#ef4444' },  // I (Red)
                  { x: -30, y: 130, r: -240, c: '#06b6d4' }, // V (Cyan)
                  { x: 90, y: 110, r: 70, c: '#eab308' },    // E (Yellow)
                ];
                const path = scatterPaths[index];
                const isBiz = index < 3;
                
                return (
                  <span
                    key={index}
                    className="inline-block transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-125 hover:-translate-y-2"
                    style={{
                      transform: logoClicked 
                        ? `translate(${path.x}px, ${path.y}px) rotate(${path.r}deg) scale(1.6)` 
                        : 'translate(0px, 0px) rotate(0deg) scale(1)',
                      color: logoClicked ? path.c : (isBiz ? '#3b82f6' : '#ffffff'),
                      textShadow: logoClicked 
                        ? `0 0 25px ${path.c}` 
                        : (isBiz ? '0 0 15px rgba(59,130,246,0.5)' : 'none'),
                      zIndex: logoClicked ? 50 : 1,
                      transitionDelay: logoClicked ? '0ms' : `${index * 40}ms` // Stagger the snap back!
                    }}
                  >
                    {char}
                  </span>
                )
              })}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-3 font-medium">Sign in to your CRM workspace</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="group relative">
            <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300" />
            <input 
              type="text" 
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-12 py-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-300 hover:bg-slate-900/50"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="group relative">
            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-300" />
            <input 
              type="password" 
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-12 py-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-300 hover:bg-slate-900/50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="group relative w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl mt-4 transition-all duration-300 transform hover:-translate-y-1 shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.5)] overflow-hidden"
          >
            {/* Glossy shine effect on hover */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? 'Authenticating...' : 'Login'}
              {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-300" />}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
