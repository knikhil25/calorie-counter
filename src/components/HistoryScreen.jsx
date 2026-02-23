import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      titleColor: '#343c31',
      bodyColor: '#5c6d52',
      borderColor: '#b5c0a8',
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      callbacks: {
        label: (ctx) => `${ctx.raw} cal`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#758869',
        font: { size: 11 },
        maxRotation: 45,
        callback: (_, i, values) => {
          const label = values[i]?.label || '';
          if (label.length > 8) return label.slice(5);
          return label;
        }
      }
    },
    y: {
      grid: { color: 'rgba(180,192,168,0.3)' },
      ticks: {
        color: '#758869',
        font: { size: 11 }
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
};

function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.history || []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const chartData = {
    labels: history.map((h) => h.date),
    datasets: [
      {
        label: 'Daily Calories',
        data: history.map((h) => h.total_calories),
        fill: true,
        borderColor: '#758869',
        backgroundColor: 'rgba(117, 136, 105, 0.15)',
        tension: 0.4,
        pointBackgroundColor: '#758869',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-sage-400 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-sage-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-sage-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sage-600 font-medium">No history yet</p>
        <p className="text-sage-400 text-sm mt-1">
          Use &quot;Last meal: &lt;food&gt;&quot; in Chat to save a day and see your progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-sage-100 p-4 mb-4 animate-slide-up">
        <h2 className="text-sage-700 font-medium text-sm mb-3">Daily calories over time</h2>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      <div className="space-y-2">
        {[...history].reverse().slice(0, 14).map((h) => (
          <div
            key={h.date}
            className="flex justify-between items-center py-3 px-4 bg-white rounded-xl border border-sage-100 shadow-sm animate-fade-in"
          >
            <span className="text-sage-600 text-sm">{h.date}</span>
            <span className="text-sage-800 font-semibold">{h.total_calories} cal</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryScreen;
