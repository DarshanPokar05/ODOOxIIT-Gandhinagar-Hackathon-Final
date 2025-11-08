import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import './AnalyticsPage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Project {
  id: number;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  progress: number;
  status: string;
}

interface MonthlyData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface AnalyticsData {
  projects: Project[];
  monthlyTrend: MonthlyData[];
  totals: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
  summary: {
    totalProjects: number;
    avgProgress: number;
  };
}

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [projects, setProjects] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    projectId: 'all',
    role: 'all'
  });

  useEffect(() => {
    fetchAnalyticsData();
    fetchProjects();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.projectId !== 'all') params.append('projectId', filters.projectId);
      if (filters.role !== 'all') params.append('role', filters.role);

      const response = await fetch(`http://localhost:5000/api/analytics?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/analytics/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const exportCSV = () => {
    if (!data) return;

    const csvContent = [
      ['Project', 'Revenue', 'Cost', 'Profit', 'Progress%'],
      ...data.projects.map(p => [p.name, p.revenue, p.cost, p.profit, p.progress])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.csv';
    a.click();
  };

  const exportPDF = () => {
    window.print();
  };

  if (loading) return <div className="loading">Loading analytics...</div>;

  const barChartData = {
    labels: data?.projects.map(p => p.name) || [],
    datasets: [
      {
        label: 'Revenue',
        data: data?.projects.map(p => p.revenue) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
      {
        label: 'Cost',
        data: data?.projects.map(p => p.cost) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }
    ]
  };

  const lineChartData = {
    labels: data?.monthlyTrend.map(m => new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })) || [],
    datasets: [
      {
        label: 'Monthly Revenue',
        data: data?.monthlyTrend.map(m => m.revenue) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }
    ]
  };

  const pieChartData = {
    labels: data?.projects.map(p => p.name) || [],
    datasets: [
      {
        data: data?.projects.map(p => p.profit) || [],
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ]
      }
    ]
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Financial Reports & Analysis</h1>
        
        <div className="filters">
          <div className="filter-group">
            <label>Date Range:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>Project:</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({...filters, projectId: e.target.value})}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Role:</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({...filters, role: e.target.value})}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="team_member">Team Member</option>
            </select>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-container">
          <h3>Revenue vs Cost per Project</h3>
          <Bar data={barChartData} options={{ responsive: true }} />
        </div>
        
        <div className="chart-container">
          <h3>Monthly Revenue Trend</h3>
          <Line data={lineChartData} options={{ responsive: true }} />
        </div>
        
        <div className="chart-container">
          <h3>Profit Distribution</h3>
          <Pie data={pieChartData} options={{ responsive: true }} />
        </div>
      </div>

      <div className="summary-section">
        <h3>Summary Table</h3>
        <div className="export-buttons">
          <button onClick={exportCSV} className="export-btn">Export as CSV</button>
          <button onClick={exportPDF} className="export-btn">Export as PDF</button>
        </div>
        
        <table className="summary-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Progress%</th>
            </tr>
          </thead>
          <tbody>
            {data?.projects.map(project => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>${project.revenue?.toLocaleString()}</td>
                <td>${project.cost?.toLocaleString()}</td>
                <td>${project.profit?.toLocaleString()}</td>
                <td>{project.progress}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td><strong>Totals</strong></td>
              <td><strong>${data?.totals.totalRevenue?.toLocaleString()}</strong></td>
              <td><strong>${data?.totals.totalCost?.toLocaleString()}</strong></td>
              <td><strong>${data?.totals.totalProfit?.toLocaleString()}</strong></td>
              <td><strong>{data?.summary.avgProgress?.toFixed(1)}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsPage;