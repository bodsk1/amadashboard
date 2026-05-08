import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { formatCurrency, formatNumber, formatCompactCurrency, formatCompactNumber } from '../utils/formatters';

const TREND_LINE_COLORS = { gross: '#60a5fa', promo: '#f472b6', nett: '#4ade80' };

const PAYMENT_COLORS: Record<string, string> = {
  GOPAY: '#00AA13',
  OVO: '#4C3494',
  SHOPEEPAY: '#EE4D2D',
  'SHOPEEPAY/SPAYLATER': '#EE4D2D',
  QRIS: '#FF6B00',
  Refundaja: '#60a5fa',
  Free: '#9ca3af',
  Sakuaja: '#a78bfa',
};

const PROFILE_COLORS: Record<string, string> = { Retail: '#60a5fa', AAPRO: '#f472b6' };

type Theme = 'dark' | 'light';
type MomData = { month: string; momGrowth: number };

function getContainerStyle(theme: Theme): React.CSSProperties {
  return theme === 'dark' ? {
    background: '#0d1630',
    borderRadius: '8px',
    padding: '24px',
    color: '#ffffff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
    border: '1px solid #243056',
    marginBottom: '16px',
  } : {
    background: '#f5f5f5',
    borderRadius: '8px',
    padding: '24px',
    color: '#000000',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e0e0e0',
    marginBottom: '16px',
  };
}

function getTitleStyle(theme: Theme): React.CSSProperties {
  return {
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: theme === 'dark' ? '#ca8a04' : '#666666',
    marginBottom: '16px',
    fontWeight: 600,
    fontFamily: "'Alliance No. 2', sans-serif",
  };
}

function getTooltipStyle(theme: Theme): React.CSSProperties {
  return theme === 'dark' ? {
    position: 'absolute',
    background: '#1a2444',
    color: '#ffffff',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    pointerEvents: 'none',
    zIndex: 1000,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    border: '1px solid #243056',
  } : {
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
}

function getD3Colors(theme: Theme) {
  const d = theme === 'dark';
  return {
    axisLine:   d ? '#243056' : '#cccccc',
    axisText:   d ? '#cccccc' : '#666666',
    legendText: d ? '#ffffff' : '#000000',
    legendSub:  d ? '#cccccc' : '#666666',
    barLabel:   d ? '#aaaaaa' : '#333333',
    momBase:    d ? '#aaaaaa' : '#999999',
    pieStroke:  d ? '#0d1630' : '#ffffff',
  };
}

function renderMomLabels(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  data: MomData[],
  x: d3.ScalePoint<string>,
  yPos: number,
  theme: Theme
): void {
  const c = getD3Colors(theme);
  svg.selectAll('text.mom-label')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'mom-label')
    .attr('x', d => x(d.month)!)
    .attr('y', yPos)
    .attr('text-anchor', 'middle')
    .attr('fill', (d, i) => i === 0 ? c.momBase : (d.momGrowth >= 0 ? '#4ade80' : '#f87171'))
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .text((d, i) => i === 0 ? 'BASE' : `${d.momGrowth >= 0 ? '+' : ''}${d.momGrowth.toFixed(1)}%`);
}

const RevenueTrendChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { months } = useSelector((state: RootState) => state.data);
  const { kpis } = useSelector((state: RootState) => state.computed);
  const theme = useSelector((state: RootState) => state.ui.theme);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || months.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const width = 700, height = 320;
    const margin = { top: 40, right: 80, bottom: 80, left: 80 };

    const data = months.map((m, i) => {
      const nett = kpis[m]?.totalNett || 0;
      const prevNett = i > 0 ? (kpis[months[i - 1]]?.totalNett || 0) : 0;
      const momGrowth = prevNett > 0 ? ((nett - prevNett) / prevNett) * 100 : 0;
      return { month: m, gross: kpis[m]?.totalGross || 0, promo: kpis[m]?.totalPromo || 0, nett, momGrowth };
    });

    if (data.length === 0) return;

    const x = d3.scalePoint<string>().domain(months).range([margin.left, width - margin.right]).padding(0.5);
    const maxY = d3.max(data, d => Math.max(d.gross, d.nett)) || 0;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([height - margin.bottom, margin.top]);

    const line = (key: keyof typeof data[0]) => d3.line<typeof data[0]>()
      .x(d => x(d.month)!)
      .y(d => y(d[key] as number))
      .curve(d3.curveMonotoneX);

    Object.entries(TREND_LINE_COLORS).forEach(([key, color]) => {
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

    renderMomLabels(svg, data, x, margin.top - 8, theme);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr('color', c.axisLine)
      .selectAll('text')
      .attr('fill', c.axisText)
      .attr('font-size', '11px')
      .attr('text-anchor', 'end')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-8px')
      .attr('dy', '0px');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => formatCompactCurrency(d as number)))
      .attr('color', c.axisLine)
      .selectAll('text')
      .attr('fill', c.axisText)
      .attr('font-size', '10px');

    const legend = svg.append('g').attr('transform', `translate(${width - 70}, 20)`);
    Object.entries(TREND_LINE_COLORS).forEach(([key, color], i) => {
      legend.append('rect').attr('x', 0).attr('y', i * 20).attr('width', 12).attr('height', 12).attr('fill', color);
      legend.append('text').attr('x', 18).attr('y', i * 20 + 10)
        .text(key.charAt(0).toUpperCase() + key.slice(1))
        .attr('fill', c.legendText).attr('font-size', '11px');
    });
  }, [months, kpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Revenue Trend (Month-over-Month)</div>
      <div style={{ position: 'relative' }}>
        {months.length === 0 ? (
          <div style={{ color: 'rgba(128,128,128,0.6)', textAlign: 'center', padding: '50px' }}>No data</div>
        ) : (
          <svg ref={svgRef} width="100%" height="320" viewBox="0 0 700 320" style={{ overflow: 'visible' }} />
        )}
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x, top: tooltip.y, whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderTrendChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { months } = useSelector((state: RootState) => state.data);
  const { kpis } = useSelector((state: RootState) => state.computed);
  const theme = useSelector((state: RootState) => state.ui.theme);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current || months.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const width = 700, height = 320;
    const margin = { top: 40, right: 80, bottom: 80, left: 80 };

    const data = months.map((m, i) => {
      const orders = kpis[m]?.totalTransactions || 0;
      const prevOrders = i > 0 ? (kpis[months[i - 1]]?.totalTransactions || 0) : 0;
      const momGrowth = prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : 0;
      return { month: m, orders, momGrowth };
    });

    if (data.length === 0) return;

    const x = d3.scalePoint<string>().domain(months).range([margin.left, width - margin.right]).padding(0.5);
    const maxY = d3.max(data, d => d.orders) || 0;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([height - margin.bottom, margin.top]);

    const line = d3.line<typeof data[0]>()
      .x(d => x(d.month)!)
      .y(d => y(d.orders))
      .curve(d3.curveMonotoneX);

    const color = '#8b5cf6';

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', line);

    svg.selectAll('.dot-orders')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.month)!)
      .attr('cy', d => y(d.orders))
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
            content: `${d.month}${momText}\nOrders: ${formatNumber(d.orders)}`
          });
        }
      })
      .on('mouseleave', () => setTooltip(null));

    renderMomLabels(svg, data, x, margin.top - 8, theme);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr('color', c.axisLine)
      .selectAll('text')
      .attr('fill', c.axisText)
      .attr('font-size', '12px');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d => formatNumber(d as number)))
      .attr('color', c.axisLine)
      .selectAll('text')
      .attr('fill', c.axisText)
      .attr('font-size', '12px');
  }, [months, kpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Order Trend (Month-over-Month)</div>
      <div style={{ position: 'relative' }}>
        {months.length === 0 ? (
          <div style={{ color: 'rgba(128,128,128,0.6)', textAlign: 'center', padding: '50px' }}>No data</div>
        ) : (
          <svg ref={svgRef} width="100%" height="320" viewBox="0 0 700 320" style={{ overflow: 'visible' }} />
        )}
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x, top: tooltip.y, whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.transactionsByPayment) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const width = 560, height = 260;
    const pieCx = 130, pieCy = 130, pieOuter = 95, pieInner = 48;

    const data = Object.entries(kpisData.transactionsByPayment)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    if (data.length === 0) return;

    const colors = (label: string) => PAYMENT_COLORS[label] || '#94a3b8';
    const total = d3.sum(data, d => d.value);

    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(pieInner).outerRadius(pieOuter);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(pieInner).outerRadius(pieOuter + 10);

    const g = svg.append('g').attr('transform', `translate(${pieCx},${pieCy})`);

    g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => colors(d.data.label))
      .attr('stroke', c.pieStroke)
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover as any);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        setTooltip({ x: pieCx, y: pieCy - 40, content: `${d.data.label}\nOrders: ${formatNumber(d.data.value)}\n(${pct}%)` });
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(200).attr('d', arc as any);
        setTooltip(null);
      });

    g.selectAll('text.label')
      .data(pie(data).filter(d => (d.data.value / total) >= 0.05))
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('transform', d => `translate(${arc.centroid(d as any)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => `${((d.data.value / total) * 100).toFixed(0)}%`);

    const legendX = 255;
    const rowH = 22;
    const legendStartY = pieCy - (data.length * rowH) / 2;
    const legendGroup = svg.append('g').attr('transform', `translate(${legendX}, ${legendStartY})`);
    data.forEach((d, i) => {
      const pct = ((d.value / total) * 100).toFixed(1);
      legendGroup.append('rect').attr('x', 0).attr('y', i * rowH).attr('width', 11).attr('height', 11)
        .attr('fill', colors(d.label)).attr('rx', 2);
      legendGroup.append('text').attr('x', 17).attr('y', i * rowH + 9)
        .attr('fill', c.legendText).attr('font-size', '11px')
        .text(`${d.label}: ${formatNumber(d.value)} (${pct}%)`);
    });
  }, [activeView, selectedMonth, kpis, overallKpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Payment Method Distribution</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="260" viewBox="0 0 560 260" />
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.transactionsByProfile) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const height = 260;
    const pieRadius = 100;
    const pieCx = 140, pieCy = height / 2;
    const legendX = 280;

    const data = Object.entries(kpisData.transactionsByProfile)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));

    if (data.length === 0) return;

    const total = d3.sum(data, d => d.value);
    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(40).outerRadius(pieRadius);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(40).outerRadius(pieRadius + 12);

    const g = svg.append('g').attr('transform', `translate(${pieCx},${pieCy})`);

    g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => PROFILE_COLORS[d.data.label] || '#888')
      .attr('stroke', c.pieStroke)
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover as any);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        setTooltip({ x: pieCx, y: pieCy - 30, content: `${d.data.label}\n${formatNumber(d.data.value)} orders\n(${pct}%)` });
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(200).attr('d', arc as any);
        setTooltip(null);
      });

    g.selectAll('text.label')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('transform', d => `translate(${arc.centroid(d as any)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '13px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => `${((d.data.value / total) * 100).toFixed(0)}%`);

    const legendGroup = svg.append('g').attr('transform', `translate(${legendX}, ${pieCy - (data.length * 36) / 2})`);
    data.forEach((d, i) => {
      const pct = ((d.value / total) * 100).toFixed(1);
      legendGroup.append('rect').attr('x', 0).attr('y', i * 52).attr('width', 14).attr('height', 14)
        .attr('fill', PROFILE_COLORS[d.label] || '#888').attr('rx', 3);
      legendGroup.append('text').attr('x', 22).attr('y', i * 52 + 11)
        .attr('fill', c.legendText).attr('font-size', '13px').attr('font-weight', '600').text(d.label);
      legendGroup.append('text').attr('x', 22).attr('y', i * 52 + 28)
        .attr('fill', c.legendSub).attr('font-size', '11px')
        .text(`${formatNumber(d.value)} orders (${pct}%)`);
    });
  }, [activeView, selectedMonth, kpis, overallKpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Profile Distribution</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="260" viewBox="0 0 500 260" />
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const ServiceChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.revenueByService) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const width = 350, height = 300;
    const margin = { top: 32, right: 20, bottom: 40, left: 68 };
    const data = Object.entries(kpisData.revenueByService)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    if (data.length === 0) return;

    const minVal = d3.min(data, d => d.value) || 1;
    const maxVal = d3.max(data, d => d.value) || 1;
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLog().domain([minVal * 0.5, maxVal * 1.6]).range([height - margin.bottom, margin.top]);

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
        setTooltip({ x: x(d.label)! + x.bandwidth() / 2, y: y(d.value) - 10, content: `${d.label}\nRevenue: ${formatCurrency(d.value)}` });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', '#60a5fa');
        setTooltip(null);
      });

    svg.selectAll('text.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => x(d.label)! + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', c.barLabel)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => formatCompactCurrency(d.value));

    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
      .attr('color', c.axisLine)
      .selectAll('text').attr('fill', c.axisText).attr('font-size', '12px');

    const logMin = Math.log10(minVal * 0.5);
    const logMax = Math.log10(maxVal * 1.6);
    const yTicks = [0, 1, 2, 3].map(i => Math.pow(10, logMin + (logMax - logMin) * i / 3));

    svg.append('g').attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => formatCompactCurrency(d as number)))
      .attr('color', c.axisLine)
      .selectAll('text').attr('fill', c.axisText).attr('font-size', '11px');
  }, [activeView, selectedMonth, kpis, overallKpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Revenue by Service Type</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="300" viewBox="0 0 350 300" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const OrdersByServiceChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.transactionsByService) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const width = 350, height = 300;
    const margin = { top: 32, right: 20, bottom: 40, left: 56 };

    const data = Object.entries(kpisData.transactionsByService)
      .filter(([_, v]) => v > 0)
      .map(([label, orders]) => ({ label, orders }))
      .sort((a, b) => b.orders - a.orders);

    if (data.length === 0) return;

    const minVal = d3.min(data, d => d.orders) || 1;
    const maxVal = d3.max(data, d => d.orders) || 1;
    const x = d3.scaleBand().domain(data.map(d => d.label)).range([margin.left, width - margin.right]).padding(0.3);
    const y = d3.scaleLog().domain([minVal * 0.5, maxVal * 1.6]).range([height - margin.bottom, margin.top]);

    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.label)!)
      .attr('y', d => y(d.orders))
      .attr('width', x.bandwidth())
      .attr('height', d => height - margin.bottom - y(d.orders))
      .attr('fill', '#8b5cf6')
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('fill', '#a78bfa');
        setTooltip({ x: x(d.label)! + x.bandwidth() / 2, y: y(d.orders) - 10, content: `${d.label}\nOrders: ${formatNumber(d.orders)}` });
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', '#8b5cf6');
        setTooltip(null);
      });

    svg.selectAll('text.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', d => x(d.label)! + x.bandwidth() / 2)
      .attr('y', d => y(d.orders) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', c.barLabel)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => formatCompactNumber(d.orders));

    svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
      .attr('color', c.axisLine)
      .selectAll('text').attr('fill', c.axisText).attr('font-size', '12px');

    const logMin = Math.log10(minVal * 0.5);
    const logMax = Math.log10(maxVal * 1.6);
    const yTicks = [0, 1, 2, 3].map(i => Math.pow(10, logMin + (logMax - logMin) * i / 3));

    svg.append('g').attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat(d => formatCompactNumber(d as number)))
      .attr('color', c.axisLine)
      .selectAll('text').attr('fill', c.axisText).attr('font-size', '11px');
  }, [activeView, selectedMonth, kpis, overallKpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Orders by Service Type</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="300" viewBox="0 0 350 300" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

const PROMO_COLORS: Record<string, string> = {
  'No Promo': '#94a3b8',
  'Subscription': '#a78bfa',
  'AAPROREG': '#60a5fa',
  'AAPROSD': '#34d399',
  'PAKETBERAT': '#fbbf24',
  'MULAIKIRIM': '#f472b6',
};

const PromoChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
    if (!kpisData?.ordersByPromoCode) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const c = getD3Colors(theme);
    const width = 560, height = 300;
    const pieCx = 130, pieCy = 145, pieOuter = 105, pieInner = 52;

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
    const getColor = (label: string) => PROMO_COLORS[label] || colorScale(label);

    const data = Object.entries(kpisData.ordersByPromoCode as Record<string, number>)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    if (data.length === 0) return;

    const total = d3.sum(data, d => d.value);
    const pie = d3.pie<{ label: string; value: number }>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(pieInner).outerRadius(pieOuter);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>().innerRadius(pieInner).outerRadius(pieOuter + 10);

    const g = svg.append('g').attr('transform', `translate(${pieCx},${pieCy})`);

    g.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => getColor(d.data.label))
      .attr('stroke', c.pieStroke)
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover as any);
        const pct = ((d.data.value / total) * 100).toFixed(1);
        setTooltip({ x: pieCx, y: pieCy - 50, content: `${d.data.label}\nOrders: ${formatNumber(d.data.value)}\n(${pct}%)` });
      })
      .on('mouseleave', function() {
        d3.select(this).transition().duration(200).attr('d', arc as any);
        setTooltip(null);
      });

    g.selectAll('text.label')
      .data(pie(data).filter(d => (d.data.value / total) >= 0.04))
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('transform', d => `translate(${arc.centroid(d as any)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => `${((d.data.value / total) * 100).toFixed(0)}%`);

    const legendX = 255;
    const rowH = 22;
    const legendStartY = Math.max(10, pieCy - (data.length * rowH) / 2);
    const legendGroup = svg.append('g').attr('transform', `translate(${legendX}, ${legendStartY})`);
    data.forEach((d, i) => {
      const pct = ((d.value / total) * 100).toFixed(1);
      legendGroup.append('rect').attr('x', 0).attr('y', i * rowH).attr('width', 11).attr('height', 11)
        .attr('fill', getColor(d.label)).attr('rx', 2);
      legendGroup.append('text').attr('x', 17).attr('y', i * rowH + 9)
        .attr('fill', c.legendText).attr('font-size', '11px')
        .text(`${d.label}: ${formatNumber(d.value)} (${pct}%)`);
    });
  }, [activeView, selectedMonth, kpis, overallKpis, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Promo Code Distribution</div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="300" viewBox="0 0 560 300" />
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};

export { RevenueTrendChart, OrderTrendChart, PaymentChart, ProfileChart, ServiceChart, OrdersByServiceChart, ConcentrationChart, ItemCategoryChart, PromoChart };

const ConcentrationChart: React.FC = () => {
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);

  const kpisData = activeView === 'overall' ? overallKpis : (selectedMonth ? kpis[selectedMonth] : overallKpis);
  const isDark = theme === 'dark';

  if (!kpisData?.topCustomersByOrders || kpisData.topCustomersByOrders.length === 0) {
    return (
      <div style={getContainerStyle(theme)}>
        <div style={getTitleStyle(theme)}>Top 10 Customers by Order Count</div>
        <div style={{ color: 'rgba(128,128,128,0.6)', textAlign: 'center', padding: '50px' }}>No data</div>
      </div>
    );
  }

  const totalTransactions = kpisData.totalTransactions;
  const tableData = kpisData.topCustomersByOrders.map((customer, index) => ({
    rank: index + 1,
    customerId: customer.customerId,
    profileType: customer.profileType,
    orderCount: customer.orderCount,
    percentage: totalTransactions > 0 ? (customer.orderCount / totalTransactions) * 100 : 0,
  }));

  const headerCellStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'left',
    borderBottom: isDark ? '2px solid #243056' : '2px solid #e0e0e0',
    color: isDark ? '#aaaaaa' : '#666666',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.5px',
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: isDark ? '1px solid #1a2444' : '1px solid #e0e0e0',
    color: isDark ? '#ffffff' : '#000000',
  };

  const rankCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, color: '#60a5fa', width: '50px' };

  const badgeStyle = (profileType: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: isDark
      ? (profileType === 'AAPRO' ? '#1a3a5c' : '#1a3a2c')
      : (profileType === 'AAPRO' ? '#e0f2fe' : '#f0fdf4'),
    color: isDark
      ? (profileType === 'AAPRO' ? '#60a5fa' : '#4ade80')
      : (profileType === 'AAPRO' ? '#0369a1' : '#166534'),
  });

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>Top 10 Customers by Order Count</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={headerCellStyle}>Rank</th>
            <th style={headerCellStyle}>Customer ID</th>
            <th style={headerCellStyle}>Profile Type</th>
            <th style={headerCellStyle}>Order Count</th>
            <th style={headerCellStyle}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.customerId}>
              <td style={rankCellStyle}>{row.rank}</td>
              <td style={cellStyle}>{row.customerId}</td>
              <td style={cellStyle}><span style={badgeStyle(row.profileType)}>{row.profileType}</span></td>
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
  const { activeView, selectedMonth, theme } = useSelector((state: RootState) => state.ui);
  const { kpis, overallKpis } = useSelector((state: RootState) => state.computed);
  const { months } = useSelector((state: RootState) => state.data);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const c = getD3Colors(theme);

    if (activeView === 'monthly') {
      const kpisData = selectedMonth ? kpis[selectedMonth] : overallKpis;
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
          setTooltip({ x: x(d.label)! + x.bandwidth() / 2, y: y(d.orders) - 10, content: `${d.label}\nOrders: ${formatNumber(d.orders)}\nRevenue: ${formatCurrency(d.revenue)}` });
        })
        .on('mouseleave', function() {
          d3.select(this).attr('fill', '#60a5fa');
          setTooltip(null);
        });

      svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
        .attr('color', c.axisLine)
        .selectAll('text')
        .attr('fill', c.axisText)
        .attr('font-size', '12px')
        .attr('text-anchor', 'start')
        .attr('transform', 'rotate(45)')
        .attr('dx', '8px')
        .attr('dy', '4px');

      svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => formatNumber(d as number)))
        .attr('color', c.axisLine)
        .selectAll('text').attr('fill', c.axisText).attr('font-size', '12px');

    } else {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      if (months.length === 0) return;

      const cols = 3;
      const legendRowHeight = 22;
      const legendRows = Math.ceil(allCategoriesSorted.length / cols);
      const legendHeight = legendRows * legendRowHeight + 16;
      const width = 700, height = 380 + legendHeight;
      const margin = { top: 40, right: 20, bottom: 20 + legendHeight, left: 60 };

      const allCategories: Record<string, number> = {};
      months.forEach(m => {
        const monthKpis = kpis[m];
        if (monthKpis?.ordersByItemCategory) {
          Object.entries(monthKpis.ordersByItemCategory).forEach(([cat, count]) => {
            allCategories[cat] = (allCategories[cat] || 0) + count;
          });
        }
      });

      const allCategoriesSorted = Object.entries(allCategories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat);

      if (allCategoriesSorted.length === 0) return;

      const lineData = allCategoriesSorted.map(category => ({
        category,
        values: months.map(m => ({ month: m, orders: kpis[m]?.ordersByItemCategory[category] || 0 }))
      }));

      const x = d3.scalePoint<string>().domain(months).range([margin.left, width - margin.right]).padding(0.5);
      const maxY = d3.max(lineData, d => d3.max(d.values, v => v.orders)) || 0;
      const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([height - margin.bottom, margin.top]);
      const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(allCategoriesSorted);

      const line = d3.line<{ month: string; orders: number }>()
        .x(d => x(d.month)!)
        .y(d => y(d.orders))
        .curve(d3.curveMonotoneX);

      const slugify = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');

      const highlight = (cat: string) => {
        allCategoriesSorted.forEach(c2 => {
          const faded = c2 !== cat;
          svg.select(`.line-${slugify(c2)}`).attr('opacity', faded ? 0.1 : 1).attr('stroke-width', faded ? 1.5 : 3);
          svg.selectAll(`.dot-${slugify(c2)}`).attr('opacity', faded ? 0.1 : 1);
          svg.select(`.legend-item-${slugify(c2)}`).attr('opacity', faded ? 0.3 : 1);
        });
      };

      const resetHighlight = () => {
        allCategoriesSorted.forEach(c2 => {
          svg.select(`.line-${slugify(c2)}`).attr('opacity', 1).attr('stroke-width', 2);
          svg.selectAll(`.dot-${slugify(c2)}`).attr('opacity', 1);
          svg.select(`.legend-item-${slugify(c2)}`).attr('opacity', 1);
        });
      };

      lineData.forEach(catData => {
        const color = colors(catData.category) as string;
        const slug = slugify(catData.category);
        svg.append('path')
          .datum(catData.values)
          .attr('class', `line-${slug}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', line)
          .attr('cursor', 'pointer')
          .on('mouseenter', () => highlight(catData.category))
          .on('mouseleave', () => { resetHighlight(); setTooltip(null); });

        svg.selectAll(`.dot-${slug}`)
          .data(catData.values)
          .enter()
          .append('circle')
          .attr('class', `dot-${slug}`)
          .attr('cx', d => x(d.month)!)
          .attr('cy', d => y(d.orders))
          .attr('r', 4)
          .attr('fill', color)
          .attr('cursor', 'pointer')
          .on('mouseenter', (event, d) => {
            highlight(catData.category);
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 60, content: `${catData.category}\n${d.month}\nOrders: ${formatNumber(d.orders)}` });
          })
          .on('mouseleave', () => { resetHighlight(); setTooltip(null); });
      });

      svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
        .attr('color', c.axisLine)
        .selectAll('text').attr('fill', c.axisText).attr('font-size', '12px');

      svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => formatNumber(d as number)))
        .attr('color', c.axisLine)
        .selectAll('text').attr('fill', c.axisText).attr('font-size', '12px');

      const colWidth = Math.floor(width / cols);
      const legendY = height - margin.bottom + 36;
      allCategoriesSorted.forEach((cat, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const lx = col * colWidth;
        const ly = legendY + row * legendRowHeight;
        const slug = slugify(cat);
        const g = svg.append('g')
          .attr('class', `legend-item-${slug}`)
          .attr('transform', `translate(${lx}, ${ly})`)
          .attr('cursor', 'pointer')
          .on('mouseenter', () => highlight(cat))
          .on('mouseleave', resetHighlight);
        g.append('rect').attr('width', 12).attr('height', 12).attr('fill', colors(cat) as string);
        g.append('text').attr('x', 18).attr('y', 10)
          .text(cat.length > 22 ? cat.substring(0, 22) + '…' : cat)
          .attr('fill', c.legendText).attr('font-size', '11px');
      });
    }
  }, [activeView, selectedMonth, kpis, overallKpis, months, theme]);

  return (
    <div style={getContainerStyle(theme)}>
      <div style={getTitleStyle(theme)}>
        {activeView === 'overall' ? 'Item Categories - Trend' : 'Item Category Performance'}
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width="100%" viewBox="0 0 700 700" style={{ overflow: 'visible' }} />
        {tooltip && (
          <div style={{ ...getTooltipStyle(theme), left: tooltip.x - 60, top: tooltip.y, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  );
};
