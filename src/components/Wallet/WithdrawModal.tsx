import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createTransaction, updateProfile, requestChipWithdrawal } from '../../lib/api';

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
  currentTotal: number;
  userId: string;
}

const bankCodeMap: Record<string, string> = {
  "Maybank": "MBBEMYKL",
  "CIMB Bank": "CIBBMYKL",
  "Public Bank": "PBBEMYKL",
  "RHB Bank": "RHBBMYKL",
  "Hong Leong Bank": "HLBBMYKL",
  "AmBank": "ARBKMYKL",
  "UOB Malaysia": "UOVBMYKL",
  "OCBC Bank Malaysia": "OCBCMYKL",
  "Standard Chartered Malaysia": "SCBLMYKX",
  "HSBC Malaysia": "HBMBMYKL",
  "Affin Bank": "PHBMMYKL",
  "Alliance Bank": "MFBBMYKL",
  "Bank Islam Malaysia": "BIMBMYKL",
  "Bank Muamalat Malaysia": "BMMBMYKL",
  "Bank Rakyat": "BKRMMYKL",
  "BSN": "BSNAMYK1",
  "Agro Bank": "AGOBMYKL",
  "Bank Kerjasama Rakyat Malaysia": "BKRMMYKL",
  "SME Bank": "SMEBMYKL",
  "Export-Import Bank of Malaysia": "EXIMMYKL"
};

const WithdrawModal: React.FC<WithdrawModalProps> = ({ open, onClose, currentTotal, userId }) => {
  const [amount, setAmount] = useState(currentTotal);
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const adminFee = amount * 0.1;
  const finalAmount = amount * 0.9;

  const handleBankSelection = (selected: string) => {
    setBankName(selected);
    setBankCode(bankCodeMap[selected] || '');
  };

  const handleWithdraw = async () => {
    if (!bankName || !bankCode || !accountNumber || !accountHolder || !email || !description || amount <= 0 || amount > currentTotal) {
      console.log('❌ Please fill all fields and ensure the amount is valid.');
      return;
    }

    setLoading(true);
    let withdrawalId: string | null = null;

    try {
      console.log("➡️ Inserting withdrawal record...");

      const { data: withdrawalData, error: withdrawalError } = await supabase.from('withdrawals').insert({
        user_id: userId,
        amount,
        admin_fee: adminFee,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        status: 'pending',
        requested_at: new Date().toISOString(),
      }).select('id').single();

      if (withdrawalError) throw withdrawalError;

      withdrawalId = withdrawalData.id;
      console.log("✅ Withdrawal record created, ID:", withdrawalId);

      console.log("➡️ Calling CHIP Edge Function...");
      await requestChipWithdrawal(
        userId,
        amount,
        bankName,
        accountNumber,
        accountHolder,
        withdrawalId,
        email,
        description,
        bankCode
      );

      console.log('✅ Withdrawal request submitted & processing!');

      // Update profile balance
      await updateProfile(userId, { total_earnings: currentTotal - amount });

      // Create talent debit transaction
      await createTransaction({
        userId,
        type: 'debit',
        amount,
        description: `Withdrawal Request (Bank: ${bankName})`,
        relatedJobId: undefined,
      });

      // Admin fee transaction
      await createTransaction({
        userId: '066e9f3d-9570-405e-8a43-ab1ed542e9a7',
        type: 'credit',
        amount: adminFee,
        description: `Admin Fee (10%) from withdrawal`,
        relatedJobId: undefined,
      });

      onClose();

    } catch (err: any) {
      console.log('❌ Failed to submit withdrawal: ' + err.message);
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

        {/* Amount */}
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

        {/* Bank Name */}
        <div className="mb-2">
          <label className="block text-sm">Bank Name</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={bankName}
            onChange={e => handleBankSelection(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Bank</option>
            {Object.keys(bankCodeMap).map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Bank Code (auto filled) */}
        <div className="mb-2">
          <label className="block text-sm">Bank Code</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={bankCode}
            placeholder="Auto-filled based on bank selection"
            onChange={e => setBankCode(e.target.value)} // allow override
            disabled={loading}
          />
        </div>

        {/* Account Number */}
        <div className="mb-2">
          <label className="block text-sm">Account Number</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Account Holder */}
        <div className="mb-2">
          <label className="block text-sm">Account Holder Name</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={accountHolder}
            onChange={e => setAccountHolder(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div className="mb-2">
          <label className="block text-sm">Recipient Email</label>
          <input
            type="email"
            className="border rounded px-2 py-1 w-full"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm">Description</label>
          <textarea
            className="border rounded px-2 py-1 w-full"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Calculation Summary */}
        <div className="mb-4 text-sm">
          <div><b>Requested:</b> RM{amount.toFixed(2)}</div>
          <div><b>Admin Fee (10%):</b> RM{adminFee.toFixed(2)}</div>
          <div><b>Amount to Receive:</b> <span className="text-green-700 font-semibold">RM{finalAmount.toFixed(2)}</span></div>
        </div>

        {/* Buttons */}
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
