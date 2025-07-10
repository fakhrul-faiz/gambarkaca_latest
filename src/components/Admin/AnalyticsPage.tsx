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
  const { orders, transactions, campaigns, talents, founders, earnings } = useApp();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const barChartRef = useRef<HTMLDivElement>(null); // Renamed from chartRef
  const lineChartRef = useRef<HTMLDivElement>(null); // New ref for line chart

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

    const workbook = new ExcelJS.Workbook();

    // --- Sheet 2: Transactions Report ---
    const transactionsWorksheet = workbook.addWorksheet('Transactions Report');
    transactionsWorksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'User ID', key: 'userId', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount (RM)', key: 'amount', width: 18 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Related Job ID', key: 'relatedJobId', width: 24 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    transactions.forEach(tx => {
      transactionsWorksheet.addRow({
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: Number(tx.amount).toFixed(2),
        description: tx.description,
        relatedJobId: tx.relatedJobId || '',
        createdAt: new Date(tx.createdAt).toLocaleString(),
      });
    });
    transactionsWorksheet.getRow(1).font = { bold: true };

    // --- Sheet 3: Campaigns Report ---
    const campaignsWorksheet = workbook.addWorksheet('Campaigns Report');
    campaignsWorksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Founder ID', key: 'founderId', width: 30 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Product Name', key: 'productName', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Rate Level', key: 'rateLevel', width: 15 },
      { header: 'Media Type', key: 'mediaType', width: 15 },
      { header: 'Price (RM)', key: 'price', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];
    campaigns.forEach(c => {
      campaignsWorksheet.addRow({
        id: c.id,
        founderId: c.founderId,
        title: c.title,
        productName: c.productName,
        category: c.category,
        duration: c.duration,
        rateLevel: c.rateLevel,
        mediaType: c.mediaType,
        price: Number(c.price).toFixed(2),
        status: c.status,
        createdAt: new Date(c.createdAt).toLocaleString(),
      });
    });
    campaignsWorksheet.getRow(1).font = { bold: true };

    // --- Sheet 4: Earnings Report ---
    const earningsWorksheet = workbook.addWorksheet('Earnings Report');
    earningsWorksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Talent ID', key: 'talentId', width: 30 },
      { header: 'Order ID', key: 'orderId', width: 24 },
      { header: 'Campaign Title', key: 'campaignTitle', width: 30 },
      { header: 'Amount (RM)', key: 'amount', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Earned At', key: 'earnedAt', width: 20 },
      { header: 'Paid At', key: 'paidAt', width: 20 },
    ];
    earnings.forEach(e => {
      earningsWorksheet.addRow({
        id: e.id,
        talentId: e.talentId,
        orderId: e.orderId,
        campaignTitle: e.campaignTitle,
        amount: Number(e.amount).toFixed(2),
        status: e.status,
        earnedAt: new Date(e.earnedAt).toLocaleString(),
        paidAt: e.paidAt ? new Date(e.paidAt).toLocaleString() : '',
      });
    });
    earningsWorksheet.getRow(1).font = { bold: true };

    // --- Sheet 5: Analytics Charts ---
    const chartsWorksheet = workbook.addWorksheet('Analytics Charts');
    let currentRow = 1;

    // Capture and add Bar Chart
    if (barChartRef.current) {
      console.log("Attempting to capture Bar Chart image...");
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const barCanvas = await html2canvas(barChartRef.current, {
        backgroundColor: "#fff",
        useCORS: true,
        allowTaint: true,
      });
      const barChartImageBase64 = barCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
      const barChartImageId = workbook.addImage({
        base64: barChartImageBase64,
        extension: 'png',
      });
      chartsWorksheet.addImage(barChartImageId, {
        tl: { col: 0, row: currentRow },
        ext: { width: 800, height: 320 },
      });
      currentRow += Math.ceil(320 / 20) + 2; // Estimate rows based on height, plus some padding
      console.log("Bar Chart image captured and added.");
    } else {
      console.error("Bar Chart ref is null. Cannot capture image.");
    }

    // Capture and add Line Chart
    if (lineChartRef.current) {
      console.log("Attempting to capture Line Chart image...");
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const lineCanvas = await html2canvas(lineChartRef.current, {
        backgroundColor: "#fff",
        useCORS: true,
        allowTaint: true,
      });
      const lineChartImageBase64 = lineCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, "");
      const lineChartImageId = workbook.addImage({
        base64: lineChartImageBase64,
        extension: 'png',
      });
      chartsWorksheet.addImage(lineChartImageId, {
        tl: { col: 0, row: currentRow },
        ext: { width: 800, height: 320 },
      });
      console.log("Line Chart image captured and added.");
    } else {
      console.error("Line Chart ref is null. Cannot capture image.");
    }

    console.log("Generating Excel workbook...");
    const buf = await workbook.xlsx.writeBuffer();
    console.log("Attempting to save Excel file...");
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `GambarKaca_Analytics_Report_${Date.now()}.xlsx`
    );
    console.log("Excel file save initiated.");
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
          disabled={loading} // Enable as long as not loading, regardless of filteredOrders length
          className="ml-4 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 text-white px-5 py-2 rounded-full shadow font-semibold hover:from-green-600 hover:to-purple-600 transition-all duration-200 flex items-center gap-2"
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
        <div className="w-full h-96" ref={barChartRef}>
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

      {/* Line chart with ref for export */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue vs Talent Payouts</h3>
        <div className="w-full h-80" ref={lineChartRef}>
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