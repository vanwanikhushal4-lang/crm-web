import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock } from 'lucide-react';
import { loginUser } from '../api/apiFunctions/Login/Login_api_function';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const res = await loginUser(username, password);
      console.log('Login Response:', res);
      
      const token = res.data?.jwtToken || res.data?.token || res.token || res.data?.jwt;
      const userDetails = res.data?.user || res.user || res.data;
      const roleType = res.data?.roleType || userDetails?.roleType;
      const roleRaw = res.data?.role || userDetails?.role;
      
      if (token) {
        localStorage.setItem('jwtToken', token);
      }
      
      // Save other important details
      if (userDetails) {
        localStorage.setItem('userId', res.data?.userId || userDetails.id || userDetails.userId || '');
        localStorage.setItem('roleType', roleType ? String(roleType) : '');
        localStorage.setItem('role', roleRaw ? String(roleRaw) : '');
      }

      // Check role exactly as mobile app
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
      console.error('Login Failed', err);
      setErrorMsg(err?.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="glass-panel animate-fade" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }}>
        <div className="flex-col items-center mb-6">
          <div className="flex items-center justify-center mb-4" style={{ 
            width: '64px', height: '64px', borderRadius: '16px', 
            background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' 
          }}>
            <LogIn size={32} />
          </div>
          <h2 className="title-gradient" style={{ fontSize: '28px', textAlign: 'center' }}>Velox CRM</h2>
          <p className="text-muted" style={{ textAlign: 'center', marginTop: '8px' }}>Sign in to continue</p>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div>
            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Username or Email</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '40px' }}
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94a3b8' }} />
              <input 
                type="password" 
                className="input-field" 
                style={{ paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn mt-4" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
