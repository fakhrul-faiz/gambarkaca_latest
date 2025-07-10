import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Founder, Talent } from '../types';
import { signIn, signUp, signOut, getCurrentUser, updateProfile as updateUserProfile } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  updateProfile?: (userData: User) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user on app load
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.error('Login error:masuk');
      setLoading(true);
      const { profile } = await signIn(email, password);
      setUser(profile);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

const register = async (userData: any): Promise<boolean> => {
  try {
    setLoading(true);
    await signUp(userData.email, userData.password, {
      name: userData.name,
      role: userData.role,
      company: userData.company,
      bio: userData.bio,
    });

    // For talents, they need admin approval, so don't auto-login
    if (userData.role === 'talent') {
      return true;
    }

    // For founders and admins, auto-login after registration
    const { profile } = await signIn(userData.email, userData.password);
    setUser(profile);
    return true;
  } catch (error: any) {
    if (
      error?.message?.toLowerCase().includes('user already registered') ||
      error?.status === 422
    ) {
      alert(
        "This email is already registered. Please log in or use the 'Forgot Password' option."
      );
    } else {
      alert("Registration failed. Please try again later.");
    }
    console.error('Registration error:', error);
    return false;
  } finally {
    setLoading(false);
  }
};


  const updateProfile = async (userData: User) => {
    try {
      const updates: any = {
        name: userData.name,
        email: userData.email,
      };

      if (userData.role === 'founder') {
        const founder = userData as Founder;
        updates.company = founder.company;
        updates.phone = founder.phone;
        updates.address = founder.address;
        updates.wallet_balance = founder.walletBalance;
      }

      if (userData.role === 'talent') {
        const talent = userData as Talent;
        updates.bio = talent.bio;
        updates.portfolio = talent.portfolio;
        updates.rate_level = talent.rateLevel;
        updates.skills = talent.skills;
        updates.social_media = talent.socialMedia;
        updates.total_earnings = talent.totalEarnings;
      }

      const updatedProfile = await updateUserProfile(userData.id, updates);
      setUser(updatedProfile);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};