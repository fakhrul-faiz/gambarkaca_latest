fakhrul-faiz/gambarkaca_latest (imported from GitHub)






OKay please check to make everytime talent get earn,  insert the total sum inside profile.total_earning.


Thoughts




To ensure the total_earnings for a talent are updated when they receive payment, you'll need to modify the handleApproveReview function in src/components/Reviews/ReviewsPage.tsx. This function is responsible for processing the approval of a review, which includes creating an earning record and a transaction for the talent.

The Plan
Modify src/components/Reviews/ReviewsPage.tsx:
In the handleApproveReview function, after the earning and transaction records for the talent are created, you will fetch the talent's current profile data.
Then, you will calculate the new totalEarnings by adding the talentPayment to the talent's existing totalEarnings.
Finally, you will call the updateProfile function from src/lib/api.ts to persist this updated totalEarnings value to the talent's profile in the database.

Implement this plan

Explain updateProfile
okay its work. then, i want to add dialog button inside earning page to withdraw money based on total_earning. deduct  from the total_earning.


Thoughts












You're looking to add a withdrawal feature to the Earnings page, allowing talents to request a payout from their total earnings. This will involve creating a new modal for the withdrawal process and integrating it into your existing Earnings page.

The Plan
Create a new WithdrawModal component: This component will handle the user interface for entering withdrawal details and initiating the withdrawal.
Integrate WithdrawModal into src/components/Earnings/EarningsPage.tsx: You'll add a button to trigger the modal and manage its visibility.
Implement withdrawal logic: The modal will call existing API functions to deduct the amount from the talent's total_earnings and record a new transaction.
Here are the detailed steps:

1. Create src/components/Wallet/WithdrawModal.tsx
This new file will contain the modal for the withdrawal form.

2. Modify src/components/Earnings/EarningsPage.tsx
You will add a "Withdraw" button and manage the state for displaying the WithdrawModal.

3. Update src/lib/api.ts
Ensure the updateProfile function can handle updating the total_earnings for a talent, and that createTransaction can record the withdrawal. These functions are already capable of this based on your current code.


Implement this plan

Show WithdrawModal code
please create page withdrawal and see record withdrawal.

May already be resolved or irrelevant.

1
Show problem


Thoughts










You're looking to create a dedicated page to view withdrawal records, which is a great way to keep track of payout history. This will involve creating a new component for the page, updating the navigation, and ensuring the necessary database structure is in place to store these records.

The Plan
Create a new Supabase table for withdrawals: You'll need a database table to store all withdrawal requests and their details.
Create src/components/Wallet/WithdrawalsPage.tsx: This new component will display a list of all past withdrawal requests.
Modify src/components/Layout/Sidebar.tsx: You'll add a new navigation item for the "Withdrawals" page, specifically for the talent role.
Modify src/App.tsx: You'll update the main application component to render the new WithdrawalsPage when selected from the sidebar.
Update src/lib/api.ts: You'll add a function to fetch withdrawal records from the new Supabase table.
Update src/lib/database.types.ts: You'll add the type definition for the new withdrawals table to ensure type safety.
Here are the detailed steps:

1. Create a new Supabase table for withdrawals
You'll need to create a new migration file in your Supabase project to define the withdrawals table. This table will store the details of each withdrawal request.

Action: Create a new migration file (e.g., supabase/migrations/YYYYMMDDHHMMSS_create_withdrawals_table.sql) and add the SQL schema for the withdrawals table.


CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  admin_fee numeric NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'paid', 'rejected'
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,

  CONSTRAINT withdrawals_status_check CHECK (status IN ('pending', 'paid', 'rejected'))
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their own withdrawals"
  ON public.withdrawals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own withdrawals"
  ON public.withdrawals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin policy to view all withdrawals (optional, if needed for admin dashboard)
CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
Action: Run the migration to apply these changes to your Supabase database.

2. Create src/components/Wallet/WithdrawalsPage.tsx
This file will contain the React component for displaying the withdrawal records.

Action: Create a new file src/components/Wallet/WithdrawalsPage.tsx and add the necessary React code to fetch and display withdrawal data. This page should include a table or list format to show details like amount, bank, status, and date.
3. Modify src/components/Layout/Sidebar.tsx
You'll add a new menu item to the sidebar so talents can navigate to the new page.

Action: In src/components/Layout/Sidebar.tsx, locate the case 'talent': block within the getMenuItems function.
Action: Add a new object to the array returned for the talent role, for example: { id: 'withdrawals', label: 'Withdrawals', icon: DollarSign }. You can choose an appropriate icon from lucide-react.
4. Modify src/App.tsx
You'll update the renderCurrentPage function to include the new WithdrawalsPage.

Action: In src/App.tsx, locate the renderCurrentPage function.
Action: Add a new case statement for 'withdrawals' that returns the WithdrawalsPage component. Remember to import WithdrawalsPage at the top of the file.
5. Update src/lib/api.ts
You'll add a function to fetch withdrawal records from the new withdrawals table.

Action: In src/lib/api.ts, add a new function getWithdrawals that queries the withdrawals table. This function should return an array of withdrawal objects.
6. Update src/lib/database.types.ts
You'll add the type definition for the new withdrawals table.

Action: In src/lib/database.types.ts, add the withdrawals table definition under Tables to match the schema you created in step 1.

Implement this plan

Show WithdrawalsPage code
admin can export report of payment of each campaign and analytics. this all filtered by date.

Create the report in excel.

I'm importing your project into Bolt. This may take a moment as I set everything up. Once it's ready, you'll be able to explore and interact with your code.

Importing Bolt Project

