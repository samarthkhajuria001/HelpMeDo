from pydantic import BaseModel


class GoogleToken(BaseModel):
    credential: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
