"""
Autonomous Agent Governance Platform - Frontend
React + TailwindCSS + Recharts

This component shows:
1. Real - time action flow(action → rules → memory → risk → decision)
2. Risk heatmap(last 24 hours of decisions)
3. Action history table(searchable, expandable)
"""

// ============================================================================
// Dashboard.jsx - Main Container
// ============================================================================

import React, { useState, useEffect } from 'react';
import ActionFlowPanel from './ActionFlowPanel';
import RiskHeatmap from './RiskHeatmap';
import ActionHistory from './ActionHistory';

export default function Dashboard() {
  const [actions, setActions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch metrics on load
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 sec
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:8000/governance-metrics');
      const data = await res.json();
      setMetrics(data);

      const auditRes = await fetch('http://localhost:8000/audit-log');
      const auditData = await auditRes.json();
      setActions(auditData);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const submitTestAction = async (actionData) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/evaluate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData)
      });
      const decision = await res.json();
      fetchMetrics(); // Refresh dashboard
    } catch (err) {
      console.error('Failed to submit action:', err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Agent Governance Platform
              </h1>
              <p className="text-slate-500 mt-1">
                Real-time monitoring & control for autonomous AI agents
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-green-600 font-medium">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Metrics Row */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <MetricCard label="Total Decisions" value={metrics.total_decisions} />
            <MetricCard label="Approved" value={metrics.approved} accent="green" />
            <MetricCard label="Blocked" value={metrics.blocked} accent="red" />
            <MetricCard label="Escalated" value={metrics.escalated} accent="yellow" />
            <MetricCard label="Avg Risk" value={metrics.avg_risk_score} accent="purple" />
          </div>
        )}

        {/* Action Flow Panel (Real-time) */}
        <div className="mb-8">
          <ActionFlowPanel
            onSubmitAction={submitTestAction}
            loading={loading}
          />
        </div>

        {/* Grid: Heatmap + History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Risk Heatmap (Left: 2 cols) */}
          <div className="lg:col-span-2">
            <RiskHeatmap decisions={actions} />
          </div>

          {/* Quick Stats (Right: 1 col) */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              This Week's Highlights
            </h3>
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-600">Loss Prevented</p>
                <p className="text-2xl font-bold text-green-600">₹42.3L</p>
              </div>
              <div className="pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-600">Block Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics?.block_rate || '0%'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Policy Adherence</p>
                <p className="text-2xl font-bold text-blue-600">98.3%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action History Table */}
        <div className="mt-8">
          <ActionHistory actions={actions} />
        </div>

      </main>
    </div>
  );
}


// ============================================================================
// MetricCard.jsx - Reusable Metric Display
// ============================================================================

function MetricCard({ label, value, accent = 'blue' }) {
  const bgColor = {
    green: 'bg-green-50',
    red: 'bg-red-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
    blue: 'bg-blue-50'
  }[accent];

  const textColor = {
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600',
    blue: 'text-blue-600'
  }[accent];

  return (
    <div className={`${bgColor} rounded-lg p-4 border border-slate-200`}>
      <p className="text-xs text-slate-600 uppercase font-semibold">{label}</p>
      <p className={`text-2xl font-bold ${textColor} mt-2`}>{value}</p>
    </div>
  );
}


// ============================================================================
// ActionFlowPanel.jsx - Real-time Action Submission & Display
// ============================================================================

import { useState } from 'react';

export default function ActionFlowPanel({ onSubmitAction, loading }) {
  const [selectedScenario, setSelectedScenario] = useState('scenario1');

  const scenarios = {
    scenario1: {
      name: 'Safe Refund',
      action: {
        action_id: `action_${Date.now()}`,
        agent_name: 'support_bot_v2.1',
        action_type: 'refund',
        amount: 500,
        customer_id: 'cust_123',
        customer_tier: 'bronze',
        timestamp: new Date().toISOString(),
      },
      expectedDecision: 'APPROVE'
    },
    scenario2: {
      name: 'Policy Violation (Large Refund)',
      action: {
        action_id: `action_${Date.now()}`,
        agent_name: 'support_bot_v2.1',
        action_type: 'refund',
        amount: 100000,
        customer_id: 'cust_456',
        customer_tier: 'bronze',
        timestamp: new Date().toISOString(),
      },
      expectedDecision: 'BLOCK'
    },
    scenario3: {
      name: 'Memory + Anomaly (Fraud Pattern)',
      action: {
        action_id: `action_${Date.now()}`,
        agent_name: 'support_bot_v2.1',
        action_type: 'refund',
        amount: 5000,
        customer_id: 'cust_456',
        customer_tier: 'bronze',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 AM
      },
      expectedDecision: 'ESCALATE'
    }
  };

  const handleRunScenario = () => {
    const scenario = scenarios[selectedScenario];
    onSubmitAction(scenario.action);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        📋 Demo Scenarios
      </h2>

      <div className="space-y-4">
        {/* Scenario Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Choose a scenario:
          </label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
          >
            {Object.entries(scenarios).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scenario Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-slate-700">
            <strong>Expected Decision:</strong>{' '}
            <span className={
              scenarios[selectedScenario].expectedDecision === 'APPROVE'
                ? 'text-green-600'
                : scenarios[selectedScenario].expectedDecision === 'BLOCK'
                  ? 'text-red-600'
                  : 'text-yellow-600'
            }>
              {scenarios[selectedScenario].expectedDecision}
            </span>
          </p>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunScenario}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {loading ? 'Running...' : '▶ Run Scenario'}
        </button>
      </div>
    </div>
  );
}


// ============================================================================
// RiskHeatmap.jsx - Chart of Decisions Over Time
// ============================================================================

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RiskHeatmap({ decisions }) {
  // Group decisions by hour
  const chartData = decisions.reduce((acc, decision) => {
    const time = new Date(decision.timestamp).toLocaleTimeString();
    const existing = acc.find(d => d.time === time);
    if (existing) {
      existing.risk = decision.risk_score;
    } else {
      acc.push({ time, risk: decision.risk_score });
    }
    return acc;
  }, []);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        📊 Risk Score Trend
      </h2>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px'
              }}
            />
            <Line
              type="monotone"
              dataKey="risk"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-slate-500 text-center py-8">No decisions yet. Run a scenario to see data.</p>
      )}
    </div>
  );
}


// ============================================================================
// ActionHistory.jsx - Table of Past Decisions
// ============================================================================

import { useState } from 'react';

export default function ActionHistory({ actions }) {
  const [expandedId, setExpandedId] = useState(null);

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'APPROVE': return 'bg-green-100 text-green-800';
      case 'BLOCK': return 'bg-red-100 text-red-800';
      case 'ESCALATE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        📝 Decision History
      </h2>

      {actions.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No decisions logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Action ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Risk Score</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Decision</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr
                  key={action.action_id}
                  className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandedId(
                    expandedId === action.action_id ? null : action.action_id
                  )}
                >
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {action.action_id.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${action.risk_score > 70 ? 'bg-red-100 text-red-800' :
                        action.risk_score > 40 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                      {action.risk_score.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDecisionColor(action.decision)
                      }`}>
                      {action.decision}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
