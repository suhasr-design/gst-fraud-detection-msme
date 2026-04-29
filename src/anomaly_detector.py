import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def detect_invoice_anomalies(df, contamination=0.1):
    df = df.copy()
    features = ["log_amount", "daily_txn_count", "seller_age_days", "buyer_age_days"]
    clean = df[features].fillna(0)

    if len(clean) < 2:
        df["anomaly_score"] = 0
        df["is_anomaly"] = False
        return df

    scaler = StandardScaler()
    X = scaler.fit_transform(clean)

    clf = IsolationForest(
        n_estimators=100, contamination=contamination, random_state=42
    )
    clf.fit(X)
    raw_scores = clf.score_samples(X)

    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s == min_s:
        normalised = np.zeros_like(raw_scores)
    else:
        normalised = 100 * (1 - (raw_scores - min_s) / (max_s - min_s))

    df["anomaly_score"] = normalised
    df["is_anomaly"] = clf.predict(X) == -1
    return df


def temporal_velocity_check(df, threshold=20):
    df = df.copy()
    df["velocity_flag"] = df["daily_txn_count"] > threshold
    return df