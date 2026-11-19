
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

function formatAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? currency.format(amount) : "—";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN");
}

const emptyForm = {
  category_id: "",
  amount: "",
  type: "expense",
  description: "",
  date: today(),
};

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadTransactions() {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        page_size: pageSize,
      };

      if (type) params.transaction_type = type;
      if (categoryId) params.category_id = Number(categoryId);
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      if (startDate && endDate && startDate > endDate) {
        setError("Start date cannot be after end date.");
        setTransactions([]);
        return;
      }

      const [transactionResponse, categoryResponse] =
        await Promise.all([
          api.get("/transactions/", { params }),
          api.get("/categories/"),
        ]);

      setTransactions(
        Array.isArray(transactionResponse.data)
          ? transactionResponse.data
          : []
      );

      setCategories(
        Array.isArray(categoryResponse.data)
          ? categoryResponse.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to load transactions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [page, type, categoryId, startDate, endDate]);

  const categoryMap = useMemo(
    () => new Map(
      categories.map((category) => [
        category.id,
        category.name,
      ])
    ),
    [categories]
  );

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return transactions;

    return transactions.filter((item) => {
      const description = String(
        item.description || ""
      ).toLowerCase();

      const category = String(
        categoryMap.get(item.category_id) || ""
      ).toLowerCase();

      return (
        description.includes(term) ||
        category.includes(term)
      );
    });
  }, [transactions, search, categoryMap]);

  const visibleIncome = filteredTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const visibleExpenses = filteredTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function openAddModal() {
    setEditingTransaction(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(transaction) {
    setEditingTransaction(transaction);

    setForm({
      category_id: String(transaction.category_id),
      amount: String(transaction.amount),
      type: transaction.type,
      description: transaction.description || "",
      date: transaction.date,
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingTransaction(null);
    setForm(emptyForm);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "type" ? { category_id: "" } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (amount.toString().split(".")[1]?.length > 2) {
      setError("Amount can have at most two decimal places.");
      return;
    }

    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    const payload = {
      category_id: Number(form.category_id),
      amount: amount,
      type: form.type,
      description: form.description.trim() || null,
      date: form.date,
    };

    setSaving(true);

    try {
      if (editingTransaction) {
        await api.patch(
          `/transactions/${editingTransaction.id}`,
          payload
        );
        setSuccess("Transaction updated successfully.");
      } else {
        await api.post("/transactions/", payload);
        setSuccess("Transaction created successfully.");
      }

      setModalOpen(false);
      setEditingTransaction(null);
      setForm(emptyForm);

      // Return to first page to show the newest record.
      setPage(1);

      // Refresh the list after the operation.
      await refreshAfterSave();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to save transaction."
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshAfterSave() {
    try {
      const params = {
        page: 1,
        page_size: pageSize,
      };

      if (type) params.transaction_type = type;
      if (categoryId) params.category_id = Number(categoryId);
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get("/transactions/", { params });

      setTransactions(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Saved successfully, but refreshing the list failed."
      );
    }
  }

  async function handleDelete(transaction) {
    const confirmed = window.confirm(
      `Delete "${transaction.description || "this transaction"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(transaction.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/transactions/${transaction.id}`);

      setSuccess("Transaction deleted successfully.");

      // Refresh current page.
      const response = await api.get("/transactions/", {
        params: {
          page,
          page_size: pageSize,
          ...(type ? { transaction_type: type } : {}),
          ...(categoryId ? { category_id: Number(categoryId) } : {}),
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
        },
      });

      const updatedTransactions = Array.isArray(response.data)
        ? response.data
        : [];

      if (updatedTransactions.length === 0 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setTransactions(updatedTransactions);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Unable to delete transaction."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function resetFilters() {
    setSearch("");
    setType("");
    setCategoryId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  const availableCategories = categories.filter(
    (category) => category.type === form.type
  );

  return (
    <section className="transactions-page">
      <div className="transactions-heading">
        <div>
          <h2>Manage Transactions</h2>
          <p>Track, organize and manage your income and expenses.</p>
        </div>

        <div className="transactions-heading-actions">
          <button
            className="transaction-refresh"
            onClick={loadTransactions}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            className="add-transaction-button"
            onClick={openAddModal}
          >
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="transaction-stat-grid">
        <div className="transaction-stat-card">
          <span className="stat-icon total-icon">#</span>
          <div>
            <p>Visible records</p>
            <h3>{filteredTransactions.length}</h3>
          </div>
        </div>

        <div className="transaction-stat-card">
          <span className="stat-icon income-icon">↗</span>
          <div>
            <p>Visible income</p>
            <h3 className="income-text">
              {formatAmount(visibleIncome)}
            </h3>
          </div>
        </div>

        <div className="transaction-stat-card">
          <span className="stat-icon expense-icon">↘</span>
          <div>
            <p>Visible expenses</p>
            <h3 className="expense-text">
              {formatAmount(visibleExpenses)}
            </h3>
          </div>
        </div>
      </div>

      {success && (
        <div className="transaction-success">
          {success}
        </div>
      )}

      {error && (
        <div className="transaction-error">
          {error}
        </div>
      )}

      <div className="transaction-toolbar">
        <div className="transaction-search">
          <span>⌕</span>
          <input
            type="search"
            placeholder="Search description or category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={type}
          onChange={(event) => {
            setPage(1);
            setType(event.target.value);
            setCategoryId("");
          }}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={categoryId}
          onChange={(event) => {
            setPage(1);
            setCategoryId(event.target.value);
          }}
        >
          <option value="">All categories</option>
          {categories
            .filter((category) => !type || category.type === type)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>

        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(event) => {
            setPage(1);
            setStartDate(event.target.value);
          }}
        />

        <input
          type="date"
          aria-label="End date"
          value={endDate}
          onChange={(event) => {
            setPage(1);
            setEndDate(event.target.value);
          }}
        />

        <button
          className="clear-transaction-filters"
          onClick={resetFilters}
        >
          Clear
        </button>
      </div>

      <div className="transaction-table-card">
        <div className="transaction-table-heading">
          <div>
            <h3>All Transactions</h3>
            <p>Your recorded financial activity</p>
          </div>

          <span className="transaction-record-label">
            Page {page}
          </span>
        </div>

        {loading ? (
          <div className="transaction-empty">
            <div className="transaction-spinner" />
            <p>Loading your transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="transaction-empty">
            <div className="transaction-empty-icon">↔</div>
            <h3>No transactions found</h3>
            <p>Try changing your filters or add a new transaction.</p>
            <button
              className="add-transaction-button"
              onClick={openAddModal}
            >
              + Add Transaction
            </button>
          </div>
        ) : (
          <>
            <div className="transaction-table-scroll">
              <table className="professional-transaction-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map((item) => {
                    const isIncome = item.type === "income";

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="transaction-description">
                            <span className={`transaction-row-icon ${
                              isIncome ? "row-income" : "row-expense"
                            }`}>
                              {isIncome ? "↗" : "↘"}
                            </span>
                            <div>
                              <strong>
                                {item.description || "Untitled transaction"}
                              </strong>
                              <small>Transaction #{item.id}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="transaction-category">
                            {categoryMap.get(item.category_id) || "—"}
                          </span>
                        </td>

                        <td>{formatDate(item.date)}</td>

                        <td>
                          <span className={`transaction-type-badge ${
                            isIncome ? "badge-income" : "badge-expense"
                          }`}>
                            {item.type}
                          </span>
                        </td>

                        <td>
                          <strong className={
                            isIncome ? "income-text" : "expense-text"
                          }>
                            {isIncome ? "+" : "-"}
                            {formatAmount(Math.abs(Number(item.amount)))}
                          </strong>
                        </td>

                        <td>
                          <div className="transaction-action-buttons">
                            <button
                              className="edit-transaction-button"
                              onClick={() => openEditModal(item)}
                              title="Edit transaction"
                            >
                              Edit
                            </button>

                            <button
                              className="delete-transaction-button"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                              title="Delete transaction"
                            >
                              {deletingId === item.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="transaction-pagination">
              <span>Page {page}</span>

              <div>
                <button
                  disabled={page === 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>

                <button
                  disabled={transactions.length < pageSize || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div
          className="transaction-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <div className="transaction-modal-heading">
              <div>
                <h2 id="transaction-modal-title">
                  {editingTransaction
                    ? "Edit Transaction"
                    : "Add Transaction"}
                </h2>
                <p>
                  Enter the details of your financial activity.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Transaction type</label>

              <div className="transaction-type-selector">
                <button
                  type="button"
                  className={form.type === "expense" ? "selected-expense" : ""}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      type: "expense",
                      category_id: "",
                    }))
                  }
                >
                  Expense
                </button>

                <button
                  type="button"
                  className={form.type === "income" ? "selected-income" : ""}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      type: "income",
                      category_id: "",
                    }))
                  }
                >
                  Income
                </button>
              </div>

              <label htmlFor="transaction-amount">Amount (INR)</label>
              <input
                id="transaction-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                max="9999999999.99"
                placeholder="Enter amount"
                value={form.amount}
                onChange={handleFormChange}
                required
              />

              <label htmlFor="transaction-category">Category</label>
              <select
                id="transaction-category"
                name="category_id"
                value={form.category_id}
                onChange={handleFormChange}
                required
              >
                <option value="">Select category</option>

                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {availableCategories.length === 0 && (
                <p className="transaction-form-hint">
                  No {form.type} categories found. Create a matching
                  category before adding this transaction.
                </p>
              )}

              <label htmlFor="transaction-description">
                Description
              </label>
              <input
                id="transaction-description"
                name="description"
                type="text"
                maxLength="1000"
                placeholder="e.g. Monthly salary"
                value={form.description}
                onChange={handleFormChange}
              />

              <label htmlFor="transaction-date">Date</label>
              <input
                id="transaction-date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleFormChange}
                required
              />

              {error && (
                <div className="transaction-error">
                  {error}
                </div>
              )}

              <div className="transaction-modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="add-transaction-button"
                  disabled={saving || availableCategories.length === 0}
                >
                  {saving
                    ? "Saving..."
                    : editingTransaction
                      ? "Save Changes"
                      : "Create Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Transactions;
