
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function Budgets() {
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category_id: "",
    amount: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const [budgetResponse, categoryResponse] = await Promise.all([
        api.get("/budgets/", {
          params: {
            month,
            year,
            page: 1,
            page_size: 100,
          },
        }),
        api.get("/categories/", {
          params: { category_type: "expense" },
        }),
      ]);

      const budgetData = budgetResponse.data;
      const categoryData = categoryResponse.data;

      setBudgets(Array.isArray(budgetData) ? budgetData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);

      // Load all expense transactions for the selected month.
      let allTransactions = [];
      let page = 1;

      while (true) {
        const response = await api.get("/transactions/", {
          params: {
            transaction_type: "expense",
            start_date: startDate,
            end_date: endDate,
            page,
            page_size: 100,
          },
        });

        const rows = Array.isArray(response.data) ? response.data : [];
        allTransactions = [...allTransactions, ...rows];

        if (rows.length < 100) break;

        page += 1;
      }

      setTransactions(allTransactions);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load budget information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryMap = useMemo(() => {
    return Object.fromEntries(
      categories.map((category) => [
        category.id,
        category.name,
      ])
    );
  }, [categories]);

  const budgetCards = useMemo(() => {
    return budgets.map((budget) => {
      const spent = transactions
        .filter(
          (transaction) =>
            Number(transaction.category_id) === Number(budget.category_id)
        )
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0
        );

      const limit = Number(budget.amount);
      const remaining = limit - spent;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        ...budget,
        categoryName:
          categoryMap[budget.category_id] || "Unknown category",
        spent,
        remaining,
        percentage,
      };
    });
  }, [budgets, transactions, categoryMap]);

  const totalBudget = budgetCards.reduce(
    (total, budget) => total + Number(budget.amount),
    0
  );

  const totalSpent = budgetCards.reduce(
    (total, budget) => total + budget.spent,
    0
  );

  const totalRemaining = totalBudget - totalSpent;

  const openAddModal = () => {
    setEditingBudget(null);
    setForm({
      category_id: "",
      amount: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setForm({
      category_id: String(budget.category_id),
      amount: String(budget.amount),
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingBudget(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);
    const categoryId = Number(form.category_id);

    if (!categoryId) {
      setError("Please select an expense category.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid budget amount greater than zero.");
      return;
    }

    const payload = {
      category_id: categoryId,
      amount,
      month,
      year,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingBudget) {
        await api.patch(`/budgets/${editingBudget.id}`, payload);
        setSuccess("Budget updated successfully.");
      } else {
        await api.post("/budgets/", payload);
        setSuccess("Budget created successfully.");
      }

      setShowModal(false);
      setEditingBudget(null);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to save the budget. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget) => {
    const confirmed = window.confirm(
      `Delete the ${budget.categoryName} budget for ${MONTHS[month - 1]} ${year}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/budgets/${budget.id}`);
      setSuccess("Budget deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to delete this budget."
      );
    }
  };

  const availableCategories = categories.filter((category) => {
    if (editingBudget && category.id === editingBudget.category_id) {
      return true;
    }

    return !budgets.some(
      (budget) => Number(budget.category_id) === Number(category.id)
    );
  });

  const getProgressClass = (percentage) => {
    if (percentage >= 100) return "budget-progress-danger";
    if (percentage >= 80) return "budget-progress-warning";
    return "budget-progress-normal";
  };

  const changeMonth = (value) => {
    setMonth(Number(value));
    setSuccess("");
    setError("");
  };

  const changeYear = (value) => {
    setYear(Number(value));
    setSuccess("");
    setError("");
  };

  return (
    <div className="budgets-page">
      <div className="budgets-heading">
        <div>
          <h2>Budgets</h2>
          <p>Plan your monthly spending and track your expenses.</p>
        </div>

        <button className="budget-primary-btn" onClick={openAddModal}>
          + Add Budget
        </button>
      </div>

      <div className="budget-period">
        <div>
          <label htmlFor="budget-month">Month</label>
          <select
            id="budget-month"
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="budget-year">Year</label>
          <select
            id="budget-year"
            value={year}
            onChange={(event) => changeYear(event.target.value)}
          >
            {Array.from(
              { length: 11 },
              (_, index) => today.getFullYear() - 5 + index
            ).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && !showModal && (
        <div className="budget-alert budget-alert-error">{error}</div>
      )}

      {success && (
        <div className="budget-alert budget-alert-success">{success}</div>
      )}

      {loading ? (
        <div className="budget-empty">Loading budgets...</div>
      ) : (
        <>
          <div className="budget-summary-grid">
            <div className="budget-summary-card">
              <span>Total Budget</span>
              <h3>{formatCurrency(totalBudget)}</h3>
              <small>For {MONTHS[month - 1]} {year}</small>
            </div>

            <div className="budget-summary-card">
              <span>Total Spent</span>
              <h3>{formatCurrency(totalSpent)}</h3>
              <small>Actual expenses in budgeted categories</small>
            </div>

            <div className="budget-summary-card">
              <span>Remaining Budget</span>
              <h3 className={totalRemaining < 0 ? "budget-negative" : "budget-positive"}>
                {formatCurrency(totalRemaining)}
              </h3>
              <small>
                {totalRemaining < 0
                  ? "You have exceeded your total budget"
                  : "Available across your budgets"}
              </small>
            </div>
          </div>

          <div className="budget-section-heading">
            <div>
              <h3>Category Budgets</h3>
              <p>Your budget limits and actual spending.</p>
            </div>
            <span>{budgetCards.length} budgets</span>
          </div>

          {budgetCards.length === 0 ? (
            <div className="budget-empty">
              <h3>No budgets for this month</h3>
              <p>Create a budget to start tracking your monthly expenses.</p>
              <button className="budget-primary-btn" onClick={openAddModal}>
                Create Your First Budget
              </button>
            </div>
          ) : (
            <div className="budget-cards-grid">
              {budgetCards.map((budget) => (
                <div className="budget-card" key={budget.id}>
                  <div className="budget-card-top">
                    <div>
                      <h3>{budget.categoryName}</h3>
                      <span>Monthly budget</span>
                    </div>

                    <div className="budget-card-actions">
                      <button
                        type="button"
                        onClick={() => openEditModal(budget)}
                        title="Edit budget"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="budget-delete-btn"
                        onClick={() => handleDelete(budget)}
                        title="Delete budget"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="budget-amount-row">
                    <div>
                      <small>Spent</small>
                      <strong>{formatCurrency(budget.spent)}</strong>
                    </div>
                    <div className="budget-amount-right">
                      <small>Budget limit</small>
                      <strong>{formatCurrency(budget.amount)}</strong>
                    </div>
                  </div>

                  <div className="budget-progress-track">
                    <div
                      className={`budget-progress-fill ${getProgressClass(
                        budget.percentage
                      )}`}
                      style={{
                        width: `${Math.min(budget.percentage, 100)}%`,
                      }}
                    />
                  </div>

                  <div className="budget-progress-labels">
                    <span>{budget.percentage.toFixed(1)}% used</span>
                    <span className={budget.remaining < 0 ? "budget-negative" : ""}>
                      {budget.remaining < 0
                        ? `${formatCurrency(Math.abs(budget.remaining))} over budget`
                        : `${formatCurrency(budget.remaining)} remaining`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="budget-modal-backdrop" onClick={closeModal}>
          <div
            className="budget-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="budget-modal-header">
              <div>
                <h2>{editingBudget ? "Edit Budget" : "Add Budget"}</h2>
                <p>
                  Set your spending limit for {MONTHS[month - 1]} {year}.
                </p>
              </div>
              <button
                type="button"
                className="budget-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="budget-form-group">
                <label htmlFor="budget-category">Expense Category</label>
                <select
                  id="budget-category"
                  value={form.category_id}
                  onChange={(event) =>
                    setForm({ ...form, category_id: event.target.value })
                  }
                  required
                >
                  <option value="">Select category</option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="budget-form-group">
                <label htmlFor="budget-amount">Budget Amount (INR)</label>
                <input
                  id="budget-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter budget amount"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  required
                />
              </div>

              <div className="budget-form-group">
                <label>Budget Period</label>
                <input
                  type="text"
                  value={`${MONTHS[month - 1]} ${year}`}
                  disabled
                />
              </div>

              {error && (
                <div className="budget-alert budget-alert-error">
                  {error}
                </div>
              )}

              <div className="budget-modal-actions">
                <button
                  type="button"
                  className="budget-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="budget-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingBudget
                      ? "Update Budget"
                      : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budgets;
