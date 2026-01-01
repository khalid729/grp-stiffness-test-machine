import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTranslation } from 'react-i18next';

interface DataPoint {
  deflection: number;
  force: number;
}

interface ForceDeflectionChartProps {
  data: DataPoint[];
  targetDeflection?: number;
  className?: string;
}

export const ForceDeflectionChart = ({
  data,
  targetDeflection,
  className,
}: ForceDeflectionChartProps) => {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">{t('dashboard.forceVsDeflection')}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="deflection"
              label={{
                value: `${t('dashboard.deflection')} (mm)`,
                position: 'insideBottom',
                offset: -5,
              }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              label={{
                value: `${t('dashboard.force')} (kN)`,
                angle: -90,
                position: 'insideLeft',
              }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(value) => `${t('dashboard.deflection')}: ${value} mm`}
              formatter={(value: number) => [`${value.toFixed(2)} kN`, t('dashboard.force')]}
            />
            {targetDeflection && (
              <ReferenceLine
                x={targetDeflection}
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: '3%',
                  position: 'top',
                  fill: 'hsl(var(--warning))',
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="force"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
