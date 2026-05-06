import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, setOrders, setLoading, setError, computeKPIs, setActiveView, setSelectedMonth } from '../store';
import { SummaryCards } from './SummaryCards';
import { RevenueTrendChart, OrderTrendChart, PaymentChart, ProfileChart, ServiceChart, OrdersByServiceChart, ConcentrationChart, ItemCategoryChart } from './Charts';
import { getMonthName } from '../utils/formatters';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { months, loading, error } = useSelector((state: any) => state.data);
  const { activeView, selectedMonth } = useSelector((state: any) => state.ui);

  useEffect(() => {
    const loadData = async () => {
      dispatch(setLoading(true));
      try {
        const indexResponse = await fetch('/data/months-index.json');
        if (!indexResponse.ok) throw new Error('Failed to load months index');

        const { months } = await indexResponse.json();
        if (months.length === 0) throw new Error('No months found in index');

        console.log(`📊 Loading KPIs for ${months.length} months:`, months);

        const kpisData: Record<string, any> = {};
        for (const month of months) {
          const kpiResponse = await fetch(`/data/kpis-${month}.json`);
          if (!kpiResponse.ok) {
            console.warn(`Failed to load KPIs for ${month}`);
            continue;
          }
          kpisData[month] = await kpiResponse.json();
        }

        console.log(`✅ Loaded KPIs for ${Object.keys(kpisData).length} months`);

        dispatch(setOrders({ orders: [], months }));
        dispatch(computeKPIs({ orders: [], months, precomputedKPIs: kpisData }));
        if (months.length > 0) dispatch(setSelectedMonth(months[0]));

      } catch (err: any) {
        console.error('Error loading data:', err);
        dispatch(setError(err.message || 'Failed to load data'));
      }
    };

    loadData();
  }, [dispatch]);

  if (loading) return <div className="text-white text-center py-12">Loading...</div>;
  if (error) return <div className="text-red-400 text-center py-12">Error: {error}</div>;

  const btnBase = 'px-5 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-all duration-200 cursor-pointer';
  const btnActive = `${btnBase} bg-black text-white border-none`;
  const btnInactive = `${btnBase} bg-white text-black border border-gray-200 hover:border-gray-400`;

  const sectionHeader = (emoji: string, label: string) => (
    <div className="mt-10 mb-4">
      <h2 className="text-lg font-semibold text-black uppercase tracking-widest font-alliance">
        {emoji} {label}
      </h2>
    </div>
  );

  return (
    <div className="min-h-screen px-5 py-10 relative">
      <img src="/logo.png" alt="Anteraja" className="absolute top-5 right-5 h-10 w-auto" />
      <h1 className="text-3xl font-semibold text-black mb-8 tracking-tight font-alliance">
        Anteraja App Monthly Dashboard
      </h1>

      {/* View controls */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => dispatch(setActiveView('overall'))} className={activeView === 'overall' ? btnActive : btnInactive}>
          Overall View
        </button>
        <button onClick={() => dispatch(setActiveView('monthly'))} className={activeView === 'monthly' ? btnActive : btnInactive}>
          Monthly View
        </button>
        {activeView === 'monthly' && (
          <select
            value={selectedMonth || ''}
            onChange={e => dispatch(setSelectedMonth(e.target.value))}
            className="px-4 py-2.5 pr-8 rounded-full bg-white text-black border border-gray-200 text-sm uppercase tracking-wide cursor-pointer appearance-none font-alliance"
            style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"8\" viewBox=\"0 0 12 8\"><path fill=\"%23000\" d=\"M1 1l5 5 5-5\"/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            {months.map((m: string) => <option key={m} value={m}>{getMonthName(m)}</option>)}
          </select>
        )}
      </div>

      <SummaryCards />

      {sectionHeader('📈', 'Performance Trends')}
      <div className="grid grid-cols-2 gap-6">
        <div className="min-w-0"><RevenueTrendChart /></div>
        <div className="min-w-0"><OrderTrendChart /></div>
      </div>

      {sectionHeader('👥', 'Customer Segments')}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="min-w-0"><ProfileChart /></div>
        <div />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ConcentrationChart />
      </div>

      {sectionHeader('💳', 'Transaction Behavior')}
      <div className="grid grid-cols-2 gap-6">
        <div className="min-w-0"><PaymentChart /></div>
        <div />
      </div>

      {sectionHeader('📦', 'Service Performance')}
      <div className="grid grid-cols-2 gap-6">
        <div className="min-w-0"><OrdersByServiceChart /></div>
        <div className="min-w-0"><ServiceChart /></div>
      </div>

      {sectionHeader('🏷️', 'Product Categories')}
      <div className="grid grid-cols-1 gap-6">
        <ItemCategoryChart />
      </div>

      <footer className="mt-16 pt-10 border-t border-gray-200 text-center text-gray-400 text-xs">
        <p>Created by Nanda Pratama © 2026</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <Provider store={store}><Dashboard /></Provider>
);
