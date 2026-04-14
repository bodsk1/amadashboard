// Flexible type for CSV rows
export interface RawCSVRow {
  [key: string]: string | undefined;
  waybill?: string;
  create_order_time?: string;
  customer_id?: string;
  profile_type?: string;
  service_type?: string;
  payment_channel?: string;
  gross_amount?: string;
  promo_amount?: string;
  item_category_code?: string;
}

// Branded types for type safety
export type ProfileType = 'Retail' | 'AAPRO';
export type ServiceType = 'REG' | 'SD' | 'DOK' | 'MIC' | 'BIG' | 'ICE';
export type PaymentChannel = 'GOPAY' | 'OVO' | 'SHOPEEPAY' | 'QRIS' | 'Refundaja' | 'Free';

export interface OrderRecord {
  waybill: string;
  createOrderTime: Date;
  customerId: string;
  profileType: ProfileType;
  serviceType: ServiceType;
  paymentChannel: PaymentChannel;
  grossAmount: number;
  promoAmount: number;
  nettAmount: number;
  itemCategory: string;
}

export interface MonthlyData {
  month: string;
  orders: OrderRecord[];
  uniqueTransactions: number;
}

export interface KPIMetrics {
  totalTransactions: number;
  totalGross: number;
  totalPromo: number;
  totalNett: number;
  averageOrderValue: number;
  transactionsByProfile: Record<ProfileType, number>;
  revenueByService: Record<ServiceType, number>;
  transactionsByPayment: Record<PaymentChannel, number>;
  momGrowth: number;
  promoToRevenueRatio: number;
  averageDiscountPerTransaction: number;
  revenuePerTransactionByService: Record<ServiceType, number>;
  topCustomersByOrders: Array<{ customerId: string; orderCount: number }>;
  monthlyActiveUsers: number;
  weeklyActiveUsers: number;
  dailyActiveUsers: number;
  ordersByItemCategory: Record<string, number>;
  revenueByItemCategory: Record<string, number>;
}
