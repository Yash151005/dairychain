from pydantic import BaseModel, Field


class CommunityRequestCreate(BaseModel):
    requester_id: str = Field(min_length=1)
    requested_id: str = Field(min_length=1)


class CommunityRequestRespond(BaseModel):
    user_id: str = Field(min_length=1)
    farmer_id: str = Field(min_length=1)
    action: str = Field(pattern="^(accept|decline)$")


class CommunityMessageCreate(BaseModel):
    sender_id: str = Field(min_length=1)
    receiver_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=500)
