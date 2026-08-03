import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, setOrders, setLoading, setError, computeKPIs, setActiveView, setSelectedMonth, setTheme } from '../store';
import { SummaryCards } from './SummaryCards';
import { RevenueTrendChart, OrderTrendChart, PaymentChart, ProfileChart, ServiceChart, OrdersByServiceChart, ConcentrationChart, ItemCategoryChart, PromoChart } from './Charts';
import { getMonthName } from '../utils/formatters';
import { Analytics } from '@vercel/analytics/react';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { months, loading, error } = useSelector((state: any) => state.data);
  const { activeView, selectedMonth, theme } = useSelector((state: any) => state.ui);
  const isDark = theme === 'dark';

  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#0a0f1e' : '#ffffff';
    document.body.style.color = isDark ? '#ffffff' : '#000000';
    document.documentElement.style.setProperty(
      '--grid-color',
      isDark ? 'rgba(200, 200, 200, 0.15)' : 'rgba(200, 200, 200, 0.4)'
    );
  }, [isDark]);

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
  const btnActive = isDark
    ? `${btnBase} bg-yellow-400 text-navy-900 border-none font-bold`
    : `${btnBase} bg-black text-white border-none`;
  const btnInactive = isDark
    ? `${btnBase} bg-navy-700 text-white border border-navy-600 hover:border-yellow-400 hover:text-yellow-300`
    : `${btnBase} bg-white text-black border border-gray-200 hover:border-gray-400`;

  const sectionHeader = (emoji: string, label: string) => (
    <div className={`mt-10 mb-4 pb-2 border-b ${isDark ? 'border-navy-600' : 'border-gray-200'}`}>
      <h2 className={`text-sm font-semibold uppercase tracking-widest font-alliance ${isDark ? 'text-yellow-600' : 'text-black'}`}>
        {emoji} {label}
      </h2>
    </div>
  );

  return (
    <div className="min-h-screen px-5 py-10 relative">

      {/* Top-right: theme toggle + logo */}
      <div className="absolute top-5 right-5 flex items-center gap-4">
        <button
          onClick={() => dispatch(setTheme(isDark ? 'light' : 'dark'))}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 focus:outline-none ${
            isDark
              ? 'bg-navy-700 border-navy-500 text-yellow-400 hover:border-yellow-400'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-gray-500'
          }`}
        >
          {isDark ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span>Dark</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span>Light</span>
            </>
          )}
        </button>
        <img src="/logo.png" alt="Anteraja" className="h-10 w-auto opacity-90" />
      </div>

      <h1 className={`text-3xl font-semibold mb-2 tracking-tight font-alliance ${isDark ? 'text-yellow-600' : 'text-black'}`}>
        Anteraja App Monthly Dashboard
      </h1>
      <p className={`text-sm mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Performance overview across all channels
      </p>

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
            className={`px-4 py-2.5 pr-8 rounded-full text-sm uppercase tracking-wide cursor-pointer appearance-none font-alliance border ${
              isDark
                ? 'bg-navy-700 text-white border-navy-600'
                : 'bg-white text-black border-gray-200'
            }`}
            style={{
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path fill="${isDark ? '%23ffffff' : '%23000000'}" d="M1 1l5 5 5-5"/></svg>')`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
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
        <div className="min-w-0"><PromoChart /></div>
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

      <footer className={`mt-16 pt-10 border-t text-center text-xs ${isDark ? 'border-navy-600 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
        <p>Created by Nanda Pratama © 2026</p>
      </footer>
      <Analytics />
    </div>
  );
};

export const App: React.FC = () => (
  <Provider store={store}><Dashboard /></Provider>
);
