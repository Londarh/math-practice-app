import { useAppData } from '../../hooks/useAppData'
import { Button } from './Button'
import './StorageWarning.css'

/** A friendly banner shown when progress could not be loaded or saved. */
export function StorageWarning() {
  const { storageWarning, dismissStorageWarning } = useAppData()
  if (!storageWarning) return null
  return (
    <div className="storage-warning" role="status">
      <p>
        <span aria-hidden="true">💾 </span>
        {storageWarning}
      </p>
      <Button variant="secondary" onClick={dismissStorageWarning}>
        OK
      </Button>
    </div>
  )
}
