import { OrderRecord, RawCSVRow, ProfileType, ServiceType, PaymentChannel } from "../types";

const parseDate = (dateStr: string | undefined): Date => {
  if (!dateStr) return new Date();
  // Format: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

export const transformProfileType = (value: string | undefined): ProfileType => {
  return value === "Business" ? "AAPRO" : "Retail";
};

export const transformServiceType = (value: string | undefined): ServiceType => {
  const valid = ["REG", "SD", "DOK", "MIC", "BIG", "ICE"];
  return valid.includes(value || '') ? (value as ServiceType) : "REG";
};

export const transformPaymentChannel = (value: string | undefined): PaymentChannel | null => {
  if (!value) return null;
  if (value === "GOPAY QR") return "QRIS";
  if (value === "Saldoaja") return null;
  const valid = ["GOPAY", "OVO", "SHOPEEPAY", "Refundaja", "Free"];
  return valid.includes(value) ? value as PaymentChannel : null;
};

export const transformRow = (row: RawCSVRow): OrderRecord | null => {
  const waybill = row.waybill;
  if (!waybill) return null;
  
  const paymentChannel = transformPaymentChannel(row.payment_channel);
  if (!paymentChannel) return null;
  
  const grossAmount = parseFloat(row.gross_amount || '0') || 0;
  const promoAmount = parseFloat(row.promo_amount || '0') || 0;
  
  return {
    waybill,
    createOrderTime: parseDate(row.create_order_time),
    customerId: row.customer_id || '',
    profileType: transformProfileType(row.profile_type),
    serviceType: transformServiceType(row.service_type),
    paymentChannel,
    grossAmount,
    promoAmount,
    nettAmount: grossAmount - promoAmount,
  };
};

export const calculateKPIs = (orders: OrderRecord[], prevNett?: number) => {
  const uniqueWaybills = new Set(orders.map(o => o.waybill));
  const totalTransactions = uniqueWaybills.size;
  const totalGross = orders.reduce((sum, o) => sum + o.grossAmount, 0);
  const totalPromo = orders.reduce((sum, o) => sum + o.promoAmount, 0);
  const totalNett = orders.reduce((sum, o) => sum + o.nettAmount, 0);
  
  const transactionsByProfile: Record<ProfileType, number> = { Retail: 0, AAPRO: 0 };
  orders.forEach(o => {
    transactionsByProfile[o.profileType] = (transactionsByProfile[o.profileType] || 0) + 1;
  });
  
  const revenueByService: Record<ServiceType, number> = { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 };
  orders.forEach(o => {
    revenueByService[o.serviceType] = (revenueByService[o.serviceType] || 0) + o.nettAmount;
  });
  
  const transactionsByPayment: Record<PaymentChannel, number> = { GOPAY: 0, OVO: 0, SHOPEEPAY: 0, QRIS: 0, Refundaja: 0, Free: 0 };
  orders.forEach(o => {
    transactionsByPayment[o.paymentChannel] = (transactionsByPayment[o.paymentChannel] || 0) + 1;
  });
  
  // New Metric 1: Promo Effectiveness
  const promoToRevenueRatio = totalGross > 0 ? (totalPromo / totalGross) * 100 : 0;
  const averageDiscountPerTransaction = totalTransactions > 0 ? totalPromo / totalTransactions : 0;
  
  // New Metric 2: Service Type Profitability
  const revenuePerTransactionByService: Record<ServiceType, number> = { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 };
  Object.keys(revenueByService).forEach(service => {
    const serviceOrders = orders.filter(o => o.serviceType === service);
    const serviceTransactions = new Set(serviceOrders.map(o => o.waybill)).size;
    revenuePerTransactionByService[service as ServiceType] = serviceTransactions > 0 ? revenueByService[service as ServiceType] / serviceTransactions : 0;
  });
  
  // New Metric 3: Customer Concentration Risk (by order count)
  const customerOrderCount: Record<string, number> = {};
  orders.forEach(o => {
    customerOrderCount[o.customerId] = (customerOrderCount[o.customerId] || 0) + 1;
  });
  
  const sortedCustomersByOrders = Object.entries(customerOrderCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([customerId, orderCount]) => ({ customerId, orderCount }));
  
  const top10OrderCount = sortedCustomersByOrders.reduce((sum, c) => sum + c.orderCount, 0);
  const top10OrderPercentage = totalTransactions > 0 ? (top10OrderCount / totalTransactions) * 100 : 0;
  
  const momGrowth = prevNett ? ((totalNett - prevNett) / prevNett) * 100 : 0;
  
  return {
    totalTransactions,
    totalGross,
    totalPromo,
    totalNett,
    averageOrderValue: totalTransactions > 0 ? totalNett / totalTransactions : 0,
    transactionsByProfile,
    revenueByService,
    transactionsByPayment,
    momGrowth,
    promoToRevenueRatio,
    averageDiscountPerTransaction,
    revenuePerTransactionByService,
    topCustomersByOrders: sortedCustomersByOrders,
  };
};
