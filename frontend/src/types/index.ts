export type DecisionType = "APPROVE" | "BLOCK" | "ESCALATE" | "PENDING";

export interface GovernanceDecision {
  action_id: string;
  agent_name: string;
  action_type: string;
  amount: number;
  customer_id: string;
  decision: DecisionType;
  risk_score: number;
  reasoning: string;
  simple_explanation: string;
  rule_violations: Array<{ rule: string; message: string; severity: string }>;
  memory_warnings: Array<{ type: string; message: string; severity: string }>;
  anomaly_score: number;
  evaluated_at: string;
}

export interface GovernanceMetrics {
  total_decisions: number;
  approved: number;
  blocked: number;
  escalated: number;
  block_rate: string;
  avg_risk_score: string;
}

export interface MemoryInsight {
  customer_id: string;
  total_past_actions: number;
  fraud_incidents: number;
  total_loss: number;
  risk_elevation: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recent_actions: any[];
}
