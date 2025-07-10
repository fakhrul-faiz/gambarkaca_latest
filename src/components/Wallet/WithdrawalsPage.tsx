import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getWithdrawals } from '../../lib/api';
import { DollarSign, Clock, CheckCircle, X, Wallet } from 'lucide-react';
import WithdrawModal from './WithdrawModal';
import { Talent } from '../../types';

interface Withdrawal {
  id: string;
  amount: number;
  admin_fee: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: string;
  requested_at: string;
}

const statusColor: Record<string, string> = {
  pending: "text-yellow-600",
  approved: "text-blue-600",
  paid: "text-green-600",
  rejected: "text-red-600",
};

const statusIcon: Record<string, JSX.Element> = {
  pending: <Clock className="h-5 w-5" />,
  approved: <DollarSign className="h-5 w-5" />,
  paid: <CheckCircle className="h-5 w-5" />,
  rejected: <X className="h-5 w-5" />,
};

const WithdrawalsPage: React.FC = () => {
  const { user } = useAuth();
  const talent = user as Talent;
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getWithdrawals(user.id).then(setWithdrawals).finally(() => setLoading(false));
    }
  }, [user]);

  // Filter by date range
  const filteredWithdrawals = withdrawals.filter(w => {
    const date = new Date(w.requested_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && date < start) return false;
    if (end) {
      // include the whole end day
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Withdrawals</h1>
        <p className="text-gray-600 text-sm">Track your withdrawal requests</p>
      </div>
      
      {/* Withdraw Button */}
      <div className="flex justify-between items-center">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200 flex-1 mr-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Available for Withdrawal</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(talent.totalEarnings)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <button
          className="px-6 py-2 rounded-lg shadow-md font-semibold text-white bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 transition-all duration-200 border-0 outline-none focus:ring-2 focus:ring-blue-300"
          onClick={() => setShowWithdraw(true)}
          disabled={talent.totalEarnings < 1}
        >
          Withdraw Funds
        </button>
      </div>

      {/* Date filter controls */}
      <div className="flex flex-wrap gap-3 mb-2 items-center">
        <label className="text-sm font-medium">Start Date:</label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <label className="text-sm font-medium">End Date:</label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        {(startDate || endDate) && (
          <button
            className="ml-2 text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            onClick={() => { setStartDate(''); setEndDate(''); }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div>Loading...</div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="text-gray-500 py-6 text-center">
            No withdrawal records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Admin Fee</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Bank</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Account No.</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Account Holder</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="border-t">
                    <td className="px-4 py-2">{new Date(w.requested_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-green-700 font-bold">RM{Number(w.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-yellow-700">RM{Number(w.admin_fee).toFixed(2)}</td>
                    <td className="px-4 py-2">{w.bank_name}</td>
                    <td className="px-4 py-2">{w.account_number}</td>
                    <td className="px-4 py-2">{w.account_holder}</td>
                    <td className={`px-4 py-2 font-semibold flex items-center gap-2 ${statusColor[w.status] || 'text-gray-700'}`}>
                      {statusIcon[w.status] || <Clock className="h-5 w-5" />} 
                      <span className="capitalize">{w.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Withdraw Modal */}
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        currentTotal={talent.totalEarnings}
        userId={talent.id}
      />
    </div>
  );
};

export default WithdrawalsPage;
