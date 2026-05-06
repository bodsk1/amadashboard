import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { formatCompactCurrency, formatNumber, formatPercent } from '../utils/formatters';

export const SummaryCards: React.FC = () => {
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const { months } = useSelector((state: RootState) => state.data);

  const kpisToShow = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);

  if (!kpisToShow) return null;

  let parcelMovement = 0;
  if (activeView === 'monthly' && selectedMonth) {
    const currentIndex = months.indexOf(selectedMonth);
    if (currentIndex > 0) {
      const prevMonth = months[currentIndex - 1];
      const prevTransactions = kpis[prevMonth]?.totalTransactions || 0;
      parcelMovement = prevTransactions > 0
        ? ((kpisToShow.totalTransactions - prevTransactions) / prevTransactions) * 100
        : 0;
    }
  }

  const card = 'bg-gray-100 rounded-lg p-5 border border-gray-200 shadow-sm flex-1 min-w-[180px]';
  const label = 'text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2 font-alliance';
  const value = 'text-2xl font-semibold text-black';

  return (
    <div className="flex flex-wrap gap-4 mb-6">

      <div className={card}>
        <div className={label}>Total Parcels</div>
        <div className={value}>{formatNumber(kpisToShow.totalTransactions)}</div>
        {activeView === 'monthly' && parcelMovement !== 0 && (
          <div className={`text-xs mt-1 font-semibold ${parcelMovement >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            {parcelMovement >= 0 ? '↑' : '↓'} {Math.abs(parcelMovement).toFixed(1)}% MoM
          </div>
        )}
      </div>

      <div className={card}>
        <div className={label}>Total Gross</div>
        <div className={value}>{formatCompactCurrency(kpisToShow.totalGross)}</div>
      </div>

      <div className={card}>
        <div className={label}>Total Promo</div>
        <div className={value}>{formatCompactCurrency(kpisToShow.totalPromo)}</div>
      </div>

      <div className={card}>
        <div className={label}>Total Nett</div>
        <div className={value}>{formatCompactCurrency(kpisToShow.totalNett)}</div>
      </div>

      <div className={card}>
        <div className={label}>Avg Order Value</div>
        <div className={value}>{formatCompactCurrency(kpisToShow.averageOrderValue)}</div>
      </div>

      {activeView === 'monthly' && (
        <div className={card}>
          <div className={label}>Revenue MoM Growth</div>
          <div className={`${value} ${kpisToShow.momGrowth >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            {formatPercent(kpisToShow.momGrowth)}
          </div>
        </div>
      )}

      <div className={`${card} ${kpisToShow.promoToRevenueRatio > 27 ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-green-400'}`}>
        <div className={label}>Promo-to-Revenue</div>
        <div className={`${value} ${kpisToShow.promoToRevenueRatio > 27 ? 'text-red-400' : 'text-green-500'}`}>
          {kpisToShow.promoToRevenueRatio.toFixed(1)}%
        </div>
      </div>

      <div className={card}>
        <div className={label}>Avg Discount</div>
        <div className={value}>{formatCompactCurrency(kpisToShow.averageDiscountPerTransaction)}</div>
      </div>

      <div className={card}>
        <div className={label}>Monthly Active Users</div>
        <div className={value}>{formatNumber(kpisToShow.monthlyActiveUsers)}</div>
      </div>

      <div className={card}>
        <div className={label}>Weekly Active Users</div>
        <div className={value}>{formatNumber(kpisToShow.weeklyActiveUsers)}</div>
      </div>

      <div className={card}>
        <div className={label}>Daily Active Users</div>
        <div className={value}>{formatNumber(kpisToShow.dailyActiveUsers)}</div>
      </div>

    </div>
  );
};
