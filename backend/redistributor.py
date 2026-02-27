# ── redistributor.py ─────────────────────────────────────────────
# Handles workload redistribution for:
#   1. High-risk machines (anomaly score > 0.6)
#   2. Shutdown / offline machines

import time
from config import (
    MACHINES,
    MAX_LOAD_CAPACITY,
    MAX_LOAD_THRESHOLD,
    REDISTRIBUTION_TRIGGER
)

# Current load per machine (starts at 50% for demo)
machine_loads = {m["machine_id"]: 50 for m in MACHINES}

# Shutdown state: machine_id -> True if offline
machine_shutdown = {m["machine_id"]: False for m in MACHINES}

# Redistribution history log
redistribution_log = []

def get_machine_load(machine_id):
    return machine_loads.get(machine_id, 50)

def set_machine_load(machine_id, load):
    machine_loads[machine_id] = min(load, MAX_LOAD_CAPACITY)

def is_machine_shutdown(machine_id):
    return machine_shutdown.get(machine_id, False)

def shutdown_machine(machine_id):
    """Take a machine offline and redistribute its load automatically."""
    machine_shutdown[machine_id] = True
    source_load = get_machine_load(machine_id)

    # Build scores for all machines (treat shutdown machines as score 1.0)
    all_scores = {}
    for m in MACHINES:
        mid = m["machine_id"]
        if machine_shutdown.get(mid, False):
            all_scores[mid] = 1.0  # offline = treat as high risk
        else:
            all_scores[mid] = 0.1  # default healthy score for redistribution search

    plan = redistribute_workload(
        source_machine_id=machine_id,
        source_load=source_load,
        all_scores=all_scores,
        reason="shutdown"
    )
    return plan

def restore_machine(machine_id):
    """Bring a machine back online and return load to baseline."""
    machine_shutdown[machine_id] = False
    machine_loads[machine_id] = 50

    source_name = next(
        (m["name"] for m in MACHINES if m["machine_id"] == machine_id),
        f"Machine {machine_id}"
    )

    # Log the restore event
    event = {
        "event":       "machine_restored",
        "machine_id":  machine_id,
        "machine_name": source_name,
        "timestamp":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "message":     f"{source_name} is back online. Load reset to 50%."
    }
    redistribution_log.append(event)
    return event

def find_available_machines(source_machine_id, all_scores):
    """
    Find machines that can absorb workload.
    Must be: not the source, not shutdown, low anomaly score, load < 80%.
    """
    available = []
    for machine in MACHINES:
        mid = machine["machine_id"]
        if mid == source_machine_id:
            continue
        if machine_shutdown.get(mid, False):
            continue
        score = all_scores.get(mid, 0)
        if score >= REDISTRIBUTION_TRIGGER:
            continue
        current_load = get_machine_load(mid)
        if current_load >= MAX_LOAD_THRESHOLD:
            continue
        available.append({
            "machine_id":         mid,
            "name":               machine["name"],
            "type":               machine["type"],
            "current_load":       current_load,
            "available_capacity": MAX_LOAD_THRESHOLD - current_load,
        })
    available.sort(key=lambda x: x["available_capacity"], reverse=True)
    return available

def redistribute_workload(source_machine_id, source_load, all_scores, reason="high_risk"):
    """
    Redistribute load from a failing or shutdown machine to healthy neighbours.
    reason: "high_risk" | "shutdown"
    """
    available = find_available_machines(source_machine_id, all_scores)

    source_name = next(
        (m["name"] for m in MACHINES if m["machine_id"] == source_machine_id),
        f"Machine {source_machine_id}"
    )

    if not available:
        event = {
            "status":            "No available machines for redistribution",
            "reason":            reason,
            "source_machine_id": source_machine_id,
            "source_machine":    source_name,
            "redistributed_to":  [],
            "timestamp":         time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        redistribution_log.append(event)
        return event

    load_per_machine = round(source_load / len(available), 1)
    redistribution_plan = []

    for machine in available:
        mid      = machine["machine_id"]
        old_load = machine["current_load"]
        new_load = old_load + load_per_machine
        set_machine_load(mid, new_load)
        redistribution_plan.append({
            "machine_id":  mid,
            "name":        machine["name"],
            "load_before": old_load,
            "load_added":  load_per_machine,
            "load_after":  round(new_load, 1),
        })

    # Source machine goes to 0 load
    set_machine_load(source_machine_id, 0)

    event = {
        "status":             "Workload successfully redistributed",
        "reason":             reason,
        "source_machine_id":  source_machine_id,
        "source_machine":     source_name,
        "load_redistributed": source_load,
        "redistributed_to":   redistribution_plan,
        "timestamp":          time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    redistribution_log.append(event)
    return event

def get_redistribution_log(limit=20):
    """Return the most recent redistribution events."""
    return list(reversed(redistribution_log[-limit:]))

def reset_loads():
    """Reset all machine loads to 50% and clear shutdown states."""
    for m in MACHINES:
        machine_loads[m["machine_id"]] = 50
        machine_shutdown[m["machine_id"]] = False
