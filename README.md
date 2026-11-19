# Personal Expense Tracker

A full-stack web application for managing personal income, expenses, budgets, and financial reports.

## Features

- User registration and login
- Secure password hashing and JWT authentication
- Income and expense management
- Category management
- Monthly budget tracking
- Financial dashboard
- Analytics and spending insights
- Savings rate calculations
- CSV, Excel, and PDF report exports
- User-specific data access

## Technologies Used

### Backend
- Python
- FastAPI
- SQLAlchemy
- MySQL
- Pydantic
- JWT Authentication

### Frontend
- React
- Vite
- JavaScript
- Axios
- CSS

## Project Structure

```text
personal-expense-tracker/
├── backend/
│   ├── app/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URL: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

## Frontend Setup

Open another terminal:

```powershell
cd frontend
npm install
```

Create a frontend `.env` file containing:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```powershell
npm run dev
```

Frontend URL: http://localhost:5173

## Database

This application uses MySQL. Create the database and configure your backend `.env` file with the required database and authentication settings.

Never upload `.env` files or passwords to GitHub.

## Project Status

Core backend APIs, frontend modules, database checks, and report exports have been tested.

## Author

Personal Expense Tracker Project
