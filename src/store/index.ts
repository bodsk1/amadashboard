import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderRecord, KPIMetrics, ProfileType, ServiceType, PaymentChannel } from '../types';
import { calculateKPIs } from '../utils/dataUtils';

const initialKPIMetrics: KPIMetrics = {
  totalTransactions: 0,
  totalGross: 0,
  totalPromo: 0,
  totalNett: 0,
  averageOrderValue: 0,
  transactionsByProfile: { Retail: 0, AAPRO: 0 },
  revenueByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
  transactionsByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
  transactionsByPayment: { GOPAY: 0, OVO: 0, SHOPEEPAY: 0, QRIS: 0, Refundaja: 0, Free: 0 },
  momGrowth: 0,
  promoToRevenueRatio: 0,
  averageDiscountPerTransaction: 0,
  revenuePerTransactionByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
  topCustomersByOrders: [],
  monthlyActiveUsers: 0,
  weeklyActiveUsers: 0,
  dailyActiveUsers: 0,
  ordersByItemCategory: {},
  revenueByItemCategory: {},
  ordersByPromoCode: {},
};

interface DataState {
  orders: OrderRecord[];
  months: string[];
  loading: boolean;
  error: string | null;
}

interface ComputedState {
  kpis: Record<string, KPIMetrics>;
  overallKpis: KPIMetrics;
}

interface UIState {
  activeView: 'overall' | 'monthly';
  selectedMonth: string | null;
  selectedProfile: 'all' | 'Retail' | 'AAPRO';
  theme: 'dark' | 'light';
}

const initialDataState: DataState = {
  orders: [],
  months: [],
  loading: false,
  error: null,
};

const initialComputedState: ComputedState = {
  kpis: {},
  overallKpis: initialKPIMetrics,
};

const initialUIState: UIState = {
  activeView: 'overall',
  selectedMonth: null,
  selectedProfile: 'all',
  theme: 'dark',
};

