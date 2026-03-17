'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  isImpersonating: boolean;
  startImpersonation: (userId: string) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('mdm_impersonated_user_id');
  });

  useEffect(() => {
    if (impersonatedUserId) {
      localStorage.setItem('mdm_impersonated_user_id', impersonatedUserId);
      document.body.classList.add('impersonation-mode');
    } else {
      localStorage.removeItem('mdm_impersonated_user_id');
      document.body.classList.remove('impersonation-mode');
    }
  }, [impersonatedUserId]);

  const startImpersonation = (userId: string) => {
    setImpersonatedUserId(userId);
    toast.success('Simulation Started', {
      description: 'You are now viewing the app as this user.',
    });
  };

  const stopImpersonation = () => {
    setImpersonatedUserId(null);
    toast.info('Simulation Ended', {
      description: 'Returned to your admin account.',
    });
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId,
        isImpersonating: !!impersonatedUserId,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
