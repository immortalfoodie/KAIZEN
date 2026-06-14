"""
Router: SSE Events  —  GET /api/v1/events/stream
Server-Sent Events for real-time governance decision feed.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["events"])

# In-memory subscriber queues
_subscribers: List[asyncio.Queue] = []


async def broadcast_event(event_type: str, data: Dict[str, Any]):
    """Broadcast an event to all connected SSE subscribers."""
    event_data = {
        "event": event_type,
        "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    disconnected = []
    for i, queue in enumerate(_subscribers):
        try:
            queue.put_nowait(event_data)
        except asyncio.QueueFull:
            disconnected.append(i)
        except Exception:
            disconnected.append(i)

    # Clean up disconnected subscribers
    for i in sorted(disconnected, reverse=True):
        try:
            _subscribers.pop(i)
        except IndexError:
            pass


async def _event_generator(queue: asyncio.Queue):
    """Generate SSE events for a single subscriber."""
    try:
        # Send initial connection event
        connect_event = {
            "event": "connected",
            "data": {"message": "Connected to NETRA event stream"},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        yield f"event: connected\ndata: {json.dumps(connect_event)}\n\n"

        while True:
            try:
                # Wait for events with timeout (heartbeat every 15s)
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                event_type = event.get("event", "message")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                heartbeat = {
                    "event": "heartbeat",
                    "data": {"status": "alive"},
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
                yield f"event: heartbeat\ndata: {json.dumps(heartbeat)}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        # Clean up subscriber
        if queue in _subscribers:
            _subscribers.remove(queue)


@router.get("/events/stream")
async def event_stream():
    """
    SSE endpoint for real-time governance events.
    
    Events:
      - `connected`: Initial connection confirmation
      - `decision`: A new governance decision was made
      - `alert`: High-risk action detected
      - `heartbeat`: Keep-alive (every 15 seconds)
    
    Usage (JavaScript):
    ```js
    const source = new EventSource('/api/v1/events/stream');
    source.addEventListener('decision', (e) => {
        const data = JSON.parse(e.data);
        console.log('Decision:', data);
    });
    ```
    """
    queue = asyncio.Queue(maxsize=100)
    _subscribers.append(queue)

    return StreamingResponse(
        _event_generator(queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
