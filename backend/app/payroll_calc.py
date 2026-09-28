"""Payroll salary-breakup calculator.

Pure, DB-free function so it can be called from the employee Salary endpoints
today and reused unchanged by a future Payroll Run (per-employee-per-month
calculation) without rewriting the business rules.

Implements the "Key Business Rules" from the Payroll spec:
- LOP/attendance proration is NOT handled here (no payroll run exists yet) —
  this computes the *standard monthly* breakup off Annual CTC.
- ESI eligibility: monthly gross <= Rs 21,000 (PWD's Rs 25,000 threshold is not
  modeled — Employee has no disability flag yet).
- EPF: employee side is always 12% of Basic (capped at Rs 15,000 unless
  "EPS at actual wages" is off and admin wants full-wage EPF — see below).
  Employer side uses the org's configured rate, split into EPS (8.33%,
  always capped at Rs 15,000 basic) + the remainder to EPF proper.
"""
from __future__ import annotations

ESI_GROSS_THRESHOLD = 21000
EPF_WAGE_CAP = 15000
EPS_RATE = 0.0833
EMPLOYEE_EPF_RATE = 0.12


def _round(v: float) -> float:
    return round(float(v or 0), 2)


def _compute_statutory(
    basic: float,
    gross: float,
    *,
    epf_employer_rate: float = 12.0,
    eps_contribute: bool = True,
    eps_actual_wages: bool = False,
    vpf_percentage: float = 0.0,
    pt_slabs: list[dict] | None = None,
) -> dict:
    """EPF/ESI/PT/VPF math shared by the standard monthly breakup
    (compute_salary_breakup) and the LOP-aware payroll-run calc
    (compute_payroll_entry) — same basic/gross in, same statutory fields out."""
    pt_slabs = pt_slabs or []

    is_esi_applicable = gross > 0 and gross <= ESI_GROSS_THRESHOLD
    esi_employee = _round(gross * 0.0075) if is_esi_applicable else 0.0
    esi_employer = _round(gross * 0.0325) if is_esi_applicable else 0.0

    epf_basis = basic if eps_actual_wages else min(basic, EPF_WAGE_CAP)
    epf_employee = _round(epf_basis * EMPLOYEE_EPF_RATE)
    epf_employer_total = _round(epf_basis * (float(epf_employer_rate or 12.0) / 100))
    eps_basis = min(basic, EPF_WAGE_CAP)
    eps_amount = _round(eps_basis * EPS_RATE) if eps_contribute else 0.0
    epf_employer_fund = _round(epf_employer_total - eps_amount)

    pt_amount = 0.0
    for slab in pt_slabs:
        lo = float(slab["salary_from"])
        hi = slab.get("salary_to")
        if gross >= lo and (hi is None or gross <= float(hi)):
            pt_amount = _round(slab["pt_amount"])
            break

    vpf_amount = _round(basic * float(vpf_percentage or 0) / 100)

    return {
        "is_esi_applicable": is_esi_applicable,
        "esi_employee": esi_employee,
        "esi_employer": esi_employer,
        "epf_employee": epf_employee,
        "epf_employer_total": epf_employer_total,
        "eps_amount": eps_amount,
        "epf_employer_fund": epf_employer_fund,
        "pt_amount": pt_amount,
        "vpf_amount": vpf_amount,
    }


