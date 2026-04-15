import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { formatCurrency, formatNumber } from '../utils/formatters';

const chartContainerStyle: React.CSSProperties = {
  background: '#f5f5f5',
  borderRadius: '8px',
  padding: '24px',
  color: '#000000',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  border: '1px solid #e0e0e0',
  marginBottom: '16px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#666666',
  marginBottom: '16px',
  fontWeight: 600,
  fontFamily: "'Alliance No. 2', sans-serif",
};

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  background: '#ffffff',
  color: '#000000',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '12px',
  pointerEvents: 'none',
  zIndex: 1000,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  border: '1px solid #e0e0e0',
};

const TrendChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { months } = useSelector((state: RootState) => state.data);
  const { kpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || months.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 700, height = 350;
    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    
    const data = months.map((m, i) => {
      const nett = kpis[m]?.totalNett || 0;
      const prevNett = i > 0 ? (kpis[months[i - 1]]?.totalNett || 0) : 0;
      const momGrowth = prevNett > 0 ? ((nett - prevNett) / prevNett) * 100 : 0;
      
      return {
        month: m,
        gross: kpis[m]?.totalGross || 0,
        promo: kpis[m]?.totalPromo || 0,
        nett: nett,
        momGrowth: momGrowth,
      };
    });
    
    if (data.length === 0) return;
    
    const x = d3.scalePoint<string>().domain(months).range([margin.left, width - margin.right]).padding(0.5);
    const maxY = d3.max(data, d => Math.max(d.gross, d.nett)) || 0;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice()
      .range([height - margin.bottom, margin.top]);
    
    const line = (key: keyof typeof data[0]) => d3.line<typeof data[0]>()
      .x(d => x(d.month)!)
      .y(d => y(d[key] as number))
      .curve(d3.curveMonotoneX);
    
    const colors = { gross: '#60a5fa', promo: '#f472b6', nett: '#4ade80' };
    
    Object.entries(colors).forEach(([key, color]) => {
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', line(key as keyof typeof data[0]));
        
      svg.selectAll(`.dot-${key}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.month)!)
        .attr('cy', d => y(d[key as keyof typeof data[0]] as number))
        .attr('r', 5)
        .attr('fill', color)
        .attr('cursor', 'pointer')
        .on('mouseenter', (event, d) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) {
            const momText = d.momGrowth !== 0 ? `\nMoM Growth: ${d.momGrowth >= 0 ? '+' : ''}${d.momGrowth.toFixed(1)}%` : '';
            setTooltip({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top - 60,
              content: `${d.month}${momText}\n${key.charAt(0).toUpperCase() + key.slice(1)}: ${formatCurrency(d[key as keyof typeof d] as number)}`
            });
          }
        })
        .on('mouseleave', () => setTooltip(null));
    });
    
    // Add MoM growth labels above each month (except first)
    svg.selectAll('text.mom-label')
      .data(data.slice(1))
      .enter()
      .append('text')
      .attr('class', 'mom-label')
      .attr('x', (d, i) => x(d.month)!)
      .attr('y', margin.top - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.momGrowth >= 0 ? '#4ade80' : '#f87171')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => `${d.momGrowth >= 0 ? '+' : ''}${d.momGrowth.toFixed(1)}%`);
    
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr('color', '#cccccc')
      .selectAll('text')
      .attr('fill', '#666666')
      .attr('font-size', '12px');
      
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d => formatCurrency(d as number)))
      .attr('color', '#cccccc')
      .selectAll('text')
      .attr('fill', '#666666')
      .attr('font-size', '12px');
    
    const legend = svg.append('g').attr('transform', `translate(${width - 70}, 20)`);
    Object.entries(colors).forEach(([key, color], i) => {
      legend.append('rect').attr('x', 0).attr('y', i * 20).attr('width', 12).attr('height', 12).attr('fill', color);
      legend.append('text').attr('x', 18).attr('y', i * 20 + 10).text(key.charAt(0).toUpperCase() + key.slice(1))
        .attr('fill', '#000').attr('font-size', '11px');
    });
  }, [months, kpis]);

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Month-over-Month Trend</div>
      <div style={{ position: 'relative' }}>
        {months.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '50px' }}>No data</div>
        ) : (
          <svg ref={svgRef} width="100%" height="350" viewBox="0 0 700 350" style={{ overflow: 'visible' }} />
        )}
        {tooltip && (
          <div style={{ ...tooltipStyle, left: tooltip.x, top: tooltip.y, whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.transactionsByPayment) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 500, height = 400;
    const data = Object.entries(kpisData.transactionsByPayment)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    
    if (data.length === 0) return;
    
    const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map(d => d.label));
    const total = d3.sum(data, d => d.value);
    
    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(50).outerRadius(100);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(50).outerRadius(115);
    
    const g = svg.append('g').attr('transform', `translate(${width/2},${120})`);
    
    g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => colors(d.data.label) as string)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover as any);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        setTooltip({
          x: width / 2,
          y: 120 - 40,
          content: `${d.data.label}\nOrders: ${formatNumber(d.data.value)}\n(${pct}%)`
        });
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(200).attr('d', arc as any);
        setTooltip(null);
      });
    
    // Add labels with percentages on the pie slices
    g.selectAll('text.label')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('transform', d => {
        const pos = arc.centroid(d as any);
        return `translate(${pos})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#000')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => {
        const pct = ((d.data.value / total) * 100).toFixed(0);
        return `${pct}%`;
      });
    
    // Add legend below the pie - organized in rows
    const legendStartY = 240;
    const itemsPerRow = 2;
    const itemWidth = width / itemsPerRow;
    
    svg.selectAll('g.legend-item')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        return `translate(${col * itemWidth + 20}, ${legendStartY + row * 25})`;
      })
      .each(function(d) {
        d3.select(this).append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', colors(d.label) as string)
          .attr('rx', 2);
        
        d3.select(this).append('text')
          .attr('x', 18)
          .attr('y', 10)
          .attr('fill', '#000')
          .attr('font-size', '11px')
          .text(`${d.label}: ${formatNumber(d.value)}`);
      });
  }, [activeView, selectedMonth, kpis, overallKpis]);

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Payment Method Distribution</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="400" viewBox="0 0 500 400" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...tooltipStyle, left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.transactionsByProfile) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 500, height = 400;
    const data = Object.entries(kpisData.transactionsByProfile)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));
    
    if (data.length === 0) return;
    
    const colors: Record<string, string> = { Retail: '#60a5fa', AAPRO: '#f472b6' };
    const total = d3.sum(data, d => d.value);
    
    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(50).outerRadius(100);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(50).outerRadius(115);
    
    const g = svg.append('g').attr('transform', `translate(${width/2},${120})`);
    
    g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => colors[d.data.label] || '#888')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover as any);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        setTooltip({
          x: width / 2,
          y: 120 - 30,
          content: `${d.data.label}\n${formatNumber(d.data.value)} orders\n(${pct}%)`
        });
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(200).attr('d', arc as any);
        setTooltip(null);
      });
    
    // Add percentage labels on the pie slices
    g.selectAll('text.label')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('transform', d => {
        const pos = arc.centroid(d as any);
        return `translate(${pos})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#000')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => {
        const pct = ((d.data.value / total) * 100).toFixed(0);
        return `${pct}%`;
      });
    
    // Add legend below - organized in rows
    const legendStartY = 240;
    const itemsPerRow = 2;
    const itemWidth = width / itemsPerRow;
    
    svg.selectAll('g.legend-item')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        return `translate(${col * itemWidth + 20}, ${legendStartY + row * 25})`;
      })
      .each(function(d) {
        d3.select(this).append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', colors[d.label] || '#888')
          .attr('rx', 2);
        
        d3.select(this).append('text')
          .attr('x', 18)
          .attr('y', 10)
          .attr('fill', '#000')
          .attr('font-size', '11px')
          .text(`${d.label}: ${formatNumber(d.value)}`);
      });
  }, [activeView, selectedMonth, kpis, overallKpis]);

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Profile Distribution</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="400" viewBox="0 0 500 400" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...tooltipStyle, left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const ServiceChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.revenueByService) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 400, height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const data = Object.entries(kpisData.revenueByService)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));
    
    if (data.length === 0) return;
    
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value) || 0]).nice()
      .range([height - margin.bottom, margin.top]);
    
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label)!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - margin.bottom - y(d.value))
      .attr('fill', '#60a5fa')
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('fill', '#93c5fd');
        setTooltip({
          x: x(d.label)! + x.bandwidth() / 2,
          y: y(d.value) - 10,
          content: `${d.label}\nRevenue: ${formatCurrency(d.value)}`
        });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', '#60a5fa');
        setTooltip(null);
      });
    
    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
      .attr('color', '#666666')
      .selectAll('text')
      .attr('fill', '#999999')
      .attr('font-size', '12px');
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => formatCurrency(d as number)))
      .attr('color', '#666666')
      .selectAll('text')
      .attr('fill', '#999999')
      .attr('font-size', '12px');
  }, [activeView, selectedMonth, kpis, overallKpis]);

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Revenue by Service Type</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="250" viewBox="0 0 400 250" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...tooltipStyle, left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const OrdersByServiceChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.transactionsByService) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 350, height = 280;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    
    const data = Object.entries(kpisData.transactionsByService)
      .map(([label, orders]) => ({ label, orders }))
      .sort((a, b) => b.orders - a.orders);
    
    if (data.length === 0) return;
    
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.orders) || 0]).nice()
      .range([height - margin.bottom, margin.top]);
    
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label)!)
      .attr('y', d => y(d.orders))
      .attr('width', x.bandwidth())
      .attr('height', d => height - margin.bottom - y(d.orders))
      .attr('fill', '#60a5fa')
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 0.8);
        setTooltip({
          x: x(d.label)! + x.bandwidth() / 2,
          y: y(d.orders) - 10,
          content: `${d.label}\nOrders: ${formatNumber(d.orders)}`
        });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
        setTooltip(null);
      });
    
    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
      .attr('color', '#666666')
      .selectAll('text')
      .attr('fill', '#999999')
      .attr('font-size', '12px');
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => formatNumber(d as number)))
      .attr('color', '#666666')
      .selectAll('text')
      .attr('fill', '#999999')
      .attr('font-size', '12px');
  }, [activeView, selectedMonth, kpis, overallKpis]);

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Orders by Service Type</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="280" viewBox="0 0 350 280" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...tooltipStyle, left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

export { TrendChart, PaymentChart, ProfileChart, ServiceChart, OrdersByServiceChart, ConcentrationChart, ItemCategoryChart };

const ConcentrationChart: React.FC = () => {
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);

  const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
  
  if (!kpisData?.topCustomersByOrders || kpisData.topCustomersByOrders.length === 0) {
    return (
      <div style={chartContainerStyle}>
        <div style={titleStyle}>Top 10 Customers by Order Count</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '50px' }}>No data</div>
      </div>
    );
  }

  const totalTransactions = kpisData.totalTransactions;
  const tableData = kpisData.topCustomersByOrders.map((customer, index) => {
    const percentage = totalTransactions > 0 ? (customer.orderCount / totalTransactions) * 100 : 0;
    return {
      rank: index + 1,
      customerId: customer.customerId,
      orderCount: customer.orderCount,
      percentage: percentage,
    };
  });

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const headerCellStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #e0e0e0',
    color: '#666666',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.5px',
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    color: '#000000',
  };

  const rankCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    color: '#60a5fa',
    width: '50px',
  };

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Top 10 Customers by Order Count</div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Rank</th>
            <th style={headerCellStyle}>Customer ID</th>
            <th style={headerCellStyle}>Order Count</th>
            <th style={headerCellStyle}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.customerId}>
              <td style={rankCellStyle}>{row.rank}</td>
              <td style={cellStyle}>{row.customerId}</td>
              <td style={cellStyle}>{formatNumber(row.orderCount)}</td>
              <td style={cellStyle}>{row.percentage.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


const ItemCategoryChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.ordersByItemCategory) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = 700, height = 400;
    const margin = { top: 20, right: 20, bottom: 120, left: 60 };
    
    const data = Object.entries(kpisData.ordersByItemCategory)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, orders: value, revenue: kpisData.revenueByItemCategory[label] || 0 }))
      .sort((a, b) => b.orders - a.orders);
    
    if (data.length === 0) return;
    
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.orders) || 0]).nice()
      .range([height - margin.bottom, margin.top]);
    
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label)!)
      .attr('y', d => y(d.orders))
      .attr('width', x.bandwidth())
      .attr('height', d => height - margin.bottom - y(d.orders))
      .attr('fill', '#60a5fa')
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('fill', '#93c5fd');
        setTooltip({
          x: x(d.label)! + x.bandwidth() / 2,
          y: y(d.orders) - 10,
          content: `${d.label}\nOrders: ${formatNumber(d.orders)}\nRevenue: ${formatCurrency(d.revenue)}`
        });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', '#60a5fa');
        setTooltip(null);
      });
    
    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
      .attr('color', '#cccccc')
      .selectAll('text')
      .attr('fill', '#666666')
      .attr('font-size', '12px')
      .attr('text-anchor', 'start')
      .attr('transform', 'rotate(45)')
      .attr('dx', '8px')
      .attr('dy', '4px');
    svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => formatNumber(d as number)))
      .attr('color', '#cccccc')
      .selectAll('text')
      .attr('fill', '#666666')
      .attr('font-size', '12px');
  }, [activeView, selectedMonth, kpis, overallKpis]);

  return (
    <div style={chartContainerStyle}>
      <div style={titleStyle}>Item Category Performance</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="400" viewBox="0 0 700 400" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...tooltipStyle, left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};
