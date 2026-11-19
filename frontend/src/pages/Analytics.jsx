
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const shortCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
};

function Analytics() {
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { month, year };

      const [
        trends,
        categories,
        comparison,
        budgetPerformance,
        dailyTrends,
        spendingInsights,
        incomeInsights,
        savingsRate,
      ] = await Promise.all([
        api.get("/analytics/monthly-trends"),
        api.get("/analytics/category-spending"),
        api.get("/analytics/monthly-comparison"),
        api.get("/analytics/budget-performance", { params }),
        api.get("/analytics/daily-trends", { params }),
        api.get("/analytics/spending-insights", { params }),
        api.get("/analytics/income-insights", { params }),
        api.get("/analytics/savings-rate", { params }),
      ]);

      setData({
        trends: trends.data,
        categories: categories.data,
        comparison: comparison.data,
        budgetPerformance: budgetPerformance.data,
        dailyTrends: dailyTrends.data,
        spendingInsights: spendingInsights.data,
        incomeInsights: incomeInsights.data,
        savingsRate: savingsRate.data,
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load analytics. Please check your connection and try again."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const selectedMonthName = MONTHS[month - 1];

  const comparison = data?.comparison;
  const current = comparison?.current_month;
  const previous = comparison?.previous_month;
  const changes = comparison?.percentage_change;

  const savings = data?.savingsRate;
  const spending = data?.spendingInsights;
  const income = data?.incomeInsights;

  const monthlyItems = data?.trends?.monthly_trends || [];
  const categoryItems = data?.categories?.category_spending || [];
  const budgetItems =
    data?.budgetPerformance?.budget_performance || [];
  const dailyItems = data?.dailyTrends?.daily_trends || [];

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyItems.flatMap((item) => [
      Number(item.total_income || 0),
      Number(item.total_expenses || 0),
    ])
  );

  const maxCategoryValue = Math.max(
    1,
    ...categoryItems.map((item) => Number(item.total_spent || 0))
  );

  const maxDailyValue = Math.max(
    1,
    ...dailyItems.flatMap((item) => [
      Number(item.income || 0),
      Number(item.expenses || 0),
    ])
  );

  const changeLabel = (value) => {
    if (value === null || value === undefined) return "No previous data";
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${number.toFixed(1)}%`;
  };

  const changeClass = (value, inverse = false) => {
    if (value === null || value === undefined || Number(value) === 0) {
      return "analytics-neutral";
    }

    const positive = Number(value) > 0;
    return (positive !== inverse) ? "analytics-positive" : "analytics-negative";
  };

  return (
    <div className="analytics-page">
      <div className="analytics-heading">
        <div>
          <h2>Financial Analytics</h2>
          <p>Understand your income, expenses and savings patterns.</p>
        </div>

        <button
          className="analytics-refresh-btn"
          onClick={loadAnalytics}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      <div className="analytics-filters">
        <div>
          <label htmlFor="analytics-month">Month</label>
          <select
            id="analytics-month"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="analytics-year">Year</label>
          <select
            id="analytics-year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from(
              { length: 11 },
              (_, index) => today.getFullYear() - 5 + index
            ).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="analytics-error">
          {error}
          <button onClick={loadAnalytics}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="analytics-empty">Loading your financial analytics...</div>
      ) : data ? (
        <>
          {/* SAVINGS OVERVIEW */}
          <section className="analytics-section">
            <div className="analytics-section-heading">
              <div>
                <h3>{selectedMonthName} {year} Overview</h3>
                <p>Your income, expenses and savings for the selected month.</p>
              </div>
            </div>

            <div className="analytics-summary-grid">
              <div className="analytics-summary-card">
                <span>Total Income</span>
                <h3>{currency(savings?.total_income)}</h3>
                <small>{income?.income_transactions_count || 0} income transactions</small>
              </div>

              <div className="analytics-summary-card">
                <span>Total Expenses</span>
                <h3>{currency(savings?.total_expenses)}</h3>
                <small>{spending?.expense_transactions_count || 0} expense transactions</small>
              </div>

              <div className="analytics-summary-card">
                <span>Total Savings</span>
                <h3 className={
                  Number(savings?.total_savings || 0) >= 0
                    ? "analytics-positive-text"
                    : "analytics-negative-text"
                }>
                  {currency(savings?.total_savings)}
                </h3>
                <small>{savings?.status || "No data"}</small>
              </div>

              <div className="analytics-summary-card">
                <span>Savings Rate</span>
                <h3>
                  {savings?.savings_rate_percentage == null
                    ? "N/A"
                    : `${Number(savings.savings_rate_percentage).toFixed(2)}%`}
                </h3>
                <small>{savings?.status || "No data"}</small>
              </div>
            </div>
          </section>

          {/* MONTHLY TRENDS */}
          <section className="analytics-section analytics-panel">
            <div className="analytics-section-heading">
              <div>
                <h3>Monthly Trends</h3>
                <p>Income and expenses over the last six months.</p>
              </div>
              <span className="analytics-period-label">Last 6 months</span>
            </div>

            {monthlyItems.length === 0 ? (
              <p className="analytics-no-data">No monthly trend data available.</p>
            ) : (
              <>
                <div className="analytics-legend">
                  <span><i className="legend-income" /> Income</span>
                  <span><i className="legend-expense" /> Expenses</span>
                </div>

                <div className="monthly-chart">
                  {monthlyItems.map((item) => (
                    <div className="monthly-chart-column" key={`${item.year}-${item.month}`}>
                      <div className="monthly-bars">
                        <div
                          className="monthly-bar legend-income"
                          style={{
                            height: `${Math.max(2, Number(item.total_income || 0) / maxMonthlyValue * 160)}px`,
                          }}
                          title={`Income: ${currency(item.total_income)}`}
                        />
                        <div
                          className="monthly-bar legend-expense"
                          style={{
                            height: `${Math.max(2, Number(item.total_expenses || 0) / maxMonthlyValue * 160)}px`,
                          }}
                          title={`Expenses: ${currency(item.total_expenses)}`}
                        />
                      </div>
                      <span>{MONTHS[item.month - 1]?.slice(0, 3)} {String(item.year).slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* MONTHLY COMPARISON */}
          <section className="analytics-section analytics-panel">
            <div className="analytics-section-heading">
              <div>
                <h3>Monthly Comparison</h3>
                <p>Current calendar month compared with the previous month.</p>
              </div>
            </div>

            {current && previous ? (
              <div className="comparison-grid">
                {[
                  { key: "income", label: "Income", inverse: false },
                  { key: "expenses", label: "Expenses", inverse: true },
                  { key: "savings", label: "Savings", inverse: false },
                ].map((item) => (
                  <div className="comparison-card" key={item.key}>
                    <span>{item.label}</span>
                    <div className="comparison-values">
                      <div>
                        <small>{MONTHS[current.month - 1]}</small>
                        <strong>{currency(current[item.key])}</strong>
                      </div>
                      <div>
                        <small>{MONTHS[previous.month - 1]}</small>
                        <strong>{currency(previous[item.key])}</strong>
                      </div>
                    </div>
                    <div className={changeClass(changes?.[item.key], item.inverse)}>
                      {changeLabel(changes?.[item.key])} vs previous month
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="analytics-no-data">No comparison data available.</p>
            )}
          </section>

          {/* CATEGORY SPENDING */}
          <section className="analytics-section analytics-panel">
            <div className="analytics-section-heading">
              <div>
                <h3>Category Spending</h3>
                <p>All-time expenses grouped by category.</p>
              </div>
              <strong>{currency(data.categories?.total_expenses)}</strong>
            </div>

            {categoryItems.length === 0 ? (
              <p className="analytics-no-data">No expense category data available.</p>
            ) : (
              <div className="analytics-horizontal-list">
                {categoryItems.map((item) => (
                  <div className="category-analytics-row" key={item.category_id}>
                    <div className="category-analytics-info">
                      <strong>{item.category}</strong>
                      <span>{Number(item.percentage).toFixed(1)}%</span>
                    </div>
                    <div className="analytics-track">
                      <div
                        className="analytics-track-fill category-fill"
                        style={{
                          width: `${Math.min(Number(item.percentage), 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{currency(item.total_spent)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* BUDGET PERFORMANCE */}
          <section className="analytics-section analytics-panel">
            <div className="analytics-section-heading">
              <div>
                <h3>Budget Performance</h3>
                <p>Budget usage for {selectedMonthName} {year}.</p>
              </div>
              <span>{data.budgetPerformance?.budgets_count || 0} budgets</span>
            </div>

            {budgetItems.length === 0 ? (
              <p className="analytics-no-data">
                No budgets found for this month. Add a budget from the Budgets page.
              </p>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Remaining</th>
                      <th>Usage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetItems.map((item) => (
                      <tr key={item.category_id}>
                        <td>{item.category}</td>
                        <td>{currency(item.budget_amount)}</td>
                        <td>{currency(item.total_spent)}</td>
                        <td className={Number(item.remaining_budget) < 0 ? "analytics-negative-text" : ""}>
                          {currency(item.remaining_budget)}
                        </td>
                        <td>
                          <div className="table-usage">
                            <span>{Number(item.usage_percentage).toFixed(1)}%</span>
                            <div className="analytics-track">
                              <div
                                className={`analytics-track-fill ${
                                  item.status === "Over Budget"
                                    ? "usage-danger"
                                    : item.status === "Near Budget Limit"
                                      ? "usage-warning"
                                      : "usage-normal"
                                }`}
                                style={{
                                  width: `${Math.min(Number(item.usage_percentage), 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`budget-status ${
                            item.status === "Over Budget"
                              ? "status-danger"
                              : item.status === "Near Budget Limit"
                                ? "status-warning"
                                : "status-normal"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* DAILY TRENDS */}
          <section className="analytics-section analytics-panel">
            <div className="analytics-section-heading">
              <div>
                <h3>Daily Trends</h3>
                <p>Daily income and expenses for {selectedMonthName}.</p>
              </div>
            </div>

            {dailyItems.length === 0 ? (
              <p className="analytics-no-data">No daily data available.</p>
            ) : (
              <>
                <div className="analytics-legend">
                  <span><i className="legend-income" /> Income</span>
                  <span><i className="legend-expense" /> Expenses</span>
                </div>

                <div className="daily-chart">
                  {dailyItems.map((item) => (
                    <div className="daily-chart-column" key={item.day}>
                      <div className="daily-bars">
                        <div
                          className="daily-bar legend-income"
                          style={{
                            height: `${Math.max(2, Number(item.income || 0) / maxDailyValue * 110)}px`,
                          }}
                          title={`Day ${item.day} income: ${currency(item.income)}`}
                        />
                        <div
                          className="daily-bar legend-expense"
                          style={{
                            height: `${Math.max(2, Number(item.expenses || 0) / maxDailyValue * 110)}px`,
                          }}
                          title={`Day ${item.day} expenses: ${currency(item.expenses)}`}
                        />
                      </div>
                      <span>{item.day}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* SPENDING AND INCOME INSIGHTS */}
          <div className="analytics-insights-grid">
            <section className="analytics-panel analytics-insight-card">
              <h3>Spending Insights</h3>
              <p className="analytics-insight-subtitle">{selectedMonthName} {year}</p>

              <div className="insight-metric">
                <span>Average Expense</span>
                <strong>{currency(spending?.average_expense)}</strong>
              </div>
              <div className="insight-metric">
                <span>Largest Expense</span>
                <strong>{spending?.largest_expense
                  ? currency(spending.largest_expense.amount)
                  : "No data"}</strong>
              </div>
              <div className="insight-metric">
                <span>Top Spending Category</span>
                <strong>{spending?.top_spending_category?.category || "No data"}</strong>
              </div>
              {spending?.largest_expense && (
                <div className="analytics-largest-record">
                  <small>Largest expense description</small>
                  <strong>{spending.largest_expense.description || "No description"}</strong>
                  <small>{spending.largest_expense.date}</small>
                </div>
              )}
            </section>

            <section className="analytics-panel analytics-insight-card">
              <h3>Income Insights</h3>
              <p className="analytics-insight-subtitle">{selectedMonthName} {year}</p>

              <div className="insight-metric">
                <span>Average Income</span>
                <strong>{currency(income?.average_income)}</strong>
              </div>
              <div className="insight-metric">
                <span>Largest Income</span>
                <strong>{income?.largest_income
                  ? currency(income.largest_income.amount)
                  : "No data"}</strong>
              </div>
              <div className="insight-metric">
                <span>Top Income Category</span>
                <strong>{income?.top_income_category?.category || "No data"}</strong>
              </div>
              {income?.largest_income && (
                <div className="analytics-largest-record">
                  <small>Largest income description</small>
                  <strong>{income.largest_income.description || "No description"}</strong>
                  <small>{income.largest_income.date}</small>
                </div>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="analytics-empty">No analytics data to display.</div>
      )}
    </div>
  );
}

export default Analytics;
