import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const LOGO_URL = "https://cdn.prod.website-files.com/66c1ff66234911f96b0e0367/66d5ccad639d4c3a5079e64e_ALKNZ_Main%20logo.svg";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, token } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (token && user) {
      if (user.must_reset_password) {
        navigate('/set-password');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/fm');
      }
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    
    const result = await login(email, password);
    
    setIsLoading(false);
    
    if (result.success) {
      toast.success('Welcome back!');
      // Check if user needs to reset password
      if (result.user.must_reset_password) {
        navigate('/set-password');
      } else if (result.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/fm');
      }
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #02040A 0%, #0A0A1F 40%, #002D72 100%)'
      }}
    >
      {/* Gradient orbs for depth */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#002D72] rounded-full blur-[150px] opacity-40" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#0047AB] rounded-full blur-[150px] opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#002D72] rounded-full blur-[200px] opacity-20" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Floating Logo */}
        <motion.div
          className="flex justify-center mb-12"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <img 
            src={LOGO_URL} 
            alt="ALKNZ Ventures" 
            className="h-16 w-auto drop-shadow-[0_0_30px_rgba(0,71,171,0.5)]"
            data-testid="login-logo"
          />
        </motion.div>
        
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="backdrop-blur-xl border border-[#1A2744] rounded-xl p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.85) 0%, rgba(2, 4, 10, 0.9) 100%)'
          }}
        >
          <div className="text-center mb-8">
            <h1 className="font-bold text-2xl text-white mb-2" style={{ textShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
              Welcome Back
            </h1>
            <p className="text-[#94A3B8] text-sm">
              Sign in to access ALKNZ Fund Management CRM
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#02040A]/60 border border-[#1A2744] rounded-lg py-3 pl-11 pr-4 text-white placeholder:text-[#475569] focus:border-[#0047AB] focus:ring-1 focus:ring-[#0047AB] focus:outline-none transition-colors"
                  placeholder="you@example.com"
                  data-testid="login-email-input"
                  autoComplete="email"
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#02040A]/60 border border-[#1A2744] rounded-lg py-3 pl-11 pr-11 text-white placeholder:text-[#475569] focus:border-[#0047AB] focus:ring-1 focus:ring-[#0047AB] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  data-testid="login-password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)',
                boxShadow: '0 0 25px rgba(0, 71, 171, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 71, 171, 0.7)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 71, 171, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#1A2744] text-center">
            <p className="text-[#94A3B8] text-sm">
              Private portal. Contact admin for access.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