def compute_salary_breakup(
    *,
    ctc: float,
    earning_components: list[dict],
    epf_employer_rate: float = 12.0,
    eps_contribute: bool = True,
    eps_actual_wages: bool = False,
    vpf_percentage: float = 0.0,
    pt_slabs: list[dict] | None = None,
) -> dict:
    """
    earning_components: active EARNING SalaryComponents for the company, in
        sort_order, each {"id", "name", "calc_type", "value"}.
        calc_type is one of PERCENT_CTC | PERCENT_BASIC | FIXED | BALANCING.
    pt_slabs: [{"salary_from", "salary_to", "pt_amount"}, ...]; salary_to=None
        means "and above".
    """
    monthly_ctc = (ctc or 0) / 12
    pt_slabs = pt_slabs or []

    basic_value = 0.0
    resolved: list[dict] = []
    balancing_rows: list[dict] = []
    running_total = 0.0

    for c in earning_components:
        calc_type = c["calc_type"]
        value = float(c.get("value") or 0)
        if calc_type == "PERCENT_CTC":
            amount = monthly_ctc * value / 100
        elif calc_type == "PERCENT_BASIC":
            amount = basic_value * value / 100
        elif calc_type == "FIXED":
            amount = value
        elif calc_type == "BALANCING":
            row = {"id": c["id"], "name": c["name"], "amount": 0.0}
            resolved.append(row)
            balancing_rows.append(row)
            continue
        else:  # AUTO_STATUTORY or anything unrecognized on an earning — treat as 0
            amount = 0.0

        amount = _round(amount)
        if c["name"].strip().lower() == "basic":
            basic_value = amount
        running_total += amount
        resolved.append({"id": c["id"], "name": c["name"], "amount": amount})

    # Balancing component(s) absorb whatever's left of the CTC. Spec's example
    # (Special Allowance) is a single balancing row — if more than one is
    # configured, the remainder is split evenly between them.
    if balancing_rows:
        remainder = max(_round(monthly_ctc - running_total), 0)
        share = _round(remainder / len(balancing_rows))
        for i, row in enumerate(balancing_rows):
            row["amount"] = remainder - share * (len(balancing_rows) - 1) if i == 0 else share
            running_total += row["amount"]

    monthly_gross = _round(running_total)
    statutory = _compute_statutory(
        basic_value, monthly_gross,
        epf_employer_rate=epf_employer_rate, eps_contribute=eps_contribute,
        eps_actual_wages=eps_actual_wages, vpf_percentage=vpf_percentage, pt_slabs=pt_slabs,
    )

    return {
        "annual_ctc": _round(ctc),
        "earnings": resolved,
        "basic": basic_value,
        "monthly_gross": monthly_gross,
        **statutory,
        "net_take_home": _round(monthly_gross - statutory["epf_employee"] - statutory["esi_employee"] - statutory["pt_amount"]),
    }


def compute_payroll_entry(
    *,
    stored_breakup: dict,
    total_working_days: int,
    days_worked: float,
    epf_lop_config: str = "PRORATE",
    epf_employer_rate: float = 12.0,
    eps_contribute: bool = True,
    eps_actual_wages: bool = False,
    vpf_percentage: float = 0.0,
    pt_slabs: list[dict] | None = None,
) -> dict:
    """LOP-aware per-employee-per-month calc for a Payroll Run, built off the
    employee's already-computed standard monthly breakup (stored_breakup, from
    compute_salary_breakup). Prorates each earning by days actually worked,
    then reuses the same statutory math as the standard breakup."""
    ratio = (days_worked / total_working_days) if total_working_days else 0.0

    earnings_earned = []
    basic_earned = 0.0
    for row in stored_breakup.get("earnings", []):
        earned = _round(row["amount"] * ratio)
        if row["name"].strip().lower() == "basic":
            basic_earned = earned
        earnings_earned.append({"id": row["id"], "name": row["name"], "amount": earned})

    gross_earnings = _round(sum(r["amount"] for r in earnings_earned))

    # "Deduct PF on full basic regardless of LOP" uses the un-prorated monthly
    # basic for the EPF/EPS calc even though earnings themselves are prorated.
    basic_for_pf = stored_breakup.get("basic", 0) if epf_lop_config == "FULL_BASIC" else basic_earned

    statutory = _compute_statutory(
        basic_for_pf, gross_earnings,
        epf_employer_rate=epf_employer_rate, eps_contribute=eps_contribute,
        eps_actual_wages=eps_actual_wages, vpf_percentage=vpf_percentage, pt_slabs=pt_slabs,
    )
    total_deductions = _round(statutory["epf_employee"] + statutory["esi_employee"] + statutory["pt_amount"])

    return {
        "earnings": earnings_earned,
        "basic_earned": basic_earned,
        "gross_earnings": gross_earnings,
        **statutory,
        "total_deductions": total_deductions,
        "net_pay": _round(gross_earnings - total_deductions),
    }
