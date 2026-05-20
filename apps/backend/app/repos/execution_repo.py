"""
Campaign Execution repository — hybrid JSON/DB backend.
"""

import sys
from pathlib import Path
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB, _json_load, _json_save
from app.db_schema import CampaignExecution, ExecutionStatus

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
EXECUTION_FILE = DATA_DIR / "execution_history.json"


class ExecutionRepo(HybridRepo):
    table_model = CampaignExecution
    pk_field = "execution_id"
    json_file = EXECUTION_FILE

    @classmethod
    def get_by_campaign_id(cls, campaign_id: str) -> Optional[dict]:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                row = s.query(CampaignExecution).filter(
                    CampaignExecution.campaign_id == campaign_id
                ).first()
                return cls._row_to_dict(row) if row else None
        # JSON fallback
        data = _json_load(cls.json_file)
        return data.get(campaign_id)

    @classmethod
    def _row_to_dict(cls, row) -> dict:
        if not row:
            return None
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}
