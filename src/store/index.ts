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
  transactionsByPayment: { GOPAY: 0, OVO: 0, SHOPEEPAY: 0, QRIS: 0, Refundaja: 0, Free: 0 },
  momGrowth: 0,
  promoToRevenueRatio: 0,
  averageDiscountPerTransaction: 0,
  revenuePerTransactionByService: { REG: 0, SD: 0, DOK: 0, MIC: 0, BIG: 0, ICE: 0 },
  topCustomersByOrders: [],
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
    computeKPIs: (state, action: PayloadAction<{ orders: OrderRecord[]; months: string[] }>) => {
      const { orders, months } = action.payload;
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
export const { setActiveView, setSelectedMonth, setSelectedProfile } = uiSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
