from pydantic import BaseModel, ConfigDict, Field, model_validator


class FlowOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1, max_length=200)
    next_state: str = Field(min_length=1, max_length=80)


class FlowState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(min_length=1, max_length=1000)
    options: dict[str, FlowOption] = Field(default_factory=dict)
    terminal: bool = False


class FlowConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(default=1, ge=1)
    initial_state: str = Field(default="start", min_length=1, max_length=80)
    states: dict[str, FlowState] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_transitions(self) -> "FlowConfig":
        if self.initial_state not in self.states:
            raise ValueError("initial_state must reference a defined state")
        for state in self.states.values():
            for option in state.options.values():
                if option.next_state not in self.states:
                    raise ValueError("every option next_state must reference a defined state")
        return self


class FlowUpdate(BaseModel):
    flow: FlowConfig
