import { ButtonLink } from '../components/common/Button'
import { PageContainer } from '../components/layout/PageContainer'
import './HomePage.css'

const operationSymbols = [
  { symbol: '+', className: 'home-page__tile--plus' },
  { symbol: '−', className: 'home-page__tile--minus' },
  { symbol: '×', className: 'home-page__tile--times' },
  { symbol: '÷', className: 'home-page__tile--divide' },
]

export function HomePage() {
  return (
    <PageContainer title="Hi there, math explorer!">
      <section className="home-page">
        <p className="home-page__welcome">
          Ready to practice adding, subtracting, multiplying and dividing? Pick
          your questions, flip the cards, and watch yourself get better every
          day!
        </p>

        <div className="home-page__tiles" aria-hidden="true">
          {operationSymbols.map(({ symbol, className }) => (
            <span key={symbol} className={`home-page__tile ${className}`}>
              {symbol}
            </span>
          ))}
        </div>

        <div className="home-page__actions">
          <ButtonLink
            to="/practice/setup"
            variant="success"
            size="lg"
            icon="🚀"
            className="home-page__start"
          >
            Start Practice
          </ButtonLink>
          <ButtonLink to="/statistics" variant="primary" size="lg" icon="📊">
            View Statistics
          </ButtonLink>
          <ButtonLink to="/settings" variant="purple" size="lg" icon="⚙️">
            Settings
          </ButtonLink>
        </div>
      </section>
    </PageContainer>
  )
}
