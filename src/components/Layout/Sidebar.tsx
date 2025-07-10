import React from 'react';
import { 
  Home, 
  Users, 
  Star,
  MessageCircle,
  Megaphone, 
  Wallet, 
  FileText, 
  Package,
  BarChart3,
  Settings,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, className = "" }) => {
  const { user } = useAuth();

  const getMenuItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'founders', label: 'Founders', icon: Users },
          { id: 'talents', label: 'Talents', icon: Star },
          { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
          { id: 'payments', label: 'Payments', icon: CreditCard },
          { id: 'messages', label: 'Messages', icon: MessageCircle },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ];
      case 'founder':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
          { id: 'orders', label: 'Orders', icon: Package },
          { id: 'reviews', label: 'Reviews', icon: FileText },
          { id: 'wallet', label: 'E-Wallet', icon: Wallet },
        ];
      case 'talent':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'marketplace', label: 'Marketplace', icon: Megaphone },
          { id: 'jobs', label: 'My Jobs', icon: Package },
          { id: 'earnings', label: 'Earnings', icon: Wallet },
          { id: 'profile', label: 'Profile', icon: Settings },
          { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className={`bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 shadow-md border-r border-gray-200 ${className}`}>
      <div className="p-4 md:p-6">
        <nav className="flex flex-row md:flex-col flex-wrap md:flex-nowrap overflow-x-auto md:space-y-3 space-x-2 md:space-x-0">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex-shrink-0 md:w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm md:text-base">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;