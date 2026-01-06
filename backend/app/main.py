import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth_router, goals_router, tasks_router, focus_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Sentry if configured
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        environment="production" if "railway" in settings.DATABASE_URL else "development",
        send_default_pii=False,
    )
    logger.info("Sentry initialized")

app = FastAPI(title="HelpMeDo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(goals_router)
app.include_router(tasks_router)
app.include_router(focus_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/sentry-test")
def sentry_test():
    """Test endpoint to verify Sentry. Remove after testing."""
    raise Exception("Sentry test error")
