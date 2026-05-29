import './NotifyDot.css';

type NotifyDotProps = {
  show?: boolean;
  title?: string;
  className?: string;
};

/** Chấm đỏ thông báo nhỏ (không hiển thị số). */
export default function NotifyDot({ show = false, title, className = '' }: NotifyDotProps) {
  if (!show) return null;
  return (
    <span
      className={`notify-dot ${className}`.trim()}
      aria-hidden={!title}
      aria-label={title}
      title={title}
    />
  );
}
