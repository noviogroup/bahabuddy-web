'use client'

interface BudgetItem {
  label: string
  amount: number
  color: string
  icon: string
}

interface Props {
  budgetEstimate: number | null
  budgetActual: number | null
  flightTotal: number
  hotelTotal: number
}

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function TripBudget({ budgetEstimate, budgetActual, flightTotal, hotelTotal }: Props) {
  const trackedTotal = flightTotal + hotelTotal
  const remaining = budgetEstimate != null ? budgetEstimate - trackedTotal : null
  const usedPct = budgetEstimate && budgetEstimate > 0
    ? Math.min(100, Math.round((trackedTotal / budgetEstimate) * 100))
    : 0

  const categories: BudgetItem[] = [
    { label: 'Flights', amount: flightTotal, color: 'bg-brand-500', icon: '✈️' },
    { label: 'Hotels', amount: hotelTotal, color: 'bg-purple-500', icon: '🏨' },
  ]

  const hasAnyData = flightTotal > 0 || hotelTotal > 0 || budgetEstimate != null

  if (!hasAnyData) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <div className="text-4xl mb-3">💰</div>
        <p className="text-gray-400 text-sm">No budget data yet — add flights and hotels in the Baha Buddy app to track spending.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Budget overview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">💰 Budget Overview</h2>

        {/* Progress bar */}
        {budgetEstimate && budgetEstimate > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Tracked spending</span>
              <span className="font-semibold text-gray-700">{usedPct}% of budget</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-yellow-400' : 'bg-brand-500'}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {budgetEstimate != null && (
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Total Budget</p>
              <p className="text-lg font-extrabold text-gray-900">{formatMoney(budgetEstimate)}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3.5">
            <p className="text-xs text-gray-400 mb-1">Tracked</p>
            <p className="text-lg font-extrabold text-gray-900">{formatMoney(trackedTotal)}</p>
          </div>
          {remaining != null && (
            <div className={`rounded-xl p-3.5 ${remaining < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-xs mb-1 ${remaining < 0 ? 'text-red-400' : 'text-gray-400'}`}>Remaining</p>
              <p className={`text-lg font-extrabold ${remaining < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatMoney(Math.abs(remaining))}
                {remaining < 0 && <span className="text-sm font-normal ml-1">over</span>}
              </p>
            </div>
          )}
          {budgetActual != null && (
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Actual Spent</p>
              <p className="text-lg font-extrabold text-gray-700">{formatMoney(budgetActual)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {(flightTotal > 0 || hotelTotal > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">📊 Spending Breakdown</h2>

          <div className="space-y-3">
            {categories
              .filter(c => c.amount > 0)
              .map((cat) => {
                const pct = trackedTotal > 0 ? Math.round((cat.amount / trackedTotal) * 100) : 0
                return (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{formatMoney(cat.amount)}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cat.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Activity tip */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">💡</span>
        <p className="text-sm text-brand-700">
          Activity costs aren't tracked yet. Open the Baha Buddy app to add dining, tours, and activities to your budget.
        </p>
      </div>
    </div>
  )
}
