"""
Campaign Metrics repository — hybrid JSON/DB backend.
"""

import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB, _json_load, _json_save
from app.db_schema import CampaignMetrics

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
METRICS_FILE = DATA_DIR / "campaign_metrics.json"


class MetricsRepo(HybridRepo):
    table_model = CampaignMetrics
    pk_field = "campaign_id"
    json_file = METRICS_FILE

    @classmethod
    def get(cls, campaign_id: str) -> Optional[dict]:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                row = s.query(CampaignMetrics).filter(
                    CampaignMetrics.campaign_id == campaign_id
                ).first()
                return cls._row_to_dict(row) if row else None
        # JSON fallback
        data = _json_load(cls.json_file)
        return data.get(campaign_id)

    @classmethod
    def update(cls, campaign_id: str, updates: dict) -> dict:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                row = s.query(CampaignMetrics).filter(
                    CampaignMetrics.campaign_id == campaign_id
                ).first()
                if row:
                    for k, v in updates.items():
                        if hasattr(row, k):
                            setattr(row, k, v)
                else:
                    row = CampaignMetrics(campaign_id=campaign_id, **updates)
                    s.add(row)
                s.commit()
                return cls._row_to_dict(row)

        # JSON fallback
        data = _json_load(cls.json_file)
        if campaign_id not in data:
            data[campaign_id] = {}
        data[campaign_id].update(updates)
        _json_save(cls.json_file, data)
        return data[campaign_id]

    @classmethod
    def _row_to_dict(cls, row) -> dict:
        if not row:
            return None
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}
