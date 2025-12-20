from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import GoogleToken, TokenOut, UserOut
from app.services.auth import verify_google_token, create_access_token
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenOut)
def google_login(data: GoogleToken, db: Session = Depends(get_db)):
    """Login with Google ID token."""
    google_user = verify_google_token(data.credential)
    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    user = db.query(User).filter(User.google_id == google_user["google_id"]).first()
    if not user:
        user = User(
            email=google_user["email"],
            name=google_user["name"],
            google_id=google_user["google_id"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    return TokenOut(access_token=access_token)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.post("/logout")
async def logout():
    """Logout - client should discard the token."""
    return {"message": "Logged out"}
