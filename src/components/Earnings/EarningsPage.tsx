import React, { useState } from 'react';
import { DollarSign, Search, Filter, Calendar, TrendingUp, Award, Package, CheckCircle, Clock, Star, Eye, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Talent } from '../../types';
import WithdrawModal from '../Wallet/WithdrawModal';

const EarningsPage: React.FC = () => {
  const { user } = useAuth();
  const { earnings, transactions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [showWithdraw, setShowWithdraw] = useState(false);
  
  const talent = user as Talent;

  // Filter earnings for the current talent
  const talentEarnings = earnings.filter(earning => earning.talentId === talent.id);
  const talentTransactions = transactions.filter(transaction => 
    transaction.userId === talent.id && transaction.type === 'credit'
  );

  // Apply search and filters
  const filteredEarnings = talentEarnings.filter(earning => {
    const matchesSearch = earning.campaignTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || earning.status === statusFilter;
    
    let matchesPeriod = true;
    if (periodFilter !== 'all') {
      const now = new Date();
      const earningDate = new Date(earning.earnedAt);
      switch (periodFilter) {
        case 'today':
          matchesPeriod = earningDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesPeriod = earningDate >= weekAgo;
          break;
        case 'month':
          matchesPeriod = earningDate.getMonth() === now.getMonth() && 
                         earningDate.getFullYear() === now.getFullYear();
          break;
        case 'year':
          matchesPeriod = earningDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Calculate statistics
  const totalEarnings = talentEarnings.reduce((sum, earning) => sum + earning.amount, 0);
  const paidEarnings = talentEarnings.filter(e => e.status === 'paid').reduce((sum, earning) => sum + earning.amount, 0);
  const pendingEarnings = talentEarnings.filter(e => e.status === 'pending').reduce((sum, earning) => sum + earning.amount, 0);

  const thisMonthEarnings = talentEarnings.filter(earning => {
    const earningDate = new Date(earning.earnedAt);
    const now = new Date();
    return earningDate.getMonth() === now.getMonth() && 
           earningDate.getFullYear() === now.getFullYear();
  }).reduce((sum, earning) => sum + earning.amount, 0);

  const completedJobs = talentEarnings.filter(e => e.status === 'paid').length;
  const averageEarning = completedJobs > 0 ? paidEarnings / completedJobs : 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600 text-sm">Track your earnings and payment history</p>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 rounded-2xl p-5 sm:p-8 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-medium text-green-100">Total Earnings</h2>
            <p className="text-3xl sm:text-4xl font-bold">{formatCurrency(totalEarnings)}</p>
          </div>
           <button
              className="mt-3 px-6 py-2 rounded-full shadow-md font-semibold text-white bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 transition-all duration-200 border-0 outline-none focus:ring-2 focus:ring-blue-300"
              onClick={() => setShowWithdraw(true)}
              disabled={totalEarnings < 1}
              style={{
                boxShadow: '0 4px 18px 0 rgba(32, 89, 246, 0.14)',
                minWidth: 120,
                fontSize: '1rem',
                letterSpacing: '0.04em'
              }}
            >
              Withdraw
            </button>
          <div className="p-4 bg-white bg-opacity-20 rounded-full self-start sm:self-auto">
            <DollarSign className="h-8 w-8" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white bg-opacity-10 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-300" />
            <div>
              <p className="text-xs sm:text-sm text-green-100">Paid</p>
              <p className="text-lg sm:text-xl font-bold">{formatCurrency(paidEarnings)}</p>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-lg p-4 flex items-center space-x-3">
            <Clock className="h-6 w-6 text-yellow-300" />
            <div>
              <p className="text-xs sm:text-sm text-yellow-100">Pending</p>
              <p className="text-lg sm:text-xl font-bold">{formatCurrency(pendingEarnings)}</p>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-lg p-4 flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-300" />
            <div>
              <p className="text-xs sm:text-sm text-blue-100">This Month</p>
              <p className="text-lg sm:text-xl font-bold">{formatCurrency(thisMonthEarnings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center">
          <div className="p-2 rounded-lg bg-green-500">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Completed Jobs</p>
            <p className="text-lg font-bold text-gray-900">{completedJobs}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center">
          <div className="p-2 rounded-lg bg-blue-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Average Earning</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(averageEarning)}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center">
          <div className="p-2 rounded-lg bg-purple-500">
            <Star className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Success Rate</p>
            <p className="text-lg font-bold text-gray-900">94%</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center">
          <div className="p-2 rounded-lg bg-yellow-500">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Rate Level</p>
            <p className="text-lg font-bold text-gray-900">{talent.rateLevel} Star</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search earnings by campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 border text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Earnings List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Earnings History</h3>
          <p className="text-gray-600 text-xs sm:text-sm">View all your completed jobs and earnings</p>
        </div>

{filteredEarnings.length > 0 ? (
  <div className="divide-y divide-gray-200">
    {filteredEarnings.map((earning) => (
      <div key={earning.id} className="px-4 py-4 sm:p-6 hover:bg-gray-50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-3 rounded-full border flex-shrink-0 ${
              earning.status === 'paid' ? 'bg-green-50 border-green-200' :
              earning.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              {getStatusIcon(earning.status)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{earning.campaignTitle}</h4>
              <div className="flex flex-wrap gap-2 mt-1 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Earned: {new Date(earning.earnedAt).toLocaleDateString()}
                </div>
                {earning.paidAt && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Paid: {new Date(earning.paidAt).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  Order #{earning.orderId}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right sm:text-right mt-2 sm:mt-0 flex flex-col items-end">
            <p className="text-base sm:text-lg font-bold text-green-600">
              {formatCurrency(earning.amount)}
            </p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(earning.status)}`}>
              {getStatusIcon(earning.status)}
              <span className="ml-1 capitalize">{earning.status}</span>
            </span>
          </div>
        </div>
      </div>
    ))}
    <WithdrawModal
  open={showWithdraw}
  onClose={() => setShowWithdraw(false)}
  currentTotal={totalEarnings}
  userId={talent.id}
/>
  </div>
) : (
  <div className="text-center py-12">
    <div className="text-gray-500">
      <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-medium mb-2">No earnings found</h3>
      <p className="text-sm">
        {searchTerm || statusFilter !== 'all' || periodFilter !== 'all'
          ? 'Try adjusting your search or filters' 
          : 'Your earnings will appear here when you complete jobs'
        }
      </p>
    </div>
  </div>
)}

      </div>
      
    </div>
  );
};

export default EarningsPage;
