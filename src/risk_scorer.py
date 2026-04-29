import pandas as pd

WEIGHTS = {
    "circular": 35,
    "anomaly": 25,
    "pagerank": 20,
    "velocity": 10,
    "new_entity": 10,
}


def score_entities(df, cycles, pagerank):
    all_entities = set(df["seller_gstin"]) | set(df["buyer_gstin"])

    cycle_counts = {}
    for cycle in cycles:
        for node in cycle:
            cycle_counts[node] = cycle_counts.get(node, 0) + 1

    records = []
    for entity in all_entities:
        seller_rows = df[df["seller_gstin"] == entity]
        buyer_rows = df[df["buyer_gstin"] == entity]

        n_cycles = cycle_counts.get(entity, 0)
        circular_score = min(100, n_cycles * 25)

        if len(seller_rows) > 0:
            anomaly_score = float(seller_rows["anomaly_score"].mean())
        else:
            anomaly_score = 0
        anomaly_score = round(anomaly_score, 1)

        pr = pagerank.get(entity, 0)
        pagerank_score = min(100, round(pr * 2000, 1))

        if len(seller_rows) > 0:
            max_daily = seller_rows["daily_txn_count"].max()
        else:
            max_daily = 0
        velocity_score = min(100, round((max_daily / 50) * 100, 1))

        is_new = False
        if len(seller_rows) > 0 and seller_rows["seller_new"].any():
            is_new = True
        if len(buyer_rows) > 0 and buyer_rows["buyer_new"].any():
            is_new = True
        total_amount = float(seller_rows["amount"].sum()) if len(seller_rows) else 0
        new_entity_score = 0
        if is_new and total_amount > 1_000_000:
            new_entity_score = min(100, round((total_amount / 10_000_000) * 100, 1))

        composite = (
            circular_score * WEIGHTS["circular"] / 100
            + anomaly_score * WEIGHTS["anomaly"] / 100
            + pagerank_score * WEIGHTS["pagerank"] / 100
            + velocity_score * WEIGHTS["velocity"] / 100
            + new_entity_score * WEIGHTS["new_entity"] / 100
        )
        composite = round(min(100, composite), 1)

        if composite >= 70:
            status = "HIGH"
        elif composite >= 40:
            status = "MEDIUM"
        else:
            status = "LOW"

        records.append({
            "gstin": entity,
            "circular_score": circular_score,
            "anomaly_score": anomaly_score,
            "pagerank_score": pagerank_score,
            "velocity_score": velocity_score,
            "new_entity_score": new_entity_score,
            "risk_score": composite,
            "status": status,
            "in_circular_loop": entity in cycle_counts,
            "total_txn_amount": total_amount,
            "txn_count": len(seller_rows),
        })

    return pd.DataFrame(records).sort_values("risk_score", ascending=False).reset_index(drop=True)