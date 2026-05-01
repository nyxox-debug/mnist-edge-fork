"use client";

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface BarChartProps {
  probabilities: number[];
}

const BarChart: React.FC<BarChartProps> = ({ probabilities }) => {
  // Format the probabilities for Recharts
  const data = probabilities.map((prob, index) => ({
    name: index.toString(),
    value: prob,
  }));

  // Check if we have real inference data (not just initial zeros)
  const hasData = probabilities.some(p => p > 0);

  return (
    <div 
      className={`w-full aspect-square lg:aspect-auto lg:h-[350px] flex flex-col justify-center overflow-hidden bg-black border-2 border-emerald-500/30 p-4 rounded-md shadow-lg shadow-emerald-500/10 transition-opacity duration-300 ${!hasData ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <RechartsBarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
          <XAxis 
            type="number" 
            domain={[0, 1]} 
            hide 
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            tick={{ fill: '#00FF41', fontSize: 14, fontWeight: 'bold' }} 
            width={35}
          />
          {hasData && (
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ backgroundColor: '#000', borderColor: '#10b981', borderRadius: '4px' }}
              itemStyle={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: '#00FF41', marginBottom: '4px', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', paddingBottom: '2px' }}
              labelFormatter={(label) => `DIGIT: ${label}`}
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              formatter={(value: any) => {
                // Safely handle undefined or non-number values from Recharts payload
                const numValue = typeof value === 'number' ? value : 0;
                return [`${(numValue * 100).toFixed(2)}%`, 'CONFIDENCE'];
              }}
            />
          )}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={hasData}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.value > 0.5 ? '#10b981' : '#065f46'} 
              />
            ))}
          </Bar>
          </RechartsBarChart>
          </ResponsiveContainer>
          </div>
          </div>
          );
          };
export default BarChart;
