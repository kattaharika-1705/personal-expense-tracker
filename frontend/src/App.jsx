
import { useEffect, useState } from "react";
import api from "./services/api";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import "./App.css";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatAmount(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? currency.format(amount) : "—";
}

function getTransactions(data) {
  if (Array.isArray(data)) return data;

  return (
    data?.transactions ??
    data?.recent_transactions ??
    data?.items ??
    []
  );
}

function getErrorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("access_token")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  const [activePage, setActivePage] = useState("dashboard");

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [userResponse, summaryResponse, recentResponse] =
        await Promise.all([
          api.get("/auth/me"),
          api.get("/dashboard/summary"),
          api.get("/dashboard/recent-transactions", {
            params: { limit: 5 },
          }),
        ]);

      setUser(userResponse.data);
      setSummary(summaryResponse.data);
      setTransactions(getTransactions(recentResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));

      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [token]);

  async function handleLogin(event) {
    event.preventDefault();

    setLoginLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);
      formData.append("grant_type", "password");

      const response = await api.post(
        "/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      setToken(response.data.access_token);
      setPassword("");
      setActivePage("dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");

    setToken(null);
    setUser(null);
    setSummary(null);
    setTransactions([]);
    setPassword("");
    setError("");
    setActivePage("dashboard");
  }

  const pageTitles = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    categories: "Categories",
    budgets: "Budgets",
    analytics: "Analytics",
    reports: "Reports",
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand-icon">₹</div>

          <h1>Welcome back</h1>

          <p className="muted">
            Sign in to manage your personal finances.
          </p>

          <form onSubmit={handleLogin}>
            <label>Email address</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="primary-button login-button"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-footer">
            Personal Expense Tracker
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        Loading your financial dashboard...
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">₹</div>
          <span>ExpenseFlow</span>
        </div>

        <p className="nav-heading">MENU</p>

        <nav className="navigation">
          <button
            className={`nav-item ${
              activePage === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("dashboard")}
          >
            <span>▦</span> Dashboard
          </button>

          <button
            className={`nav-item ${
              activePage === "transactions" ? "active" : ""
            }`}
            onClick={() => setActivePage("transactions")}
          >
            <span>↔</span> Transactions
          </button>

          <button
            className={`nav-item ${
              activePage === "categories" ? "active" : ""
            }`}
            onClick={() => setActivePage("categories")}
          >
            <span>◈</span> Categories
          </button>

          <button
            className={`nav-item ${
              activePage === "budgets" ? "active" : ""
            }`}
            onClick={() => setActivePage("budgets")}
          >
            <span>▤</span> Budgets
          </button>

          <button
            className={`nav-item ${
              activePage === "analytics" ? "active" : ""
            }`}
            onClick={() => setActivePage("analytics")}
          >
            <span>▥</span> Analytics
          </button>

          <button
  className={`nav-item ${
    activePage === "reports" ? "active" : ""
  }`}
  onClick={() => setActivePage("reports")}
>
  <span>▤</span> Reports
</button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="user-details">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email || ""}</span>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Sign out"
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Pages / {pageTitles[activePage]}
            </p>

            <h1>{pageTitles[activePage]}</h1>
          </div>

          <div className="topbar-right">
            <span className="welcome-text">
              Welcome, {user?.name || "User"}
            </span>

            {activePage === "dashboard" && (
              <button
                className="refresh-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="error-message dashboard-error">
            {error}
          </div>
        )}

        {activePage === "dashboard" && (
          <>
            <section className="welcome-banner">
              <div>
                <p className="banner-label">
                  FINANCIAL OVERVIEW
                </p>

                <h2>Your money, clearly managed.</h2>

                <p>
                  Track your income, expenses and financial progress.
                </p>
              </div>

              <div className="banner-symbol">₹</div>
            </section>

            <section className="summary-grid">
              <div className="summary-card">
                <div className="card-heading">
                  <span>Total Balance</span>
                  <span className="card-icon blue">₹</span>
                </div>

                <h2>
                  {formatAmount(summary?.current_balance)}
                </h2>

                <p>Current account balance</p>
              </div>

              <div className="summary-card">
                <div className="card-heading">
                  <span>Total Income</span>
                  <span className="card-icon green">↗</span>
                </div>

                <h2>
                  {formatAmount(summary?.total_income)}
                </h2>

                <p>Total recorded income</p>
              </div>

              <div className="summary-card">
                <div className="card-heading">
                  <span>Total Expenses</span>
                  <span className="card-icon red">↘</span>
                </div>

                <h2>
                  {formatAmount(summary?.total_expenses)}
                </h2>

                <p>Total recorded expenses</p>
              </div>
            </section>

            <section className="content-card">
              <div className="section-header">
                <div>
                  <h2>Recent Transactions</h2>
                  <p>
                    Your latest recorded financial activity
                  </p>
                </div>

                <span className="record-count">
                  {transactions.length} records
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">↔</div>

                  <h3>No transactions found</h3>

                  <p>
                    Your recorded transactions will appear here.
                  </p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((item, index) => {
                        const type = String(
                          item.type || item.transaction_type || ""
                        ).toLowerCase();

                        const isIncome = type === "income";

                        return (
                          <tr
                            key={
                              item.id ??
                              item.transaction_id ??
                              index
                            }
                          >
                            <td className="description-cell">
                              {item.description || "Transaction"}
                            </td>

                            <td>
                              {item.category_name ||
                                item.category?.name ||
                                item.category ||
                                "—"}
                            </td>

                            <td>
                              {item.date
                                ? new Date(
                                    item.date
                                  ).toLocaleDateString("en-IN")
                                : "—"}
                            </td>

                            <td>
                              <span
                                className={`type-pill ${
                                  isIncome
                                    ? "income-pill"
                                    : "expense-pill"
                                }`}
                              >
                                {type || "—"}
                              </span>
                            </td>

                            <td
                              className={
                                isIncome
                                  ? "income-text"
                                  : "expense-text"
                              }
                            >
                              {item.amount === undefined ||
                              item.amount === null
                                ? "—"
                                : `${isIncome ? "+" : "-"}${formatAmount(
                                    Math.abs(Number(item.amount))
                                  )}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <footer className="footer">
              Personal Expense Tracker · Financial overview
            </footer>
          </>
        )}

        {activePage === "transactions" && (
          <Transactions />
        )}

        {activePage === "categories" && (
  <Categories />
)}

        {activePage === "budgets" && (
  <Budgets />
)}

        {activePage === "analytics" && (
  <Analytics />
)}

{activePage === "reports" && (
  <Reports />
)}

      </main>
    </div>
  );
}

export default App;
