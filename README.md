# Personal Expense Tracker

A full-stack web application to manage personal finances by tracking income, expenses, budgets, and savings. The application provides interactive analytics and downloadable financial reports to help users understand and manage their spending.

## Project Overview

The Personal Expense Tracker is built using FastAPI, React, and MySQL. It allows registered users to securely manage their financial transactions and monitor their financial activities through a dashboard.

## Features

### Authentication
- User registration and login
- JWT-based authentication
- Secure password hashing
- User-specific data access

### Transaction Management
- Add income and expense transactions
- View transaction history
- Update and delete transactions
- Categorize financial transactions

### Category Management
- Create income and expense categories
- View, update, and delete categories

### Budget Management
- Create monthly budgets
- Set spending limits by category
- Monitor budget usage

### Dashboard and Analytics
- View total income and expenses
- Monitor current balance and savings
- View monthly financial trends
- Analyze category-wise spending
- Compare monthly financial performance
- View budget performance and spending insights

### Reports
- Export financial reports in CSV format
- Download Excel reports
- Generate PDF reports

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, JavaScript, HTML, CSS |
| Frontend tooling | Vite, Axios |
| Backend | Python, FastAPI |
| Database | MySQL |
| ORM | SQLAlchemy |
| Validation | Pydantic |
| Authentication | JWT |
| API Documentation | Swagger UI |

## Project Structure

```text
personal-expense-tracker/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── routers/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/kattaharika-1705/personal-expense-tracker.git
```

```bash
cd personal-expense-tracker
```

### 2. Backend Setup

Open a terminal inside the project folder.

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Database Configuration

- Install and start MySQL.
- Create a database named `personal_expense_db`.
- Configure your backend environment variables in `backend/.env`.
- Add the required database connection and JWT settings.
- Never upload your actual `.env` file or secrets to GitHub.

### 4. Run the Backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the frontend directory:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Security

- Passwords are stored using secure password hashing.
- Protected API endpoints use JWT authentication.
- User-specific financial records are isolated.
- Environment variables are used for sensitive configuration.
- Database operations use SQLAlchemy.

## API Modules

| Module | Functionality |
|---|---|
| Authentication | Registration, login, current user |
| Categories | Category CRUD operations |
| Transactions | Income and expense management |
| Budgets | Monthly budget management |
| Dashboard | Financial summaries and reports |
| Analytics | Trends, comparisons, and insights |

## Project Status

**Completed:** Core backend APIs, frontend modules, database integration, authentication, dashboard, analytics, budget management, and CSV, Excel, and PDF report exports have been implemented and tested.

## Future Improvements

- Automated recurring transactions
- Email notifications for budget limits
- Advanced financial visualizations
- Deployment to a cloud platform
- Mobile-responsive enhancements

## Author

**Katta Harika**

GitHub: https://github.com/kattaharika-1705

---

*This project was developed as a full-stack portfolio project to demonstrate practical skills in Python, FastAPI, React, MySQL, REST API development, and database integration.*