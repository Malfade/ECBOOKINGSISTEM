interface SpinnerProps {
  variant?: 'page' | 'inline';
}

export function Spinner({ variant = 'page' }: SpinnerProps) {
  return <span className={`spinner spinner-${variant}`} aria-busy="true">Загрузка...</span>;
}
