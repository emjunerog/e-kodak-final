import React from 'react';
import { Camera, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={32} className="text-amber-500" />
        </div>
        
        <h1 className="font-heading text-2xl text-primary mb-3">Account Pending Approval</h1>
        
        <p className="font-body text-neutral-500 text-sm mb-6 leading-relaxed">
          Hello {profile?.first_name}! Your photographer account has been created successfully, but it requires approval from an administrator before you can access the Photographer Portal.
        </p>
        
        <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 mb-8">
          <p className="text-xs text-neutral-600 font-medium">
            Please check back later or contact the studio administration for updates.
          </p>
        </div>

        <button 
          onClick={handleLogout}
          className="btn-outline w-full flex items-center justify-center gap-2 py-2.5"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
