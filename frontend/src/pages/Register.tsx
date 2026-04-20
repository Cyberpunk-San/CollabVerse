import React, { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import {
  Mail,
  Lock,
  Github,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
  Fingerprint,
  Cpu,
  UserPlus
} from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuthContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.username) {
      showToast('GitHub Username is required', { type: 'error' });
      return false;
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      showToast('Valid Network Identifier required', { type: 'error' });
      return false;
    }
    if (formData.password.length < 6) {
      showToast('Credential must be at least 6 characters', { type: 'error' });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('Credentials do not match', { type: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const result = await register(formData.email, formData.password, formData.username);
      if (result.success) {
        showToast('Account Created. Initiating GitHub Sync...', { type: 'success' });
        // Redirect to GitHub Verification sequence
        navigate('/verify'); 
      } else {
        showToast(result.error || 'Enrollment failed', { type: 'error' });
      }
    } catch (err) {
      showToast('System enrollment interrupted', { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-[#020617]">
      {/* Background Atmosphere - Indigo & Purple Pulses */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-md w-full relative z-10 animate-entrance">
        {/* Header Branding */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center mb-6 group">
            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-105">
               <Fingerprint size={40} className="text-indigo-500 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 rounded-xl border-4 border-slate-950">
                <ShieldCheck size={16} className="text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Operative <span className="gradient-text">Enrollment</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-3">
             New Node Registration Protocol
          </p>
        </div>

        {/* Main Enrollment Card */}
        <div className="glass-card-stat !p-10 !rounded-[3rem] border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
                <Input
                  label="Network Identifier"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="!rounded-2xl !bg-slate-950/50 !border-white/5 !py-6 !pl-14 text-white focus:!border-indigo-500/50 transition-all"
                  leftIcon={<Mail className="w-5 h-5 text-indigo-400" />}
                  required
                />

                <Input
                  label="GitHub Username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  className="!rounded-2xl !bg-slate-950/50 !border-white/5 !py-6 !pl-14 text-white focus:!border-indigo-500/50 transition-all"
                  leftIcon={<Github className="w-5 h-5 text-indigo-400" />}
                  required
                />

                <Input
                  label="Security Credential"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="!rounded-2xl !bg-slate-950/50 !border-white/5 !py-6 !pl-14 text-white focus:!border-indigo-500/50 transition-all"
                  leftIcon={<Lock className="w-5 h-5 text-indigo-400" />}
                  required
                />

                <Input
                  label="Confirm Credential"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="!rounded-2xl !bg-slate-950/50 !border-white/5 !py-6 !pl-14 text-white focus:!border-indigo-500/50 transition-all"
                  leftIcon={<ShieldCheck className="w-5 h-5 text-indigo-400" />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-500">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                  required
                />
            </div>

            <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                  className="btn-modern !rounded-2xl !py-6 !bg-indigo-600 shadow-xl shadow-indigo-500/20 active:scale-95"
                  icon={<UserPlus className="w-5 h-5 animate-pulse" />}
                >
                  Create Operative Profile
                </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">
            Already authorized?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-black transition-colors">
              Access Terminal <ArrowRight className="inline w-3 h-3 ml-1" />
            </Link>
          </p>
        </div>

        {/* System Version Footnote */}
        <div className="mt-8 flex justify-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-700">
            <span className="flex items-center gap-1"><Cpu size={10}/> V3.0 Core</span>
            <span className="flex items-center gap-1"><Zap size={10}/> Real-time Sync</span>
        </div>
      </div>
    </div>
  );
};

export default Register;