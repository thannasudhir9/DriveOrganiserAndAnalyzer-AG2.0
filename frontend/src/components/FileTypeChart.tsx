import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { FileTypeSummary } from '../types';
import { formatBytes } from './DiskSelector';

interface FileTypeChartProps {
  data: FileTypeSummary[];
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Videos': '#f43f5e',   // neon rose
  'Audio': '#ec4899',    // neon pink
  'Images': '#e11d48',   // rose red
  'Documents': '#3b82f6',// neon blue
  'Archives': '#f59e0b', // amber
  'Code': '#14b8a6',     // teal
  'System': '#8b5cf6',   // violet
  'Others': '#64748b'    // slate
};

export const FileTypeChart: React.FC<FileTypeChartProps> = ({ data }) => {
  // Filter out empty categories and prepare for Recharts
  const chartData = React.useMemo(() => {
    return data
      .filter(item => item.size > 0)
      .map(item => ({
        ...item,
        // Add a field in MB/GB for visual scaling in Recharts
        displaySize: parseFloat((item.size / (1024 * 1024 * 1024)).toFixed(3)), // Size in GB
        formattedSize: formatBytes(item.size),
        color: CATEGORY_COLORS[item.category] || '#6366f1'
      }))
      .sort((a, b) => b.size - a.size);
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '0.5rem 0.75rem', 
            background: '#090f1e', 
            border: `1px solid ${item.color}`, 
            fontSize: '0.8rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.15rem' }}>{item.category}</p>
          <p style={{ color: item.color, fontWeight: 600 }}>Size: {item.formattedSize}</p>
          <p style={{ color: '#94a3b8' }}>Count: {item.count} files</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Storage by File Type</h3>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Distribution across primary extension categories.</p>
      </div>

      <div style={{ flex: 1, minHeight: '260px', width: '100%' }}>
        {chartData.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No file types detected.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Size (GB)', fill: '#64748b', fontSize: 10, position: 'bottom' }}
              />
              <YAxis 
                dataKey="category" 
                type="category" 
                tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar 
                dataKey="displaySize" 
                radius={[0, 4, 4, 0]}
                barSize={12}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
