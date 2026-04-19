from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, assessment, contacts
from app.api.campaigns_v2 import router as campaigns_v2_router
from app.api.intake import router as intake_router
from app.api.payment import router as payment_router, router_consent, router_campaigns

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(analytics.router)
app.include_router(intake_router)
app.include_router(payment_router)
app.include_router(router_consent)
app.include_router(router_campaigns)
app.include_router(campaigns_v2_router)
app.include_router(assessment.router)
app.include_router(contacts.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
