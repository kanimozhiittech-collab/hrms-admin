"""Shared department-wise Level 1 / Level 2 approval routing.

Used by both Leave and Regularization requests. A department's Level 1 is
the normal approver; if Level 2 exists (two-level approval) and Level 1
has an approved leave covering today, review responsibility shifts to
Level 2 instead. Departments with no configuration for a given module fall
back to the employee's plain reporting manager, so nothing breaks for
companies that haven't set this up.
"""
from datetime import date
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Employee, LeaveApprovalConfig, LeaveRequest
from ..models.leave import LR_APPROVED

MODULE_LEAVE = "Leave"
MODULE_REGULARIZATION = "Regularization"


def is_on_approved_leave_today(db: Session, employee_id: str) -> bool:
    today = date.today()
    return db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == LR_APPROVED,
        LeaveRequest.from_date <= today,
        LeaveRequest.to_date >= today,
    ).first() is not None


def department_approval_config(
    db: Session, company_id: str, department_id: Optional[str], module: str
) -> Optional[LeaveApprovalConfig]:
    if not department_id:
        return None
    return db.query(LeaveApprovalConfig).filter(
        LeaveApprovalConfig.company_id == company_id,
        LeaveApprovalConfig.department_id == department_id,
        LeaveApprovalConfig.module == module,
        LeaveApprovalConfig.status == "active",
    ).first()


def current_approver_employee_id(
    db: Session, company_id: str, target: Optional[Employee], module: str
) -> Optional[str]:
    if not target:
        return None
    config = department_approval_config(db, company_id, target.department_id, module)
    if config:
        if (
            config.approval_type == "two_level"
            and config.level2_employee_id
            and is_on_approved_leave_today(db, config.level1_employee_id)
        ):
            return config.level2_employee_id
        return config.level1_employee_id
    return target.reporting_manager_id


def configured_department_ids_for(db: Session, company_id: str, my_emp_id: str, module: str) -> list[str]:
    """Departments where I'm configured as Level 1 or Level 2 for this module."""
    return [
        c.department_id for c in db.query(LeaveApprovalConfig).filter(
            LeaveApprovalConfig.company_id == company_id,
            LeaveApprovalConfig.module == module,
            LeaveApprovalConfig.status == "active",
            or_(
                LeaveApprovalConfig.level1_employee_id == my_emp_id,
                LeaveApprovalConfig.level2_employee_id == my_emp_id,
            ),
        ).all()
    ]
