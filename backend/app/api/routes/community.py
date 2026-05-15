from fastapi import APIRouter, HTTPException

from app.schemas.community_schema import (
    CommunityMessageCreate,
    CommunityRequestCreate,
    CommunityRequestRespond,
)
from app.services.db_service import (
    create_community_request,
    get_community_state,
    get_user,
    respond_community_request,
    send_community_message,
)

router = APIRouter()


async def _ensure_target_user(user_id: str):
    user = await get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Farmer not found.")
    return user


@router.get("/state/{user_id}")
async def community_state_route(user_id: str):
    state = await get_community_state(user_id)
    return {"status": "success", "state": state}


@router.post("/request")
async def create_request_route(data: CommunityRequestCreate):
    if data.requester_id == data.requested_id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself.")

    await _ensure_target_user(data.requested_id)
    created = await create_community_request(data.requester_id, data.requested_id)
    if not created:
        raise HTTPException(status_code=400, detail="Unable to create community request.")

    state = await get_community_state(data.requester_id)
    return {"status": "success", "state": state}


@router.post("/request/respond")
async def respond_request_route(data: CommunityRequestRespond):
    updated = await respond_community_request(data.user_id, data.farmer_id, data.action)
    if not updated:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    state = await get_community_state(data.user_id)
    return {"status": "success", "state": state}


@router.post("/message")
async def send_message_route(data: CommunityMessageCreate):
    if data.sender_id == data.receiver_id:
        raise HTTPException(status_code=400, detail="You cannot message yourself.")

    await _ensure_target_user(data.receiver_id)
    sent = await send_community_message(data.sender_id, data.receiver_id, data.text)
    if not sent:
        raise HTTPException(
            status_code=400,
            detail="You can only message farmers who are already connected.",
        )

    state = await get_community_state(data.sender_id)
    return {"status": "success", "state": state}