github-q7nu1ljo
npm install
npm run dev
I've successfully imported your project. I'm ready to assist you with analyzing and improving your code.

Error
This message didn't complete its response.

why button export cannot be downloaded?


Thought for 22s




























It sounds like the export button isn't triggering the download as expected. This can sometimes happen with client-side operations like generating files, especially when integrating with libraries that capture DOM elements.

The current implementation uses html2canvas to capture the chart as an image before embedding it into the Excel file. While the code includes error handling, a silent failure or a browser-specific issue might be preventing the download.

Here's a plan to debug and improve the export functionality:

The Plan
Add console logs for debugging: You should add console.log statements at key points in the handleExportExcel function to trace the execution flow and identify where the process might be stopping or encountering an issue.
Introduce a small delay before chart capture: Sometimes, html2canvas might attempt to capture an element before it's fully rendered or stable in the DOM. Adding a slight delay can help ensure the chart is ready for capture.
Ensure html2canvas options are robust: If your charts or any elements within them load external resources (like images or fonts), html2canvas might encounter cross-origin issues. Explicitly setting useCORS and allowTaint can help.
Here are the detailed steps:

1. Add console logs for debugging
File: src/components/Admin/AnalyticsPage.tsx

Description: Insert console.log statements to track the function's progress. This will help you pinpoint if the code reaches the file saving part.


// Inside handleExportExcel function, after setLoading(true)
console.log("Export process started.");

// Inside the try block for html2canvas, before the if (chartRef.current) check
console.log("Attempting to capture chart image...");

// Inside the html2canvas success block, after chartImageBase64 is set
console.log("Chart image captured successfully.");

// Inside the html2canvas catch block
console.error("Error capturing chart with html2canvas:", error);
alert("Failed to capture chart image for Excel. Exporting data only."); // Add an alert here

// Before workbook.xlsx.writeBuffer()
console.log("Generating Excel workbook...");

// Inside the try block for saveAs, before saveAs call
console.log("Attempting to save Excel file...");

// Inside the try block for saveAs, after saveAs call
console.log("Excel file save initiated.");

// Inside the catch block for saveAs
console.error("Error saving Excel file:", error);
alert("Failed to generate or download the Excel file. Please try again."); // Ensure this alert is visible
2. Introduce a small delay before chart capture
File: src/components/Admin/AnalyticsPage.tsx

Description: Add a short await statement before the html2canvas call to give the browser a moment to ensure the chart is fully rendered.


// Inside handleExportExcel function, before the html2canvas try block
await new Promise(resolve => setTimeout(resolve, 100)); // Add this line
3. Ensure html2canvas options are robust
File: src/components/Admin/AnalyticsPage.tsx

Description: Modify the html2canvas options to handle potential cross-origin content, even if you don't explicitly use external images, as some chart libraries might load resources in ways that trigger these checks.


// Inside handleExportExcel function, within the html2canvas call
const canvas = await html2canvas(chartRef.current, {
  backgroundColor: "#fff",
  useCORS: true, // Add this option
  allowTaint: true, // Add this option
});
After making these changes, please open your browser's developer console (usually by pressing F12) and observe any messages or errors that appear when you click the export button. This will provide crucial information for further debugging.


Implement this plan

Next steps

Open AnalyticsPage.tsx
please modify to allow user download a list of transaction, campaign and earning chart graph at another sheet excell.


Thought for 23s


























Okay, I understand. You want to enhance the Excel export functionality in the AnalyticsPage to include separate sheets for transactions, campaigns, and earnings, in addition to the existing orders report and the charts.

Here's the plan to implement this:

The Plan
Update AnalyticsPage.tsx to use multiple refs: You will need to add a separate useRef hook for each chart (BarChart and LineChart) to allow html2canvas to capture them individually.
Modify handleExportExcel function:
Create a new Excel workbook.
Add a worksheet for "Campaign Payment Report" (Orders), populating it with filteredOrders data.
Add a new worksheet for "Transactions Report", populating it with transactions data.
Add a new worksheet for "Campaigns Report", populating it with campaigns data.
Add a new worksheet for "Earnings Report", populating it with earnings data.
Add a new worksheet for "Analytics Charts". This sheet will contain images of both the Bar Chart and the Line Chart, captured using html2canvas.
Ensure proper column headers and data formatting for each new sheet.
Update the saveAs function to use a more generic filename for the combined report.
Here are the detailed steps:

1. Modify src/components/Admin/AnalyticsPage.tsx
File: src/components/Admin/AnalyticsPage.tsx
Description:
Add a new useRef for the LineChart.
Update the handleExportExcel function to create and populate multiple worksheets.
Adjust the ref attributes in the JSX for both charts.

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

    // --- Sheet 1: Campaign Payment Report (Orders) ---
    const ordersWorksheet = workbook.addWorksheet('Campaign Payment Report');
    ordersWorksheet.columns = [
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
      ordersWorksheet.addRow({
        campaign: campaign ? campaign.title : '',
        founder: campaign?.founderName || '',
        order: order.id,
        talent: order.talentName,
        status: order.status,
        payout: Number(order.payout || 0).toFixed(2),
        adminFee: Number(adminFee).toFixed(2),
        totalDeduct: Number(order.payout + adminFee).toFixed(2),
        createdAt: new Date(order.createdAt).toLocaleString(),
      });
    });
    ordersWorksheet.getRow(1).font = { bold: true };

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
    campaignsWork Worksheet.columns = [
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

Implement this plan

Other reports

Open AnalyticsPage.tsx
15.8M monthly tokens remaining.
Subscribe to Pro 50 for 2x more usage

Clear
Update



Discuss

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
        <div className="w-full h-96" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
handleExportExcel
/
