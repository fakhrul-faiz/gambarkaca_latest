import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp, Users, DollarSign, Megaphone, Star, Calendar,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Utility for grouping by month
function groupByMonth(items, dateField, valueField?) {
  const result: Record<string, number> = {};
  items.forEach(item => {
    const date = new Date(item[dateField]);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    result[month] = (result[month] || 0) + (valueField ? Number(item[valueField]) : 1);
  });
  return result;
}

const AnalyticsPage: React.FC = () => {
  const { orders, transactions, campaigns, talents, founders } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Filter orders by date
  const filteredOrders = orders.filter(order => {
    const created = new Date(order.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && created < start) return false;
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (created > end) return false;
    }
    return true;
  });

  // Export Excel with chart image
  const handleExportExcel = async () => {
    console.log('Export triggered');
    setLoading(true);

    // 1. Render the chart as an image (use chartRef)
    let chartImageBase64: string | null = null;
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fff" });
      chartImageBase64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Campaign Payment Report');
    worksheet.columns = [
      { header: 'Campaign Title', key: 'campaign', width: 30 },
      { header: 'Campaign Owner', key: 'founder', width: 24 },
      { header: 'Order ID', key: 'order', width: 24 },
      { header: 'Talent', key: 'talent', width: 24 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Payout Amount (RM)', key: 'payout', width: 18 },
      { header: 'Admin Fee (RM)', key: 'adminFee', width: 14 },
      { header: 'Total Deduction (RM)', key: 'totalDeduct', width: 18 },
      { header: 'Order Date', key: 'createdAt', width: 20 },
    ];

    filteredOrders.forEach(order => {
      const campaign = campaigns.find(c => c.id === order.campaignId);
      const adminFee = order.payout * 0.1;
      worksheet.addRow({
        campaign: campaign ? campaign.title : '',
        founder: campaign?.founderName || '', // Modify as needed to show founder's name
        order: order.id,
        talent: order.talentName,
        status: order.status,
        payout: Number(order.payout || 0).toFixed(2),
        adminFee: Number(adminFee).toFixed(2),
        totalDeduct: Number(order.payout + adminFee).toFixed(2),
        createdAt: new Date(order.createdAt).toLocaleString(),
      });
    });

    worksheet.getRow(1).font = { bold: true };

    // 2. Insert the chart image, if captured
    if (chartImageBase64) {
      const imageId = workbook.addImage({
        base64: chartImageBase64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0, row: filteredOrders.length + 3 },
        ext: { width: 800, height: 320 }, // Adjust as needed
      });
    }

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Campaign_Payment_Report_${Date.now()}.xlsx`
    );
    setLoading(false);
  };

  // Analytics data (charts)
  const revenueByMonth = groupByMonth(
    transactions.filter(t => t.type === 'credit' && t.description?.toLowerCase().includes('admin fee')),
    'createdAt',
    'amount'
  );
  const talentPayoutByMonth = groupByMonth(
    transactions.filter(t => t.type === 'credit' && t.description?.toLowerCase().includes('payment received')),
    'createdAt',
    'amount'
  );
  const campaignsByMonth = groupByMonth(campaigns, 'createdAt');

  const monthsSet = new Set([
    ...Object.keys(revenueByMonth),
    ...Object.keys(talentPayoutByMonth),
    ...Object.keys(campaignsByMonth),
  ]);
  const months = Array.from(monthsSet).sort();

  const chartData = months.map(month => ({
    month,
    Revenue: revenueByMonth[month] || 0,
    'Talent Payments': talentPayoutByMonth[month] || 0,
    Campaigns: campaignsByMonth[month] || 0,
  }));

  // Quick stats
  const totalRevenue = Object.values(revenueByMonth).reduce((a, b) => a + b, 0);
  const totalTalentPayout = Object.values(talentPayoutByMonth).reduce((a, b) => a + b, 0);
  const totalCampaigns = campaigns.length;
  const totalTalents = talents.length;
  const totalFounders = founders.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-600">See platform growth, revenue, and activity over time</p>
      </div>

      {/* Export & Date Filter */}
      <div className="flex flex-wrap gap-2 items-center mb-2">
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
        <button
          onClick={handleExportExcel}
          className={`ml-4 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-white px-5 py-2 rounded-full shadow font-semibold hover:from-green-600 hover:to-purple-600 transition-all duration-200 flex items-center gap-2 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Calendar className="h-5 w-5" />
          {loading ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
          <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
          <span className="text-lg font-semibold text-gray-700">{totalCampaigns}</span>
          <span className="text-xs text-gray-500">Total Campaigns</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
          <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
          <span className="text-lg font-semibold text-gray-700">
            {totalRevenue.toLocaleString('ms-MY', { style: 'currency', currency: 'MYR' })}
          </span>
          <span className="text-xs text-gray-500">Total Revenue</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
          <Star className="h-8 w-8 text-purple-600 mb-2" />
          <span className="text-lg font-semibold text-gray-700">
            {totalTalentPayout.toLocaleString('ms-MY', { style: 'currency', currency: 'MYR' })}
          </span>
          <span className="text-xs text-gray-500">Talent Payouts</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
          <Users className="h-8 w-8 text-blue-500 mb-2" />
          <span className="text-lg font-semibold text-gray-700">{totalTalents}</span>
          <span className="text-xs text-gray-500">Talents</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
          <Megaphone className="h-8 w-8 text-yellow-500 mb-2" />
          <span className="text-lg font-semibold text-gray-700">{totalFounders}</span>
          <span className="text-xs text-gray-500">Founders</span>
        </div>
      </div>

      {/* Bar Chart with ref for export */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue & Campaign Activity</h3>
        <div className="w-full h-96" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Revenue" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Talent Payments" fill="#818cf8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Campaigns" fill="#fde047" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue vs Talent Payouts</h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Revenue" stroke="#22d3ee" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="Talent Payments" stroke="#818cf8" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
