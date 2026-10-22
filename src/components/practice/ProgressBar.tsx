import './ProgressBar.css'

interface ProgressBarProps {
  completed: number
  total: number
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, (completed / total) * 100) : 0
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label="Session progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
      aria-valuetext={`${completed} of ${total} questions done`}
    >
      <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
