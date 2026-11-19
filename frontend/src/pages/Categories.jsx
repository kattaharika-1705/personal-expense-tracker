
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

function getErrorMessage(error) {
  return (
    error.response?.data?.detail ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

const categoryIcons = {
  Food: "🍔",
  Transportation: "🚗",
  Rent: "🏠",
  Shopping: "🛍️",
  Utilities: "💡",
  Healthcare: "🏥",
  Entertainment: "🎬",
  Education: "📚",
  Travel: "✈️",
  "Personal Care": "💇",
  Salary: "💰",
  Freelance: "💻",
  Business: "🏢",
  Investments: "📈",
  Interest: "🏦",
  Gifts: "🎁",
  Bonus: "⭐",
  "Rental Income": "🏘️",
  Commission: "🤝",
  "Other Income": "💵",
};

function getCategoryIcon(name, type) {
  return categoryIcons[name] || (type === "income" ? "↗" : "↘");
}

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/categories/");
      setCategories(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesType =
        filter === "all" || category.type === filter;

      const matchesSearch = category.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [categories, filter, search]);

  const incomeCount = categories.filter(
    (category) => category.type === "income"
  ).length;

  const expenseCount = categories.filter(
    (category) => category.type === "expense"
  ).length;

  function openAddModal() {
    setEditingCategory(null);
    setName("");
    setType("expense");
    setError("");
    setShowModal(true);
  }

  function openEditModal(category) {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingCategory(null);
    setName("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Category name must contain at least 2 characters.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.type === type &&
        category.id !== editingCategory?.id
    );

    if (duplicate) {
      setError("This category already exists.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: trimmedName,
        type,
      };

      if (editingCategory) {
        await api.patch(
          `/categories/${editingCategory.id}`,
          payload
        );
        setSuccess("Category updated successfully.");
      } else {
        await api.post("/categories/", payload);
        setSuccess("Category created successfully.");
      }

      setShowModal(false);
      setEditingCategory(null);
      setName("");

      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/categories/${category.id}`);

      setSuccess(
        `"${category.name}" was deleted successfully.`
      );

      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="categories-page">

      {/* Page heading */}
      <div className="categories-intro">
        <div>
          <span className="categories-eyebrow">
            FINANCIAL MANAGEMENT
          </span>
          <h2>Categories</h2>
          <p>
            Organize and manage your income and expenses.
          </p>
        </div>

        <button
          className="primary-button category-create-btn"
          onClick={openAddModal}
        >
          + Add Category
        </button>
      </div>

      {/* Error and success messages */}
      {error && !showModal && (
        <div className="category-alert category-error">
          <span>⚠</span>
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="category-alert category-success">
          <span>✓</span>
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {/* Summary cards */}
      <section className="category-summary-grid">

        <div className="category-summary-card total-card">
          <div className="summary-card-top">
            <span>Total Categories</span>
            <div className="summary-icon total-icon">▦</div>
          </div>
          <strong>{loading ? "—" : categories.length}</strong>
          <small>All saved categories</small>
        </div>

        <div className="category-summary-card income-summary">
          <div className="summary-card-top">
            <span>Income Categories</span>
            <div className="summary-icon income-icon">↗</div>
          </div>
          <strong>{loading ? "—" : incomeCount}</strong>
          <small>Money you receive</small>
        </div>

        <div className="category-summary-card expense-summary">
          <div className="summary-card-top">
            <span>Expense Categories</span>
            <div className="summary-icon expense-icon">↘</div>
          </div>
          <strong>{loading ? "—" : expenseCount}</strong>
          <small>Money you spend</small>
        </div>

      </section>

      {/* Category list */}
      <section className="content-card categories-content-card">

        <div className="categories-toolbar">
          <div>
            <h2>Your Categories</h2>
            <p>Manage your saved financial categories.</p>
          </div>

          <input
            className="category-search"
            type="search"
            placeholder="Search categories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="category-filters">
          {[
            { value: "all", label: "All Categories" },
            { value: "income", label: "Income" },
            { value: "expense", label: "Expenses" },
          ].map((item) => (
            <button
              key={item.value}
              className={`category-filter ${
                filter === item.value ? "selected" : ""
              }`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span>
                {item.value === "all"
                  ? categories.length
                  : categories.filter(
                      (category) => category.type === item.value
                    ).length}
              </span>
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="category-loading">
            <div className="category-spinner"></div>
            <p>Loading your categories...</p>
          </div>

        ) : filteredCategories.length === 0 ? (

          /* Empty state */
          <div className="category-empty">
            <div className="category-empty-icon">▦</div>
            <h3>No categories found</h3>
            <p>
              {search
                ? "Try changing your search or filter."
                : "Start organizing your finances by adding a category."}
            </p>

            {!search && (
              <button
                className="primary-button"
                onClick={openAddModal}
              >
                + Create Category
              </button>
            )}
          </div>

        ) : (

          /* Category rows */
          <div className="category-list">

            {filteredCategories.map((category) => (
              <div className="category-item" key={category.id}>

                <div className="category-item-info">
                  <div
                    className={`category-symbol ${
                      category.type === "income"
                        ? "income-symbol"
                        : "expense-symbol"
                    }`}
                  >
                    {getCategoryIcon(category.name, category.type)}
                  </div>

                  <div className="category-details">
                    <strong>{category.name}</strong>
                    <span className="category-id">
                      Category #{category.id}
                    </span>
                  </div>
                </div>

                <div className="category-item-right">
                  <span
                    className={`type-pill ${
                      category.type === "income"
                        ? "income-pill"
                        : "expense-pill"
                    }`}
                  >
                    {category.type === "income" ? "Income" : "Expense"}
                  </span>

                  <div className="category-actions">
                    <button
                      className="category-edit-btn"
                      onClick={() => openEditModal(category)}
                    >
                      Edit
                    </button>

                    <button
                      className="category-delete-btn"
                      onClick={() => handleDelete(category)}
                      disabled={deletingId === category.id}
                    >
                      {deletingId === category.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>

              </div>
            ))}

          </div>
        )}

        {!loading && filteredCategories.length > 0 && (
          <div className="category-list-footer">
            Showing {filteredCategories.length} of {categories.length} categories
          </div>
        )}

      </section>

      {/* Add / Edit Category modal */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={closeModal}
        >
          <div
            className="transaction-modal category-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editingCategory ? "Edit Category" : "Add Category"}
                </h2>
                <p>
                  {editingCategory
                    ? "Update your category details."
                    : "Enter the details of your new category."}
                </p>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label htmlFor="category-name">
                  Category Name
                </label>

                <input
                  id="category-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter category name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category-type">
                  Category Type
                </label>

                <select
                  id="category-type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCategory
                    ? "Save Changes"
                    : "Create Category"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Categories;
