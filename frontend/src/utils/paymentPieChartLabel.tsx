import { formatPaymentPieLine, type PaymentPieSlice } from './paymentPieData';

export const renderPaymentPieLabel = (props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  fill?: string;
  payload?: PaymentPieSlice;
  percent?: number;
  index?: number;
}) => {
  const RADIAN = Math.PI / 180;
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const midAngle = props.midAngle ?? 0;
  const innerRadius = props.innerRadius ?? 0;
  const outerRadius = props.outerRadius ?? 0;
  const fill = props.fill ?? '#333';
  const payload = props.payload;
  const percent = props.percent ?? 0;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 5) * cos;
  const sy = cy + (outerRadius + 5) * sin;
  const mx = cx + (outerRadius + 15) * cos;
  const my = cy + (outerRadius + 15) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 20;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} strokeWidth={1.5} fill="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey - 4} textAnchor={textAnchor} fill={fill} fontSize={14} fontWeight="bold">
        {payload?.name}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey + 14} textAnchor={textAnchor} fill="#888" fontSize={12} fontWeight="500">
        {payload ? formatPaymentPieLine(payload.orders, payload.amount) : ''}
      </text>
    </g>
  );
};
