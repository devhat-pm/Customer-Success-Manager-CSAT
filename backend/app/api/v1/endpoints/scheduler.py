from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any

from app.core.dependencies import get_admin_user
from app.models.user import User
from app.core.scheduler import get_scheduler_jobs, run_job_now

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


@router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_scheduled_jobs(
    current_user: User = Depends(get_admin_user)
):
    """
    List all scheduled background jobs (Admin only).
    """
    return get_scheduler_jobs()


@router.post("/jobs/{job_id}/run")
async def trigger_job(
    job_id: str,
    current_user: User = Depends(get_admin_user)
):
    """
    Manually trigger a scheduled job to run immediately (Admin only).
    """
    success = run_job_now(job_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found"
        )

    return {"message": f"Job '{job_id}' triggered successfully"}
