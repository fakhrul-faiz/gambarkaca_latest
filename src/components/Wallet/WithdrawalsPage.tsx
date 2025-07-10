import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getWithdrawals } from '../../lib/api';
import { DollarSign, Clock, CheckCircle, X } from 'lucide-react';

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
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      getWithdrawals(user.id).then(setWithdrawals).finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Withdrawals</h1>
        <p className="text-gray-600 text-sm">Track your withdrawal requests</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {loading ? (
          <div>Loading...</div>
        ) : withdrawals.length === 0 ? (
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
                {withdrawals.map(w => (
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
    </div>
  );
};

export default WithdrawalsPage;
