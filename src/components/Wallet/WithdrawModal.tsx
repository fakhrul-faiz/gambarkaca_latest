import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createTransaction, updateProfile, requestChipWithdrawal } from '../../lib/api';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  currentTotal: number;
  userId: string;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ open, onClose, currentTotal, userId }) => {
  const [amount, setAmount] = useState(currentTotal);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const adminFee = amount * 0.1;
  const finalAmount = amount * 0.9;

  const handleWithdraw = async () => {
    if (!bankName || !accountNumber || !accountHolder || amount <= 0 || amount > currentTotal) {
      alert('Please fill all fields and ensure the amount is valid.');
      return;
    }
    setLoading(true);
    let withdrawalId: string | null = null;
    try {
      // 1. Deduct from profile.total_earning
      await updateProfile(userId, { total_earnings: currentTotal - amount });
      // 2. Create transaction for talent (debit)
      await createTransaction({
        userId,
        type: 'debit',
        amount,
        description: `Withdrawal Request (Bank: ${bankName})`,
        relatedJobId: undefined,
      });
      // 3. Create transaction for admin (credit, only adminFee)
      await createTransaction({
        userId: '066e9f3d-9570-405e-8a43-ab1ed542e9a7', // Use your admin user ID
        type: 'credit',
        amount: adminFee,
        description: `Admin Fee (10%) from withdrawal`,
        relatedJobId: undefined,
      });
      // 4. Optional: Store withdrawal request in a separate table
      // await supabase.from('withdrawals').insert([
      const { data: withdrawalData, error: withdrawalError } = await supabase.from('withdrawals').insert([
        {
          user_id: userId,
          amount,
          admin_fee: adminFee,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          // status: 'paid',
          +status: 'pending',
          requested_at: new Date().toISOString(),
        },
      // ]);
      // alert('Withdrawal request submitted successfully!');
      // onClose();
+      ]).select('id').single();
+      
+      if (withdrawalError) throw withdrawalError;
+      withdrawalId = withdrawalData.id;
+      
+      // 5. Call the Edge Function to initiate CHIP payout
+      await requestChipWithdrawal(
+        userId,
+        amount,
+        bankName,
+        accountNumber,
+        accountHolder,
+        withdrawalId
+      );
+      
+      alert('Withdrawal request submitted and processing!');
+      onClose();
+  
    } catch (err: any) {
      alert('Failed to submit withdrawal: ' + err.message);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-3">Withdraw Earnings</h2>
        <p className="mb-2">You can withdraw up to <b>RM{currentTotal.toFixed(2)}</b>.</p>
        <p className="mb-3 text-yellow-700 font-medium">
          10% admin fee will be deducted from the requested amount.
        </p>
        <div className="mb-2">
          <label className="block text-sm">Amount</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            min={1}
            max={currentTotal}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            disabled={loading}
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm">Bank Name</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm">Account Number</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm">Account Holder Name</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={accountHolder}
            onChange={e => setAccountHolder(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="mb-4 text-sm">
          <div>
            <b>Requested:</b> RM{amount.toFixed(2)}
          </div>
          <div>
            <b>Admin Fee (10%):</b> RM{adminFee.toFixed(2)}
          </div>
          <div>
            <b>Amount to Receive:</b> <span className="text-green-700 font-semibold">RM{finalAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="bg-gray-200 rounded px-3 py-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 text-white rounded px-3 py-1"
            onClick={handleWithdraw}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;
