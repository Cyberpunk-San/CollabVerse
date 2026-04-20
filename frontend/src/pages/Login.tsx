import React, { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import {
  Mail,
  Lock,
  LogIn,
  Github,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu,
  CheckCircle
} from 'lucide-react';

export const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuthContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      showToast('Valid Network Identifier required', { type: 'error' });
      return false;
    }
    if (!formData.password) {
      showToast('Security Credential required', { type: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        showToast('Access Granted. Syncing terminal...', { type: 'success' });
        // Correctly routes to the Dashboard component
        navigate('/dashboard'); 
      } else {
        showToast(result.error || 'Authentication Failed', { type: 'error' });
      }
    } catch (err) {
      showToast('System Link Interrupted', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="max-w-md w-full relative z-10 animate-entrance">
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl">
               <Cpu size={48} className="text-indigo-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 rounded-2xl border-4 border-slate-950">
                <ShieldCheck size={20} className="text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Collab<span className="gradient-text">Verse</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-3">Secure Node Access</p>
        </div>

        <div className="glass-card-stat !p-10 !rounded-[3rem] border-white/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
                <Input
                  label="Network Identifier"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@collabverse.com"
                  className="!rounded-2xl !bg-slate-950/50 !border-white/5 !py-7 !pl-14 text-white focus:!border-indigo-500/50"
                  leftIcon={<Mail className="w-5 h-5 text-indigo-500" />}
                  required
                />

                <Input
                  label="Security Credential"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="!rounded-2xl !bg-slate-950/50 !border-white/5 !py-7 !pl-14 text-white focus:!border-indigo-500/50"
                  leftIcon={<Lock className="w-5 h-5 text-indigo-500" />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-white">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  }
                  required
                />
            </div>

            <div className="flex items-center justify-between">
              <label className="group flex items-center gap-3 cursor-pointer">
                <div className="relative">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
                    <div className="w-5 h-5 bg-slate-900 border border-white/10 rounded-lg peer-checked:bg-indigo-600 transition-all" />
                    <CheckCircle className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300">Persistent Session</span>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isSubmitting}
              className="btn-modern !rounded-2xl !py-6 !bg-indigo-600 shadow-xl shadow-indigo-500/20"
              icon={<Zap className="w-5 h-5 animate-pulse" />}
            >
              Initiate Link
            </Button>
          </form>
          
          <p className="mt-10 text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">
            New operative? <Link to="/register" className="text-indigo-400 font-black">Initialize Profile</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;