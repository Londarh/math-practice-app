import { useId, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { PageContainer } from '../components/layout/PageContainer'
import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { useAppData } from '../hooks/useAppData'
import {
  MAX_MASTERY_THRESHOLD,
  MIN_MASTERY_THRESHOLD,
} from '../services/defaultSettings'
import type { MathOperation } from '../types/question'
import type { AppSettings } from '../types/settings'
import { isMasteryThreshold } from '../utils/validation'
import '../components/practice/SetupOptions.css'
import './SettingsPage.css'

type ToggleKey = 'soundEnabled' | 'cardAnimationEnabled' | 'showExplanations'

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  {
    key: 'soundEnabled',
    label: 'Sound effects',
    description: 'Play a short sound after you say how you did.',
  },
  {
    key: 'cardAnimationEnabled',
    label: 'Card animation',
    description: 'Turn the card over with a flip instead of switching sides.',
  },
  {
    key: 'showExplanations',
    label: 'Show explanations',
    description: 'Show a short hint on the back of each card.',
  },
]

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const descriptionId = useId()
  return (
    <label className="toggle-setting">
      <span className="toggle-setting__text">
        <span className="toggle-setting__label">{label}</span>
        <span id={descriptionId} className="toggle-setting__description">
          {description}
        </span>
      </span>
      <input
        className="toggle-setting__input"
        type="checkbox"
        role="switch"
        checked={checked}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-setting__switch" aria-hidden="true" />
    </label>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSettings, clearAllData } = useAppData()
  // Shown while editing; only valid values are saved.
  const [operations, setOperations] = useState<MathOperation[]>(
    settings.defaultOperations,
  )
  const [threshold, setThreshold] = useState(String(settings.masteryThreshold))
  const [confirmingClear, setConfirmingClear] = useState(false)
  const thresholdId = useId()
  const thresholdHintId = useId()

  const save = (changes: Partial<AppSettings>) => updateSettings(changes)

  function changeOperations(next: MathOperation[]) {
    setOperations(next)
    if (next.length > 0) save({ defaultOperations: next })
  }

  function changeThreshold(event: ChangeEvent<HTMLInputElement>) {
    setThreshold(event.target.value)
    const value = Number(event.target.value)
    if (event.target.value !== '' && isMasteryThreshold(value)) {
      save({ masteryThreshold: value })
    }
  }

  const thresholdValid =
    threshold !== '' && isMasteryThreshold(Number(threshold))

  return (
    <PageContainer title="Settings">
      <div className="settings-page">
        <p className="settings-page__intro">
          <span aria-hidden="true">💾 </span>
          Changes are saved automatically.
        </p>

        <section className="settings-section" aria-labelledby="general-heading">
          <h2 id="general-heading" className="settings-section__title">
            Practice
          </h2>
          {TOGGLES.map((toggle) => (
            <ToggleSetting
              key={toggle.key}
              label={toggle.label}
              description={toggle.description}
              checked={settings[toggle.key]}
              onChange={(checked) => save({ [toggle.key]: checked })}
            />
          ))}
        </section>

        <section
          className="settings-section"
          aria-labelledby="defaults-heading"
        >
          <h2 id="defaults-heading" className="settings-section__title">
            Starting choices
          </h2>
          <p className="settings-section__hint">
            The practice setup page starts with these. You can still change them
            for any session.
          </p>
          <OperationSelector
            value={operations}
            onChange={changeOperations}
            legend="Default operations"
            hint={
              operations.length === 0
                ? 'Pick at least one operation. Your last choice is still saved.'
                : 'Choose one or more.'
            }
          />
          <DifficultySelector
            value={settings.defaultDifficulty}
            onChange={(defaultDifficulty) => save({ defaultDifficulty })}
            legend="Default level"
            hint="The level picked when you open practice setup."
          />
          <SessionLengthSelector
            value={settings.defaultSessionLength}
            onChange={(defaultSessionLength) => save({ defaultSessionLength })}
            legend="Default session length"
            hint="How many questions a session has, unless you pick another."
          />
        </section>

        <section
          className="settings-section"
          aria-labelledby="mistakes-heading"
        >
          <h2 id="mistakes-heading" className="settings-section__title">
            Mistake review
          </h2>
          <div className="settings-field">
            <label htmlFor={thresholdId} className="settings-field__label">
              Correct similar answers needed to master a mistake
            </label>
            <input
              id={thresholdId}
              className="settings-field__input"
              type="number"
              inputMode="numeric"
              min={MIN_MASTERY_THRESHOLD}
              max={MAX_MASTERY_THRESHOLD}
              step={1}
              value={threshold}
              aria-invalid={!thresholdValid}
              aria-describedby={thresholdHintId}
              onChange={changeThreshold}
              onBlur={() =>
                !thresholdValid &&
                setThreshold(String(settings.masteryThreshold))
              }
            />
            <p
              id={thresholdHintId}
              className={
                thresholdValid
                  ? 'settings-field__hint'
                  : 'settings-field__hint settings-field__hint--error'
              }
              aria-live="polite"
            >
              {thresholdValid
                ? 'After this many right answers to similar questions, a mistake counts as mastered.'
                : `Please enter a whole number from ${MIN_MASTERY_THRESHOLD} to ${MAX_MASTERY_THRESHOLD}.`}
            </p>
          </div>
        </section>

        <section
          className="settings-section settings-section--danger"
          aria-labelledby="data-heading"
        >
          <h2 id="data-heading" className="settings-section__title">
            Your data
          </h2>
          <p className="settings-section__hint">
            Erase all settings, practice history, statistics and saved mistakes
            on this device.
          </p>
          <div>
            <Button
              variant="secondary"
              icon="⚠️"
              onClick={() => setConfirmingClear(true)}
            >
              Clear All Application Data
            </Button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmingClear}
        title="Erase everything?"
        message="This deletes all your settings, practice history, statistics and saved mistakes on this device. It cannot be undone."
        confirmLabel="Yes, erase everything"
        cancelLabel="No, keep my data"
        onConfirm={() => {
          clearAllData()
          setConfirmingClear(false)
          navigate('/')
        }}
        onCancel={() => setConfirmingClear(false)}
      />
    </PageContainer>
  )
}
