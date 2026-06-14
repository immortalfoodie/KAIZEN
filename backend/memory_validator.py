"""
KAIZEN — Memory Validator (Pillar 2)
Pure-Python lightweight memory validation replacing ChromaDB.
"""

# Optimized data loading batch sizes and in-memory footprint structure.
import logging
from typing import Dict, Any, List
from models import AgentAction, MemoryWarning

logger = logging.getLogger(__name__)


class MemoryValidator:
    """
    Queries organizational memory (in-memory store) for similar past actions.
    
    Detects:
      - Repeat refund patterns for the same customer
      - Historical fraud/loss associations
      - Frequency anomalies
    """

    def __init__(self):
        # Maps customer_id (str) -> List[Dict[str, Any]]
        # Each dict has: {"id": id, "document": doc, "metadata": meta}
        self._data: Dict[str, List[Dict[str, Any]]] = {}
        self._loaded_ids: set = set()
        logger.info("MemoryValidator initialized with lightweight in-memory store")

    def _calculate_similarity(self, doc1: str, doc2: str) -> float:
        """Calculate word-level Jaccard similarity between two documents."""
        w1 = set(doc1.lower().split())
        w2 = set(doc2.lower().split())
        if not w1 or not w2:
            return 0.0
        return len(w1.intersection(w2)) / len(w1.union(w2))

    def load_historical_data(self, history: List[Dict[str, Any]]):
        """
        Load historical decisions into the in-memory store.
        Deduplicates by ID to prevent bloat on restart.
        """
        new_items = []
        for item in history:
            item_id = str(item.get("id", item.get("action_id", "")))
            if item_id and item_id not in self._loaded_ids:
                new_items.append(item)
                self._loaded_ids.add(item_id)

        if not new_items:
            logger.info("No new historical items to load")
            return

        for item in new_items:
            item_id = str(item.get("id", item.get("action_id", "")))
            customer_id = str(item.get("customer_id", ""))
            
            doc = (
                f"{item.get('action_type', 'unknown')} "
                f"amount={item.get('amount', 0)} "
                f"customer={customer_id} "
                f"tier={item.get('customer_tier', 'bronze')}"
            )
            
            meta = {
                "customer_id": customer_id,
                "action_type": str(item.get("action_type", "")),
                "amount": float(item.get("amount", 0)),
                "outcome": str(item.get("outcome", "success")),
                "loss": float(item.get("loss", 0)),
                "timestamp": str(item.get("timestamp", "")),
            }
            
            if customer_id not in self._data:
                self._data[customer_id] = []
            
            self._data[customer_id].append({
                "id": item_id,
                "document": doc,
                "metadata": meta
            })

        logger.info(f"Loaded {len(new_items)} historical decisions into memory validator")

    def store_action(self, action: AgentAction, outcome: str, loss: float = 0):
        """Store a new evaluated action for future reference."""
        item_id = action.action_id
        if item_id in self._loaded_ids:
            return

        customer_id = action.customer_id
        doc = (
            f"{action.action_type} "
            f"amount={action.amount} "
            f"customer={customer_id} "
            f"tier={action.customer_tier}"
        )
        
        meta = {
            "customer_id": customer_id,
            "action_type": action.action_type,
            "amount": action.amount,
            "outcome": outcome,
            "loss": loss,
            "timestamp": action.timestamp,
        }
        
        if customer_id not in self._data:
            self._data[customer_id] = []
            
        self._data[customer_id].append({
            "id": item_id,
            "document": doc,
            "metadata": meta
        })
        self._loaded_ids.add(item_id)

    def query(self, action: AgentAction) -> Dict[str, Any]:
        """
        Find similar historical actions and analyze patterns.
        
        Returns:
            {
                "similar_actions": int,
                "warnings": [MemoryWarning, ...],
                "total_loss_in_similar": float,
                "risk_elevation": "LOW" | "MEDIUM" | "HIGH",
                "recent_actions": [...]
            }
        """
        warnings: List[MemoryWarning] = []
        similar_actions = 0
        total_loss = 0.0
        recent_actions = []

        try:
            customer_id = action.customer_id
            query_doc = (
                f"{action.action_type} "
                f"amount={action.amount} "
                f"customer={customer_id} "
                f"tier={action.customer_tier}"
            )
            
            # Fetch all records for this customer
            records = self._data.get(customer_id, [])
            
            # Score records using Jaccard word similarity
            scored_records = []
            for rec in records:
                sim = self._calculate_similarity(query_doc, rec["document"])
                scored_records.append((sim, rec))
            
            # Sort by similarity descending
            scored_records.sort(key=lambda x: x[0], reverse=True)
            
            # n_results = 10
            top_records = scored_records[:10]
            similar_actions = len(top_records)
            
            metas = [rec["metadata"] for _, rec in top_records]
            
            for meta in metas:
                recent_actions.append(meta)

                if meta.get("outcome") == "fraud":
                    loss_amount = float(meta.get("loss", 0))
                    total_loss += loss_amount
                    warnings.append(MemoryWarning(
                        type="fraud_pattern",
                        message=f"Similar past action resulted in fraud loss of ₹{loss_amount:,.0f}",
                        severity="CRITICAL",
                    ))

            # Check frequency pattern
            same_type_count = sum(
                1 for m in metas if m.get("action_type") == action.action_type
            )
            if same_type_count >= 3:
                warnings.append(MemoryWarning(
                    type="frequency_pattern",
                    message=f"Customer has {same_type_count} similar '{action.action_type}' actions in history",
                    severity="HIGH",
                ))

        except Exception as e:
            logger.warning(f"Memory query failed (non-fatal): {e}")

        # Determine risk elevation
        if total_loss > 0 or len(warnings) >= 2:
            risk_elevation = "HIGH"
        elif len(warnings) >= 1:
            risk_elevation = "MEDIUM"
        else:
            risk_elevation = "LOW"

        return {
            "similar_actions": similar_actions,
            "warnings": warnings,
            "total_loss_in_similar": total_loss,
            "risk_elevation": risk_elevation,
            "recent_actions": recent_actions[-5:],  # Last 5
        }

    def get_customer_insights(self, customer_id: str) -> Dict[str, Any]:
        """Get aggregated insights for a specific customer."""
        try:
            records = self._data.get(customer_id, [])
            
            if not records:
                return {
                    "customer_id": customer_id,
                    "total_past_actions": 0,
                    "fraud_incidents": 0,
                    "total_loss": 0,
                    "risk_elevation": "LOW",
                    "recent_actions": [],
                }

            metas = [r["metadata"] for r in records]
            fraud_count = sum(1 for m in metas if m.get("outcome") == "fraud")
            total_loss = sum(float(m.get("loss", 0)) for m in metas)

            if fraud_count > 0:
                risk_elevation = "HIGH"
            elif len(metas) > 5:
                risk_elevation = "MEDIUM"
            else:
                risk_elevation = "LOW"

            return {
                "customer_id": customer_id,
                "total_past_actions": len(metas),
                "fraud_incidents": fraud_count,
                "total_loss": total_loss,
                "risk_elevation": risk_elevation,
                "recent_actions": metas[-5:],
            }
        except Exception as e:
            logger.error(f"Customer insights query failed: {e}")
            return {
                "customer_id": customer_id,
                "total_past_actions": 0,
                "fraud_incidents": 0,
                "total_loss": 0,
                "risk_elevation": "LOW",
                "recent_actions": [],
            }
