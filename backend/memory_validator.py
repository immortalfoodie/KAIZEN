"""
Agent Conscience — Memory Validator (Pillar 2)
ChromaDB-based historical pattern matching for organizational memory
"""

import logging
from typing import Dict, Any, List
from models import AgentAction, MemoryWarning

logger = logging.getLogger(__name__)


class MemoryValidator:
    """
    Queries organizational memory (ChromaDB) for similar past actions.
    
    Detects:
      - Repeat refund patterns for the same customer
      - Historical fraud/loss associations
      - Frequency anomalies
    """

    def __init__(self):
        import chromadb
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection(
            name="agent_decisions",
            metadata={"hnsw:space": "cosine"},
        )
        self._loaded_ids: set = set()
        logger.info("MemoryValidator initialized with ChromaDB in-memory client")

    def load_historical_data(self, history: List[Dict[str, Any]]):
        """
        Load historical decisions into ChromaDB.
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

        ids = []
        documents = []
        metadatas = []

        for item in new_items:
            item_id = str(item.get("id", item.get("action_id", "")))
            ids.append(item_id)
            documents.append(
                f"{item.get('action_type', 'unknown')} "
                f"amount={item.get('amount', 0)} "
                f"customer={item.get('customer_id', 'unknown')} "
                f"tier={item.get('customer_tier', 'bronze')}"
            )
            metadatas.append({
                "customer_id": str(item.get("customer_id", "")),
                "action_type": str(item.get("action_type", "")),
                "amount": float(item.get("amount", 0)),
                "outcome": str(item.get("outcome", "success")),
                "loss": float(item.get("loss", 0)),
                "timestamp": str(item.get("timestamp", "")),
            })

        try:
            self.collection.add(ids=ids, documents=documents, metadatas=metadatas)
            logger.info(f"Loaded {len(ids)} historical decisions into ChromaDB")
        except Exception as e:
            logger.error(f"Failed to load history into ChromaDB: {e}")

    def store_action(self, action: AgentAction, outcome: str, loss: float = 0):
        """Store a new evaluated action for future reference."""
        item_id = action.action_id
        if item_id in self._loaded_ids:
            return

        try:
            self.collection.add(
                ids=[item_id],
                documents=[
                    f"{action.action_type} "
                    f"amount={action.amount} "
                    f"customer={action.customer_id} "
                    f"tier={action.customer_tier}"
                ],
                metadatas=[{
                    "customer_id": action.customer_id,
                    "action_type": action.action_type,
                    "amount": action.amount,
                    "outcome": outcome,
                    "loss": loss,
                    "timestamp": action.timestamp,
                }],
            )
            self._loaded_ids.add(item_id)
        except Exception as e:
            logger.warning(f"Failed to store action in memory: {e}")

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
            # Query by document similarity (semantic match)
            query_doc = (
                f"{action.action_type} "
                f"amount={action.amount} "
                f"customer={action.customer_id} "
                f"tier={action.customer_tier}"
            )
            results = self.collection.query(
                query_texts=[query_doc],
                n_results=10,
                where={"customer_id": action.customer_id},
            )

            if results and results["metadatas"] and results["metadatas"][0]:
                metas = results["metadatas"][0]
                similar_actions = len(metas)

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
            # Fallback: try simple get with just customer_id
            try:
                results = self.collection.get(
                    where={"customer_id": action.customer_id}
                )
                if results and results["metadatas"]:
                    similar_actions = len(results["metadatas"])
                    for meta in results["metadatas"]:
                        recent_actions.append(meta)
                        if meta.get("outcome") == "fraud":
                            loss_amount = float(meta.get("loss", 0))
                            total_loss += loss_amount
                            warnings.append(MemoryWarning(
                                type="fraud_pattern",
                                message=f"Historical fraud loss of ₹{loss_amount:,.0f} for this customer",
                                severity="CRITICAL",
                            ))
            except Exception as e2:
                logger.error(f"Memory fallback query also failed: {e2}")

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
            results = self.collection.get(
                where={"customer_id": customer_id}
            )

            if not results or not results["metadatas"]:
                return {
                    "customer_id": customer_id,
                    "total_past_actions": 0,
                    "fraud_incidents": 0,
                    "total_loss": 0,
                    "risk_elevation": "LOW",
                    "recent_actions": [],
                }

            metas = results["metadatas"]
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
