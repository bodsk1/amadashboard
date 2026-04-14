import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, setOrders, setLoading, setError, computeKPIs, setActiveView, setSelectedMonth } from '../store';
import { SummaryCards } from './SummaryCards';
import { TrendChart, PaymentChart, ProfileChart, ServiceChart, ServiceProfitabilityChart, ConcentrationChart, ItemCategoryChart } from './Charts';
import { getMonthName } from '../utils/formatters';
import Papa from 'papaparse';
import { OrderRecord, ProfileType, ServiceType, PaymentChannel } from '../types';

const getMonthFromDate = (dateStr: string): string => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const year = parts[2].slice(0, 4);
    const month = parts[1].padStart(2, '0');
    return year + month;
  }
  return '';
};

const parseDate = (dateStr: string): Date => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date();
};

const isValidRow = (row: Record<string, string>): boolean => {
  const required = ['create_order_time', 'customer_id', 'profile_type', 'waybill', 'service_type', 'payment_channel', 'gross_amount', 'promo_amount', 'nett_amount'];
  for (const col of required) {
    const val = row[col];
    if (!val || val.trim() === '') return false;
  }
  return true;
};

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { orders, months, loading, error } = useSelector((state: any) => state.data);
  const { activeView, selectedMonth } = useSelector((state: any) => state.ui);
  const [debug, setDebug] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      dispatch(setLoading(true));
      try {
        const allOrders: OrderRecord[] = [];
        const foundMonthsSet = new Set<string>();

        // Fetch list of CSV files from /data/ folder
        const indexResponse = await fetch('/data/');
        let dataFiles: string[] = [];
        
        if (indexResponse.ok) {
          const html = await indexResponse.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = doc.querySelectorAll('a');
          dataFiles = Array.from(links)
            .map(link => link.getAttribute('href') || '')
            .filter(href => href.match(/aca_order_\d{8}\.csv$/))
            .map(href => `/data/${href}`);
        }

        // Fallback if directory listing not available
        if (dataFiles.length === 0) {
          dataFiles = ['/data/aca_order_20260201.csv', '/data/aca_order_20260301.csv', '/data/aca_order_20260401.csv'];
        }

        for (const file of dataFiles) {
          const response = await fetch(file);
          if (!response.ok) continue;
          
          const text = await response.text();
          const result = Papa.parse(text, { header: true, skipEmptyLines: true });
          
          let count = 0;
          
          (result.data as Record<string, string>[]).forEach((row: Record<string, string>) => {
            if (!isValidRow(row)) return;
            
            const waybill = row.waybill.trim();
            const createOrderTime = row.create_order_time;
            const profileType = row.profile_type === 'Business' ? 'AAPRO' : 'Retail';
            const serviceType = row.service_type;
            let paymentChannel = row.payment_channel;
            if (paymentChannel === 'GOPAY QR') paymentChannel = 'QRIS';
            const grossAmount = parseFloat(row.gross_amount) || 0;
            const promoAmount = parseFloat(row.promo_amount) || 0;
            const nettAmount = parseFloat(row.nett_amount) || (grossAmount - promoAmount);
            
            allOrders.push({
              waybill,
              createOrderTime: parseDate(createOrderTime),
              customerId: row.customer_id,
              profileType: profileType as ProfileType,
              serviceType: serviceType as ServiceType,
              paymentChannel: paymentChannel as PaymentChannel,
              grossAmount,
              promoAmount,
              nettAmount,
            });
            count++;
            
            const monthStr = getMonthFromDate(createOrderTime);
            if (monthStr) foundMonthsSet.add(monthStr);
          });
          
          setDebug((d: Record<string, string>) => ({ ...d, [file]: `${count} valid` }));
        }

        const foundMonths = Array.from(foundMonthsSet).sort();
        setDebug((d: Record<string, string>) => ({ ...d, total: `${allOrders.length} total`, months: foundMonths.join(', ') }));

        dispatch(setOrders({ orders: allOrders, months: foundMonths }));
        dispatch(computeKPIs({ orders: allOrders, months: foundMonths }));
        if (foundMonths.length > 0) dispatch(setSelectedMonth(foundMonths[0]));
      } catch (err: any) {
        setDebug((d: Record<string, string>) => ({ ...d, error: err.message }));
        dispatch(setError(err.message || 'Failed to load data'));
      }
    };

    loadData();
  }, [dispatch]);

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Loading...</div>;
  if (error) return <div style={{ color: '#f87171', textAlign: 'center', padding: '50px' }}>Error: {error}</div>;

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: '20px',
    border: isActive ? 'none' : '1px solid #e0e0e0',
    cursor: 'pointer',
    background: isActive ? '#000000' : '#ffffff',
    color: isActive ? '#ffffff' : '#000000',
    fontFamily: "'Alliance No. 2', sans-serif",
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  });

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', position: 'relative' }}>
      <img src="/logo.png" alt="Anteraja" style={{ position: 'absolute', top: '20px', right: '20px', height: '40px', width: 'auto' }} />
      <h1 style={{ color: '#000000', marginBottom: '32px', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.5px', fontFamily: "'Alliance No. 2', sans-serif" }}>Anteraja App Monthly Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button onClick={() => dispatch(setActiveView('overall'))} style={buttonStyle(activeView === 'overall')}>
          Overall View
        </button>
        <button onClick={() => dispatch(setActiveView('monthly'))} style={buttonStyle(activeView === 'monthly')}>
          Monthly View
        </button>
        {activeView === 'monthly' && (
          <select value={selectedMonth || ''} onChange={e => dispatch(setSelectedMonth(e.target.value))}
            style={{ padding: '10px 12px', paddingRight: '32px', borderRadius: '20px', background: '#ffffff', color: '#000000', border: '1px solid #e0e0e0', fontFamily: "'Alliance No. 2', sans-serif", fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', appearance: 'none', backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"8\" viewBox=\"0 0 12 8\"><path fill=\"%23000\" d=\"M1 1l5 5 5-5\"/></svg>')", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
            {months.map((m: string) => <option key={m} value={m}>{getMonthName(m)}</option>)}
          </select>
        )}
      </div>

      <SummaryCards />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ width: '100%' }}>
          <TrendChart />
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '24px' }}>
        <div style={{ minWidth: 0 }}>
          <PaymentChart />
        </div>
        <div style={{ minWidth: 0 }}>
          <ProfileChart />
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ width: '100%' }}>
          <ServiceChart />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ width: '100%' }}>
          <ServiceProfitabilityChart />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ width: '100%' }}>
          <ConcentrationChart />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
        <div style={{ width: '100%' }}>
          <ItemCategoryChart />
        </div>
      </div>

      <footer style={{ marginTop: '60px', paddingTop: '40px', borderTop: '1px solid #e0e0e0', textAlign: 'center', color: '#999999', fontSize: '12px' }}>
        <p>Created by Nanda Pratama © 2026</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <Provider store={store}><Dashboard /></Provider>
);
