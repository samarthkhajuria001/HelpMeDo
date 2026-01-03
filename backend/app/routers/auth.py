import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import GoogleToken, TokenOut, UserOut
from app.services.auth import verify_google_token, create_access_token
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Dev-only flag - set HELPMEDO_DEV=1 to enable test login
IS_DEV = os.getenv("HELPMEDO_DEV", "0") == "1"


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


@router.post("/dev-login", response_model=TokenOut)
def dev_login(db: Session = Depends(get_db)):
    """DEV ONLY: Login as test user without Google OAuth.

    Only works when HELPMEDO_DEV=1 environment variable is set.
    DO NOT enable in production!
    """
    if not IS_DEV:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )

    # Get or create test user
    test_email = "dev@test.local"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            email=test_email,
            name="Dev Tester",
            google_id="dev-test-user-local"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    return TokenOut(access_token=access_token)
