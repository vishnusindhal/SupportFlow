from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

RuleOperator = Literal["equals", "not_equals", "greater_than", "less_than", "contains", "in"]
RuleActionType = Literal["escalate", "require_approval", "route_to_team", "auto_respond", "set_priority"]
# Fields available in the chat rule context; anything else could never match.
RULE_CONTEXT_ROOTS = ("message", "intent", "entities", "conversation")


class RuleCondition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z][a-zA-Z0-9_.-]*$")
    operator: RuleOperator
    value: Any


class RuleAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: RuleActionType
    message: str | None = Field(default=None, max_length=1000)
    team: str | None = Field(default=None, max_length=80)
    priority: Literal["low", "normal", "high", "urgent"] | None = None


class RuleFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    conditions: list[RuleCondition] = Field(min_length=1, max_length=20)
    logic: Literal["all", "any"] = "all"
    action: RuleAction
    priority: int = Field(default=100, ge=0, le=1_000_000)
    enabled: bool = True


class RuleInput(RuleFields):
    """Create/update payload. Stored rules are listed with `RuleResponse`, which
    skips this check so an older rule with an unknown field still displays."""

    @field_validator("conditions")
    @classmethod
    def fields_exist_in_chat_context(cls, conditions: list[RuleCondition]) -> list[RuleCondition]:
        for condition in conditions:
            root = condition.field.split(".")[0]
            if root not in RULE_CONTEXT_ROOTS:
                raise ValueError(
                    f"Unknown field '{condition.field}'. Use message, intent, entities.<name> or conversation.state."
                )
        return conditions


class RuleResponse(RuleFields):
    id: str
    organization_id: str


class RuleTestRequest(BaseModel):
    context: dict[str, Any] = Field(default_factory=dict)


class RuleEvaluation(BaseModel):
    matched: bool
    rule_id: str | None = None
    rule_name: str | None = None
    action: RuleAction | None = None
    trace: list[dict[str, Any]]


class RuleOptions(BaseModel):
    fields: list[str]
    intents: list[str]
