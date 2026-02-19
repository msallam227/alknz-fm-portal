import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const LOGO_URL = "https://cdn.prod.website-files.com/66c1ff66234911f96b0e0367/66d5ccad639d4c3a5079e64e_ALKNZ_Main%20logo.svg";

const SetNewPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, token, updateUser, API_URL } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in or doesn't need reset
  React.useEffect(() => {
    if (!token || !user) {
      navigate('/login');
    } else if (!user.must_reset_password) {
      // Already reset, redirect based on role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/fm');
      }
    }
  }, [token, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/change-password`,
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update user in context
      updateUser(response.data.user);
      
      toast.success('Password set successfully!');
      
      // Redirect based on role
      if (response.data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/fm');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to change password';
      toast.error(message);
    } finally {
      setIsLoading(false);
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
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-12"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <img 
            src={LOGO_URL} 
            alt="ALKNZ Ventures" 
            className="h-16 w-auto drop-shadow-[0_0_30px_rgba(0,71,171,0.5)]"
          />
        </motion.div>
        
        {/* Card */}
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
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-[#0047AB]/20">
                <KeyRound className="h-8 w-8 text-[#00A3FF]" />
              </div>
            </div>
            <h1 className="font-bold text-2xl text-white mb-2">
              Set New Password
            </h1>
            <p className="text-[#94A3B8] text-sm">
              Please create a new password for your account
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#02040A]/60 border border-[#1A2744] rounded-lg py-3 pl-11 pr-11 text-white placeholder:text-[#475569] focus:border-[#0047AB] focus:ring-1 focus:ring-[#0047AB] focus:outline-none transition-colors"
                  placeholder="Minimum 8 characters"
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#02040A]/60 border border-[#1A2744] rounded-lg py-3 pl-11 pr-11 text-white placeholder:text-[#475569] focus:border-[#0047AB] focus:ring-1 focus:ring-[#0047AB] focus:outline-none transition-colors"
                  placeholder="Re-enter your password"
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
              data-testid="set-password-button"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Setting Password...
                </div>
              ) : (
                'Set Password & Continue'
              )}
            </button>
          </form>
          
          {/* Info */}
          <div className="mt-6 p-4 rounded-lg bg-[#0047AB]/10 border border-[#0047AB]/20">
            <p className="text-[#94A3B8] text-xs text-center">
              Your password must be at least 8 characters long. 
              We recommend using a mix of letters, numbers, and symbols.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SetNewPassword;
