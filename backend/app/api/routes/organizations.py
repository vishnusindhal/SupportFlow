from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import AuthContext, get_current_context
from app.schemas.auth import OrganizationResponse

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/current", response_model=OrganizationResponse)
def current_organization(context: Annotated[AuthContext, Depends(get_current_context)]):
    return context.organization