const dataSlice = createSlice({
  name: 'data',
  initialState: initialDataState,
  reducers: {
    setOrders: (state, action: PayloadAction<{ orders: OrderRecord[]; months: string[] }>) => {
      state.orders = action.payload.orders;
      state.months = action.payload.months;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

const getYYYYMM = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return year + month;
};

const computedSlice = createSlice({
  name: 'computed',
  initialState: initialComputedState,
  reducers: {
    computeKPIs: (state, action: PayloadAction<{ orders: OrderRecord[]; months: string[]; precomputedKPIs?: Record<string, KPIMetrics> }>) => {
      const { orders, months, precomputedKPIs } = action.payload;
      
      // If precomputed KPIs are provided, use them directly
      if (precomputedKPIs) {
        state.kpis = precomputedKPIs;
        
        // Calculate overall KPIs by aggregating all months
        const allMonths = Object.keys(precomputedKPIs);
        if (allMonths.length > 0) {
          const overallKpis: KPIMetrics = {
            totalTransactions: 0,
            totalGross: 0,
            totalPromo: 0,
            totalNett: 0,
            averageOrderValue: 0,
            transactionsByProfile: { Retail: 0, AAPRO: 0 },
            revenueByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
            transactionsByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
            transactionsByPayment: { GOPAY: 0, OVO: 0, SHOPEEPAY: 0, QRIS: 0, Refundaja: 0, Free: 0 },
            momGrowth: 0,
            promoToRevenueRatio: 0,
            averageDiscountPerTransaction: 0,
            revenuePerTransactionByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
            topCustomersByOrders: [],
            monthlyActiveUsers: 0,
            weeklyActiveUsers: 0,
            dailyActiveUsers: 0,
            ordersByItemCategory: {},
            revenueByItemCategory: {},
            ordersByPromoCode: {},
          };
          
          // Aggregate across all months
          allMonths.forEach(month => {
            const kpi = precomputedKPIs[month];
            overallKpis.totalTransactions += kpi.totalTransactions;
            overallKpis.totalGross += kpi.totalGross;
            overallKpis.totalPromo += kpi.totalPromo;
            overallKpis.totalNett += kpi.totalNett;
            
            // Profile
            overallKpis.transactionsByProfile.Retail += kpi.transactionsByProfile.Retail || 0;
            overallKpis.transactionsByProfile.AAPRO += kpi.transactionsByProfile.AAPRO || 0;
            
            // Service
            Object.keys(kpi.revenueByService).forEach(service => {
              overallKpis.revenueByService[service as ServiceType] += kpi.revenueByService[service as ServiceType] || 0;
              overallKpis.transactionsByService[service as ServiceType] += kpi.transactionsByService[service as ServiceType] || 0;
            });
            
            // Payment
            Object.keys(kpi.transactionsByPayment).forEach(payment => {
              overallKpis.transactionsByPayment[payment as PaymentChannel] += kpi.transactionsByPayment[payment as PaymentChannel] || 0;
            });
            
            // Item categories
            Object.keys(kpi.ordersByItemCategory).forEach(category => {
              overallKpis.ordersByItemCategory[category] = (overallKpis.ordersByItemCategory[category] || 0) + kpi.ordersByItemCategory[category];
              overallKpis.revenueByItemCategory[category] = (overallKpis.revenueByItemCategory[category] || 0) + kpi.revenueByItemCategory[category];
            });

            // Promo codes
            Object.keys(kpi.ordersByPromoCode || {}).forEach(promo => {
              overallKpis.ordersByPromoCode[promo] = (overallKpis.ordersByPromoCode[promo] || 0) + kpi.ordersByPromoCode[promo];
            });
          });
          
          // Calculate derived metrics
          overallKpis.averageOrderValue = overallKpis.totalTransactions > 0 ? overallKpis.totalNett / overallKpis.totalTransactions : 0;
          overallKpis.promoToRevenueRatio = overallKpis.totalGross > 0 ? (overallKpis.totalPromo / overallKpis.totalGross) * 100 : 0;
          overallKpis.averageDiscountPerTransaction = overallKpis.totalTransactions > 0 ? overallKpis.totalPromo / overallKpis.totalTransactions : 0;
          
          // Use latest month's top customers and active users
          const latestMonth = allMonths.sort().reverse()[0];
          overallKpis.topCustomersByOrders = precomputedKPIs[latestMonth].topCustomersByOrders;
          overallKpis.monthlyActiveUsers = precomputedKPIs[latestMonth].monthlyActiveUsers;
          overallKpis.weeklyActiveUsers = precomputedKPIs[latestMonth].weeklyActiveUsers;
          overallKpis.dailyActiveUsers = precomputedKPIs[latestMonth].dailyActiveUsers;
          
          state.overallKpis = overallKpis;
        }
        return;
      }
      
      // Legacy path: calculate from orders (kept for backward compatibility)
      const kpis: Record<string, KPIMetrics> = {};
      
      const sortedMonths = [...months].sort();
      
      // Calculate KPIs for each month
      sortedMonths.forEach((month, index) => {
        const monthOrders = orders.filter(o => {
          const orderYYYYMM = getYYYYMM(o.createOrderTime);
          return orderYYYYMM === month;
        });
        
        // Get previous month's nett for MoM calculation
        let prevNett = 0;
        if (index > 0) {
          prevNett = kpis[sortedMonths[index - 1]].totalNett;
        }
        
        const kpi = calculateKPIs(monthOrders, prevNett);
        kpis[month] = kpi;
      });
      
      // Calculate overall KPIs (no MoM growth for overall)
      const overallKpis = calculateKPIs(orders);
      
      state.kpis = kpis;
      state.overallKpis = overallKpis;
    },
  },
});

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUIState,
  reducers: {
    setActiveView: (state, action: PayloadAction<'overall' | 'monthly'>) => {
      state.activeView = action.payload;
    },
    setSelectedMonth: (state, action: PayloadAction<string | null>) => {
      state.selectedMonth = action.payload;
    },
    setSelectedProfile: (state, action: PayloadAction<'all' | 'Retail' | 'AAPRO'>) => {
      state.selectedProfile = action.payload;
    },
    setTheme: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.theme = action.payload;
    },
  },
});

export const store = configureStore({
  reducer: {
    data: dataSlice.reducer,
    computed: computedSlice.reducer,
    ui: uiSlice.reducer,
  },
});

export const { setOrders, setLoading, setError } = dataSlice.actions;
export const { computeKPIs } = computedSlice.actions;
export const { setActiveView, setSelectedMonth, setSelectedProfile, setTheme } = uiSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
