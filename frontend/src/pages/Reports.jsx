
import { useState } from "react";
import api from "../services/api";

const reportFormats = [
  {
    id: "csv",
    name: "CSV Report",
    extension: ".csv",
    description:
      "Export your financial records into a simple spreadsheet-compatible format.",
    details: ["Transaction history", "Income and expenses", "Dashboard summary"],
    icon: "▤",
    className: "csv",
    buttonText: "Download CSV",
  },
  {
    id: "excel",
    name: "Excel Report",
    extension: ".xlsx",
    description:
      "Get an organized Excel workbook with separate sheets for summary and transactions.",
    details: ["Dashboard summary sheet", "Transaction details sheet", "Easy spreadsheet analysis"],
    icon: "▦",
    className: "excel",
    buttonText: "Download Excel",
  },
  {
    id: "pdf",
    name: "PDF Report",
    extension: ".pdf",
    description:
      "Create a clean, printable financial report for reviewing and sharing your records.",
    details: ["Financial summary", "Transaction history", "Print-friendly layout"],
    icon: "▧",
    className: "pdf",
    buttonText: "Download PDF",
  },
];

function Reports() {
  const [loadingFormat, setLoadingFormat] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const exportReport = async (format) => {
    setLoadingFormat(format);
    setMessage("");
    setError("");

    try {
      const response = await api.get("/dashboard/export", {
        params: { format },
        responseType: "blob",
      });

      const selectedFormat = reportFormats.find(
        (item) => item.id === format
      );

      const blob = new Blob([response.data], {
        type: response.data.type || "application/octet-stream",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = `dashboard_report${selectedFormat.extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setMessage(
        `${selectedFormat.name} downloaded successfully.`
      );
    } catch (err) {
      let errorMessage =
        "Unable to download the report. Please try again.";

      const responseData = err.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          errorMessage = parsed.detail || errorMessage;
        } catch {
          // Keep the default error message.
        }
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      setError(errorMessage);
    } finally {
      setLoadingFormat("");
    }
  };

  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div className="reports-hero-content">
          <span className="reports-eyebrow">
            FINANCIAL DOCUMENTS
          </span>

          <h2>Reports & Exports</h2>

          <p>
            Turn your financial activity into organized reports.
            Download your records whenever you need them.
          </p>
        </div>

        <div className="reports-hero-icon">
          <span>▤</span>
        </div>
      </section>

      <section className="reports-section-heading">
        <div>
          <h3>Export your reports</h3>
          <p>Choose a format that works best for you.</p>
        </div>
      </section>

      <section className="report-export-grid">
        {reportFormats.map((report) => (
          <article
            className="report-export-card"
            key={report.id}
          >
            <div className="report-card-top">
              <div className={`report-icon ${report.className}`}>
                {report.icon}
              </div>

              <span className="report-extension">
                {report.extension}
              </span>
            </div>

            <h3>{report.name}</h3>

            <p className="report-description">
              {report.description}
            </p>

            <div className="report-includes">
              <span className="report-includes-title">
                INCLUDED IN THIS REPORT
              </span>

              <ul>
                {report.details.map((detail) => (
                  <li key={detail}>
                    <span className="report-check">✓</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`report-download-button ${report.className}`}
              onClick={() => exportReport(report.id)}
              disabled={loadingFormat !== ""}
            >
              {loadingFormat === report.id ? (
                <>
                  <span className="report-spinner" />
                  Preparing download...
                </>
              ) : (
                <>
                  <span>↓</span>
                  {report.buttonText}
                </>
              )}
            </button>
          </article>
        ))}
      </section>

      {message && (
        <div className="report-alert report-success" role="status">
          <span className="alert-icon">✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="report-alert report-error" role="alert">
          <span className="alert-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      <section className="report-information">
        <div className="report-information-icon">i</div>

        <div>
          <h4>About your exported reports</h4>
          <p>
            Reports are generated using your account's actual
            transaction records. They include all recorded dates,
            along with total income, total expenses, and current
            balance. Only your authenticated account's data is exported.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Reports;
