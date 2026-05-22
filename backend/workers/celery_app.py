from celery import Celery

from config import get_settings

settings = get_settings()

celery_app = Celery(
    "phantom",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    # 30/28 min — zod's render of 8 modules + ~190s of code can exceed
    # the previous 18 min soft limit on CPU-constrained hosts.
    task_time_limit=30 * 60,
    task_soft_time_limit=28 * 60,
    worker_prefetch_multiplier=1,
)
