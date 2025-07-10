import React, { useState } from 'react';
import { Wallet, Plus, Search, Filter, TrendingUp, TrendingDown, Calendar, DollarSign, CreditCard, ArrowUpRight, ArrowDownLeft, Receipt, Package, Star, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Founder, Transaction } from '../../types';
import TopUpModal from './TopUpModal';
import { createTransaction } from '../../lib/api';

const EWalletPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { transactions, refreshData } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const founder = user as Founder;

  // Filter transactions for the current founder (use user_id if that's the DB key)
  const founderTransactions = transactions.filter(transaction => transaction.user_id === founder.id || transaction.userId === founder.id);

  // Apply search and type filters
  const filteredTransactions = founderTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getTransactionIcon = (type: string, description: string) => {
    if (type === 'credit') {
      if (description.toLowerCase().includes('top up') || description.toLowerCase().includes('deposit')) {
        return <ArrowDownLeft className="h-5 w-5 text-green-600" />;
      }
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    } else {
      if (description.toLowerCase().includes('campaign') || description.toLowerCase().includes('payout')) {
        return <Package className="h-5 w-5 text-blue-600" />;
      }
      return <ArrowUpRight className="h-5 w-5 text-red-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionBg = (type: string) => {
    return type === 'credit' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  const handleTopUpSuccess = async (amount, relatedJobId) => {
    if (loading) return;
    setLoading(true);

    try {
      console.log("bl;abla" + relatedJobId);
      const newTransaction = {
        user_id: founder.id, // match your DB!
        type: 'credit',
        amount: amount,
        description: `Wallet Top Up - Credit Card`,
      };

      console.log("lalu sini");

      await createTransaction(newTransaction);
      await refreshData();
console.log("laulalu");
      // Optionally update local founder's wallet balance for instant feedback
      const updatedFounder = {
        ...founder,
        walletBalance: founder.walletBalance + amount,
      };
      updateProfile?.(updatedFounder);

      setShowTopUpModal(false);
    } catch (error) {
      alert('Top-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalCredits = founderTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = founderTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonthTransactions = founderTransactions.filter(t => {
    const transactionDate = new Date(t.createdAt || t.created_at);
    const now = new Date();
    return transactionDate.getMonth() === now.getMonth() &&
           transactionDate.getFullYear() === now.getFullYear();
  });

  const thisMonthSpending = thisMonthTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">E-Wallet</h1>
          <p className="text-sm md:text-base text-gray-600">Manage your wallet balance and view transaction history</p>
        </div>
        <button
          onClick={() => setShowTopUpModal(true)}
          className="flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors"
          disabled={loading}
        >
          <Plus className="h-4 w-4 md:h-5 md:w-5" />
          <span>{loading ? 'Processing...' : 'Top Up'}</span>
        </button>
      </div>

      {/* Wallet Overview */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-xl md:rounded-2xl p-4 md:p-8 text-white">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h2 className="text-base md:text-lg font-medium text-blue-100">Current Balance</h2>
            <p className="text-2xl md:text-4xl font-bold">{formatCurrency(founder.walletBalance)}</p>
          </div>
          <div className="p-3 md:p-4 bg-white bg-opacity-20 rounded-full">
            <Wallet className="h-6 w-6 md:h-8 md:w-8" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-3 md:p-4">
            <div className="flex items-center space-x-2 md:space-x-3">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-300" />
              <div>
                <p className="text-xs md:text-sm text-green-100">Total Credits</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(totalCredits)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-lg p-3 md:p-4">
            <div className="flex items-center space-x-2 md:space-x-3">
              <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-300" />
              <div>
                <p className="text-xs md:text-sm text-blue-100">Total Spent</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(totalDebits)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-10 rounded-lg p-3 md:p-4">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-yellow-300" />
              <div>
                <p className="text-xs md:text-sm text-blue-100">This Month</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(thisMonthSpending)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-green-500">
              <ArrowDownLeft className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Credits</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderTransactions.filter(t => t.type === 'credit').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-red-500">
              <ArrowUpRight className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Debits</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderTransactions.filter(t => t.type === 'debit').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-blue-500">
              <Receipt className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderTransactions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6">
          <div className="flex items-center">
            <div className="p-2 md:p-3 rounded-lg bg-purple-500">
              <Star className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-xs md:text-sm font-medium text-gray-600">Avg Transaction</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {founderTransactions.length > 0 
                  ? formatCurrency((totalCredits + totalDebits) / founderTransactions.length)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Transactions</option>
            <option value="credit">Credits Only</option>
            <option value="debit">Debits Only</option>
          </select>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Transaction History</h3>
          <p className="text-gray-600 text-xs md:text-sm">View all your wallet activities and transactions</p>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="divide-y divide-gray-200 overflow-x-auto">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className={`p-2 md:p-3 rounded-full border ${getTransactionBg(transaction.type)}`}>
                      {getTransactionIcon(transaction.type, transaction.description)}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base font-medium text-gray-900">{transaction.description}</h4>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
                        <div className="flex items-center text-xs md:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          {new Date(transaction.createdAt || transaction.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-xs md:text-sm text-gray-500">
                          <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          {new Date(transaction.createdAt || transaction.created_at).toLocaleTimeString()}
                        </div>
                        {transaction.relatedJobId && (
                          <div className="flex items-center text-xs md:text-sm text-gray-500">
                            <Package className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Order #{transaction.relatedJobId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right sm:ml-4">
                    <p className={`text-base md:text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'credit' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12">
            <div className="text-gray-500">
              <Receipt className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-gray-300" />
              <h3 className="text-base md:text-lg font-medium mb-1 md:mb-2">No transactions found</h3>
              <p className="text-xs md:text-sm">
                {searchTerm || typeFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Your transaction history will appear here'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <TopUpModal
          onClose={() => setShowTopUpModal(false)}
          onSuccess={handleTopUpSuccess}
          currentBalance={founder.walletBalance}
          loading={loading}
        />
      )}
    </div>
  );
};

export default EWalletPage;
