#!/usr/bin/env node

/**
 * Anteraja Dashboard - Monthly Data Aggregation Script
 * 
 * This script processes raw CSV files and generates pre-aggregated KPI JSON files.
 * This solves the browser memory issue and allows the dashboard to scale to 12+ months.
 * 
 * Usage: node scripts/process-monthly-data.js
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const SOURCE_DIR = path.join(__dirname, '../../data');
const OUTPUT_DIR = path.join(__dirname, '../public/data');

console.log('🚀 Starting monthly data aggregation...\n');

// Helper: Parse DD/MM/YYYY date
function parseDate(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date();
}

// Helper: Get YYYYMM from date string
function getMonthKey(dateStr) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const year = parts[2].slice(0, 4);
    const month = parts[1].padStart(2, '0');
    return year + month;
  }
  return '';
}

// Helper: Validate row has all required fields
function isValidRow(row) {
  const required = ['create_order_time', 'customer_id', 'profile_type', 'waybill', 
                    'service_type', 'payment_channel', 'gross_amount', 'promo_amount', 'nett_amount'];
  return required.every(col => row[col] && row[col].trim() !== '');
}

// Process a single CSV file
function processCSV(filePath) {
  console.log(`📄 Processing: ${path.basename(filePath)}`);
  
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const result = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  
  const monthlyData = {};
  let validCount = 0;
  let invalidCount = 0;
  
  result.data.forEach(row => {
    if (!isValidRow(row)) {
      invalidCount++;
      return;
    }
    
    const monthKey = getMonthKey(row.create_order_time);
    if (!monthKey) {
      invalidCount++;
      return;
    }
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    
    // Transform data
    const profileType = row.profile_type === 'Business' ? 'AAPRO' : 'Retail';
    let paymentChannel = row.payment_channel;
    if (paymentChannel === 'GOPAY QR') paymentChannel = 'QRIS';
    if (paymentChannel === 'Saldoaja') {
      invalidCount++;
      return;
    }
    
    const rawPromo = (row.promo_code || '').trim();
    let promoCode;
    if (rawPromo === '') promoCode = 'No Promo';
    else if (rawPromo.startsWith('SUBS')) promoCode = 'Subscription';
    else promoCode = rawPromo;

    monthlyData[monthKey].push({
      waybill: row.waybill.trim(),
      createOrderTime: parseDate(row.create_order_time).toISOString(),
      customerId: row.customer_id,
      profileType,
      serviceType: row.service_type,
      paymentChannel,
      grossAmount: parseFloat(row.gross_amount) || 0,
      promoAmount: parseFloat(row.promo_amount) || 0,
      nettAmount: parseFloat(row.nett_amount) || (parseFloat(row.gross_amount) - parseFloat(row.promo_amount)),
      itemCategory: row.item_category_code || 'Unknown',
      promoCode
    });
    
    validCount++;
  });
  
  console.log(`   ✅ Valid: ${validCount} | ❌ Invalid: ${invalidCount}`);
  
  return monthlyData;
}

// Calculate KPIs for a month's orders
function calculateKPIs(orders, prevMonthNett = 0) {
  const uniqueWaybills = new Set(orders.map(o => o.waybill));
  const totalTransactions = uniqueWaybills.size;
  const totalGross = orders.reduce((sum, o) => sum + o.grossAmount, 0);
  const totalPromo = orders.reduce((sum, o) => sum + o.promoAmount, 0);
  const totalNett = orders.reduce((sum, o) => sum + o.nettAmount, 0);
  
  // Profile distribution
  const transactionsByProfile = { Retail: 0, AAPRO: 0 };
  orders.forEach(o => {
    transactionsByProfile[o.profileType] = (transactionsByProfile[o.profileType] || 0) + 1;
  });
  
  // Service metrics
  const revenueByService = { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 };
  const transactionsByService = { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 };
  orders.forEach(o => {
    revenueByService[o.serviceType] = (revenueByService[o.serviceType] || 0) + o.nettAmount;
    transactionsByService[o.serviceType] = (transactionsByService[o.serviceType] || 0) + 1;
  });
  
  // Payment distribution
  const transactionsByPayment = { GOPAY: 0, OVO: 0, SHOPEEPAY: 0, QRIS: 0, Refundaja: 0, Free: 0 };
  orders.forEach(o => {
    transactionsByPayment[o.paymentChannel] = (transactionsByPayment[o.paymentChannel] || 0) + 1;
  });
  
  // Promo effectiveness
  const promoToRevenueRatio = totalGross > 0 ? (totalPromo / totalGross) * 100 : 0;
  const averageDiscountPerTransaction = totalTransactions > 0 ? totalPromo / totalTransactions : 0;
  
  // Customer concentration
  const customerOrderCount = {};
  orders.forEach(o => {
    if (!customerOrderCount[o.customerId]) {
      customerOrderCount[o.customerId] = { count: 0, profileType: o.profileType };
    }
    customerOrderCount[o.customerId].count += 1;
  });
  
  const topCustomersByOrders = Object.entries(customerOrderCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([customerId, data]) => ({ 
      customerId, 
      orderCount: data.count, 
      profileType: data.profileType 
    }));
  
  // Active users
  const uniqueCustomers = new Set(orders.map(o => o.customerId)).size;
  const latestDate = orders.length > 0 ? new Date(Math.max(...orders.map(o => new Date(o.createOrderTime).getTime()))) : new Date();
  const sevenDaysAgo = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(latestDate.getTime() - 24 * 60 * 60 * 1000);
  
  const weeklyCustomers = new Set(
    orders.filter(o => new Date(o.createOrderTime) >= sevenDaysAgo).map(o => o.customerId)
  ).size;
  
  const dailyCustomers = new Set(
    orders.filter(o => new Date(o.createOrderTime) >= oneDayAgo).map(o => o.customerId)
  ).size;
  
  // Item categories
  const ordersByItemCategory = {};
  const revenueByItemCategory = {};
  orders.forEach(o => {
    ordersByItemCategory[o.itemCategory] = (ordersByItemCategory[o.itemCategory] || 0) + 1;
    revenueByItemCategory[o.itemCategory] = (revenueByItemCategory[o.itemCategory] || 0) + o.nettAmount;
  });

  // Promo distribution
  const ordersByPromoCode = {};
  orders.forEach(o => {
    ordersByPromoCode[o.promoCode] = (ordersByPromoCode[o.promoCode] || 0) + 1;
  });
  
  // MoM growth
  const momGrowth = prevMonthNett > 0 ? ((totalNett - prevMonthNett) / prevMonthNett) * 100 : 0;
  
  return {
    totalTransactions,
    totalGross,
    totalPromo,
    totalNett,
    averageOrderValue: totalTransactions > 0 ? totalNett / totalTransactions : 0,
    transactionsByProfile,
    revenueByService,
    transactionsByService,
    transactionsByPayment,
    momGrowth,
    promoToRevenueRatio,
    averageDiscountPerTransaction,
    topCustomersByOrders,
    monthlyActiveUsers: uniqueCustomers,
    weeklyActiveUsers: weeklyCustomers,
    dailyActiveUsers: dailyCustomers,
    ordersByItemCategory,
    revenueByItemCategory,
    ordersByPromoCode
  };
}

// Main execution
try {
  // Find all CSV files
  const csvFiles = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.match(/aca_order_\d{8}\.csv$/))
    .map(f => path.join(SOURCE_DIR, f));
  
  if (csvFiles.length === 0) {
    console.error('❌ No CSV files found in', SOURCE_DIR);
    process.exit(1);
  }
  
  console.log(`📂 Found ${csvFiles.length} CSV file(s)\n`);
  
  // Process all CSVs
  const allMonthlyData = {};
  csvFiles.forEach(file => {
    const monthlyData = processCSV(file);
    Object.keys(monthlyData).forEach(monthKey => {
      if (!allMonthlyData[monthKey]) {
        allMonthlyData[monthKey] = [];
      }
      allMonthlyData[monthKey].push(...monthlyData[monthKey]);
    });
  });
  
  // Sort months
  const sortedMonths = Object.keys(allMonthlyData).sort();
  
  console.log(`\n📊 Calculating KPIs for ${sortedMonths.length} month(s)...\n`);
  
  // Calculate KPIs for each month
  let prevNett = 0;
  sortedMonths.forEach(monthKey => {
    const orders = allMonthlyData[monthKey];
    const kpis = calculateKPIs(orders, prevNett);
    prevNett = kpis.totalNett;
    
    // Write KPI JSON
    const outputPath = path.join(OUTPUT_DIR, `kpis-${monthKey}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(kpis, null, 2));
    
    console.log(`   ✅ ${monthKey}: ${kpis.totalTransactions} transactions → ${path.basename(outputPath)}`);
  });
  
  // Write months index
  const indexPath = path.join(OUTPUT_DIR, 'months-index.json');
  fs.writeFileSync(indexPath, JSON.stringify({ months: sortedMonths }, null, 2));
  
  console.log(`\n✨ Success! Generated ${sortedMonths.length} KPI file(s)`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`\n🚀 Next: Commit and deploy the JSON files`);
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
