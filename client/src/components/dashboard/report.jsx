import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './Report.css'; // Include your existing CSS styles here

const sampleData = {
  sales: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    data: [12000, 19000, 15000, 18000, 21000],
    tableData: [
      { month: 'January', sales: 12000, orders: 45 },
      { month: 'February', sales: 19000, orders: 62 },
      { month: 'March', sales: 15000, orders: 51 },
      { month: 'April', sales: 18000, orders: 58 },
      { month: 'May', sales: 21000, orders: 72 },
    ],
  },
  inventory: {
    labels: ['Classic', 'Modern', 'Waterfall', 'Vintage', 'Sensor'],
    data: [78, 15, 3, 42, 8],
    tableData: [
      { product: 'Classic Single Lever', stock: 78, color: 'Chrome' },
      { product: 'Modern Wall Mount', stock: 15, color: 'Brass' },
      { product: 'Waterfall Spout', stock: 3, color: 'Black' },
      { product: 'Vintage Cross Handle', stock: 42, color: 'Gold' },
      { product: 'Sensor Activated', stock: 8, color: 'Chrome' },
    ],
  },
};

const Report = () => {
  const [reportType, setReportType] = useState('sales');
  const [duration, setDuration] = useState('today');
  const [customRange, setCustomRange] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [labels, setLabels] = useState([]);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartData && labels.length) {
      renderChart(reportType, labels, chartData);
    }
  }, [chartData, labels, reportType]);

  const generateReport = () => {
    const data = sampleData[reportType] || sampleData.sales;
    setChartData(data.data);
    setTableData(data.tableData);
    setLabels(data.labels);
  };

  const renderChart = (type, labels, data) => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    let config = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sales ($)',
          data,
          backgroundColor: 'rgba(52, 152, 219, 0.7)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: type === 'sales' ? {
          y: {
            beginAtZero: true
          }
        } : {}
      }
    };

    if (type === 'inventory') {
      config.type = 'pie';
      config.data.datasets[0] = {
        label: 'Stock Count',
        data,
        backgroundColor: [
          'rgba(52, 152, 219, 0.7)',
          'rgba(155, 89, 182, 0.7)',
          'rgba(46, 204, 113, 0.7)',
          'rgba(241, 196, 15, 0.7)',
          'rgba(231, 76, 60, 0.7)',
        ],
        borderColor: [
          'rgba(52, 152, 219, 1)',
          'rgba(155, 89, 182, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(241, 196, 15, 1)',
          'rgba(231, 76, 60, 1)',
        ],
        borderWidth: 1
      };
    }

    chartInstance.current = new Chart(ctx, config);
  };

  const renderTableHeaders = () => {
    if (!tableData.length) return null;

    const headers = Object.keys(tableData[0]);
    return (
      <tr>
        {headers.map((key, index) => (
          <th key={index}>{key.charAt(0).toUpperCase() + key.slice(1)}</th>
        ))}
      </tr>
    );
  };

  const renderTableRows = () => {
    return tableData.map((row, i) => (
      <tr key={i}>
        {Object.values(row).map((value, j) => (
          <td key={j}>{value}</td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="card">
      <h3><i className="fas fa-chart-bar"></i> Generate Report</h3>
      <div className="report-controls">
        <div className="control-group">
          <label>Report Type</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="sales">Sales Report</option>
            <option value="inventory">Stacks Report</option>
          </select>
        </div>

        <div className="control-group">
          <label>Duration</label>
          <select value={duration} onChange={e => {
            setDuration(e.target.value);
            setCustomRange(e.target.value === 'custom');
          }}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {customRange && (
          <>
            <div className="control-group">
              <label>Start Date</label>
              <input type="date" />
            </div>
            <div className="control-group">
              <label>End Date</label>
              <input type="date" />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" onClick={generateReport}>
          <i className="fas fa-file-alt"></i> Generate Report
        </button>
        <button className="btn btn-secondary" onClick={() => alert('Exported')}>
          <i className="fas fa-download"></i> Export
        </button>
      </div>

      <div className="card">
        <h3><i className="fas fa-chart-pie"></i> Report Results</h3>
        <div className="report-display">
          {!chartData ? (
            <div className="no-data">Select report parameters and click "Generate Report"</div>
          ) : (
            <>
              <div className="chart-container" style={{ height: '300px' }}>
                <canvas ref={chartRef}></canvas>
              </div>
              <table className="report-table">
                <thead>{renderTableHeaders()}</thead>
                <tbody>{renderTableRows()}</tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
