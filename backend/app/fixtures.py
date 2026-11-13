NORTHSTAR_TEMPLATE = {
    "schema_version": 1,
    "intents": [
        {"key": "shipping_status", "label": "Shipping status"},
        {"key": "returns", "label": "Returns and refunds"},
        {"key": "cancellation", "label": "Order cancellation"},
        {"key": "damaged_item", "label": "Damaged item"},
        {"key": "talk_to_agent", "label": "Talk to an agent"},
    ],
    "entities": [{"key": "order_id", "type": "string", "pattern": r"^[A-Z0-9-]{4,32}$"}],
    "default_rules": [
        {"name": "damaged-item-escalation", "when": "damaged_item", "action": "escalate"}
    ],
    "faqs": [
        {"question": "How long does delivery take?", "answer": "Delivery usually takes three to five business days after dispatch."},
        {"question": "What is the return window?", "answer": "Returns may be requested within 30 calendar days of delivery."},
    ],
    "menu": {
        "welcome": "How can we help today?",
        "options": ["shipping_status", "returns", "cancellation", "damaged_item", "talk_to_agent"],
    },
    "assistant": {"name": "Northstar Assistant", "tone": "clear and helpful", "handoff_enabled": True},
}
