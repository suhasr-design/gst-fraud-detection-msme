import pandas as pd
import numpy as np


def load_and_clean(filepath):
    df = pd.read_csv(filepath)
    df["invoice_date"] = pd.to_datetime(df["invoice_date"], errors="coerce")
    df["seller_reg_date"] = pd.to_datetime(df["seller_reg_date"], errors="coerce")
    df["buyer_reg_date"] = pd.to_datetime(df["buyer_reg_date"], errors="coerce")

    df = df.dropna(subset=["seller_gstin", "buyer_gstin", "amount", "invoice_date"])
    df = df[df["amount"] > 0].copy()

    df["seller_gstin"] = df["seller_gstin"].str.upper().str.strip()
    df["buyer_gstin"] = df["buyer_gstin"].str.upper().str.strip()

    return df


def engineer_features(df):
    df = df.copy()
    today = pd.Timestamp.now()

    df["seller_age_days"] = (today - df["seller_reg_date"]).dt.days.fillna(0)
    df["buyer_age_days"] = (today - df["buyer_reg_date"]).dt.days.fillna(0)

    df["seller_new"] = df["seller_age_days"] < 365
    df["buyer_new"] = df["buyer_age_days"] < 365

    df["log_amount"] = np.log1p(df["amount"])

    df["date_only"] = df["invoice_date"].dt.date
    velocity = (
        df.groupby(["seller_gstin", "date_only"])
        .size()
        .reset_index(name="daily_txn_count")
    )
    df = df.merge(velocity, on=["seller_gstin", "date_only"], how="left")

    return df