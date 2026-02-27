# ── redistributor.py ─────────────────────────────────────────────
# When a machine hits High risk, shifts its workload to healthy machines

from config import (
    MACHINES,
    MAX_LOAD_CAPACITY,
    MAX_LOAD_THRESHOLD,
    REDISTRIBUTION_TRIGGER
)

# Tracks current load for each machine (starts at 50% for demo)
machine_loads = {m["machine_id"]: 50 for m in MACHINES}

def get_machine_load(machine_id):
    """Returns current load percentage for a machine."""
    return machine_loads.get(machine_id, 50)

def set_machine_load(machine_id, load):
    """Updates load for a machine."""
    machine_loads[machine_id] = min(load, MAX_LOAD_CAPACITY)

def find_available_machines(source_machine_id, all_scores):
    """
    Finds machines that can absorb extra workload.
    Must be:
    - Not the source machine
    - Low risk (anomaly score below 0.3)
    - Load below 80%
    """
    available = []

    for machine in MACHINES:
        mid = machine["machine_id"]

        # Skip the machine that is failing
        if mid == source_machine_id:
            continue

        # Skip machines that are not healthy
        score = all_scores.get(mid, 0)
        if score >= REDISTRIBUTION_TRIGGER:
            continue

        # Skip machines that are too loaded
        current_load = get_machine_load(mid)
        if current_load >= MAX_LOAD_THRESHOLD:
            continue

        available.append({
            "machine_id":   mid,
            "name":         machine["name"],
            "type":         machine["type"],
            "current_load": current_load,
            "available_capacity": MAX_LOAD_THRESHOLD - current_load
        })

    # Sort by most available capacity first
    available.sort(key=lambda x: x["available_capacity"], reverse=True)
    return available

def redistribute_workload(source_machine_id, source_load, all_scores):
    """
    Main redistribution function.
    Takes load from failing machine and spreads it to healthy ones.

    Returns full redistribution plan for the API and dashboard.
    """
    available = find_available_machines(source_machine_id, all_scores)

    if not available:
        return {
            "status": "No available machines for redistribution",
            "source_machine_id": source_machine_id,
            "redistributed_to": []
        }

    # Split the load across available machines evenly
    load_per_machine = round(source_load / len(available), 1)
    redistribution_plan = []

    for machine in available:
        mid         = machine["machine_id"]
        old_load    = machine["current_load"]
        new_load    = old_load + load_per_machine

        # Update the load
        set_machine_load(mid, new_load)

        redistribution_plan.append({
            "machine_id":  mid,
            "name":        machine["name"],
            "load_before": old_load,
            "load_added":  load_per_machine,
            "load_after":  round(new_load, 1)
        })

    # Set source machine load to 0 (taken offline)
    set_machine_load(source_machine_id, 0)

    # Find source machine name
    source_name = next(
        (m["name"] for m in MACHINES if m["machine_id"] == source_machine_id),
        f"Machine {source_machine_id}"
    )

    return {
        "status":            "Workload successfully redistributed",
        "source_machine_id": source_machine_id,
        "source_machine":    source_name,
        "load_redistributed": source_load,
        "redistributed_to":  redistribution_plan
    }

def reset_loads():
    """Resets all machine loads back to 50% — useful for demo."""
    for m in MACHINES:
        machine_loads[m["machine_id"]] = 50