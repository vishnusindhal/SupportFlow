from dataclasses import dataclass
from typing import Any

from app.schemas.rules import RuleAction, RuleCondition


@dataclass(frozen=True)
class RuleResult:
    matched: bool
    trace: list[dict[str, Any]]
    action: RuleAction | None = None


def _value(context: dict[str, Any], field: str) -> Any:
    current: Any = context
    for part in field.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _normalize(value: Any) -> Any:
    # Text comparisons ignore case and surrounding spaces ("Order_Status " == "order_status").
    return value.strip().lower() if isinstance(value, str) else value


def _as_list(expected: Any) -> list | None:
    if isinstance(expected, list):
        return expected
    if isinstance(expected, str):
        # The rules form sends "returns, cancellation" as one string.
        return [item.strip() for item in expected.split(",") if item.strip()]
    return None


def _compare(actual: Any, condition: RuleCondition) -> bool:
    expected = condition.value
    if actual is None:
        return False
    if condition.operator == "equals":
        return _normalize(actual) == _normalize(expected)
    if condition.operator == "not_equals":
        return _normalize(actual) != _normalize(expected)
    if condition.operator == "contains":
        if isinstance(actual, str):
            return str(expected).lower() in actual.lower()
        if isinstance(actual, (list, tuple, set)):
            return expected in actual
        return False
    if condition.operator == "in":
        options = _as_list(expected)
        return options is not None and _normalize(actual) in [_normalize(option) for option in options]
    if condition.operator in {"greater_than", "less_than"}:
        try:
            left, right = float(actual), float(expected)
        except (TypeError, ValueError):
            return False
        return left > right if condition.operator == "greater_than" else left < right
    return False


def evaluate_conditions(
    conditions: list[RuleCondition | dict[str, Any]], logic: str, context: dict[str, Any]
) -> tuple[bool, list[dict[str, Any]]]:
    trace = []
    for raw_condition in conditions:
        condition = (
            raw_condition
            if isinstance(raw_condition, RuleCondition)
            else RuleCondition.model_validate(raw_condition)
        )
        actual = _value(context, condition.field)
        matched = _compare(actual, condition)
        trace.append(
            {
                "field": condition.field,
                "operator": condition.operator,
                "matched": matched,
                "value_present": actual is not None,
            }
        )
    matches = [item["matched"] for item in trace]
    return (all(matches) if logic == "all" else any(matches)), trace
