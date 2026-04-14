import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

const cardStyle: React.CSSProperties = {
  background: '#f5f5f5',
  borderRadius: '8px',
  padding: '20px',
  color: '#000000',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  border: '1px solid #e0e0e0',
  minWidth: '180px',
  flex: '1 1 auto',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#666666',
  marginBottom: '8px',
  fontWeight: 600,
  fontFamily: "'Alliance No. 2', sans-serif",
};

const valueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#000000',
};

const positiveStyle: React.CSSProperties = { color: '#4ade80' };
const negativeStyle: React.CSSProperties = { color: '#f87171' };

export const SummaryCards: React.FC = () => {
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  
  const kpisToShow = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
  
  if (!kpisToShow) return null;
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Total Transactions</div>
        <div style={valueStyle}>{formatNumber(kpisToShow.totalTransactions)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Total Gross</div>
        <div style={valueStyle}>{formatCurrency(kpisToShow.totalGross)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Total Promo</div>
        <div style={valueStyle}>{formatCurrency(kpisToShow.totalPromo)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Total Nett</div>
        <div style={valueStyle}>{formatCurrency(kpisToShow.totalNett)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Avg Order Value</div>
        <div style={valueStyle}>{formatCurrency(kpisToShow.averageOrderValue)}</div>
      </div>
      {activeView === 'monthly' && (
        <div style={cardStyle}>
          <div style={labelStyle}>MoM Growth</div>
          <div style={{ ...valueStyle, ...(kpisToShow.momGrowth >= 0 ? { color: '#4ade80' } : { color: '#f87171' }) }}>
            {formatPercent(kpisToShow.momGrowth)}
          </div>
        </div>
      )}
      <div style={{ ...cardStyle, ...(kpisToShow.promoToRevenueRatio > 15 ? { borderLeft: '4px solid #f87171' } : {}) }}>
        <div style={labelStyle}>Promo-to-Revenue</div>
        <div style={{ ...valueStyle, color: kpisToShow.promoToRevenueRatio > 15 ? '#f87171' : '#000000' }}>
          {kpisToShow.promoToRevenueRatio.toFixed(1)}%
        </div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Avg Discount</div>
        <div style={valueStyle}>{formatCurrency(kpisToShow.averageDiscountPerTransaction)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Monthly Active Users</div>
        <div style={valueStyle}>{formatNumber(kpisToShow.monthlyActiveUsers)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Weekly Active Users</div>
        <div style={valueStyle}>{formatNumber(kpisToShow.weeklyActiveUsers)}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Daily Active Users</div>
        <div style={valueStyle}>{formatNumber(kpisToShow.dailyActiveUsers)}</div>
      </div>
    </div>
  );
};
