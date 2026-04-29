import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import networkx as nx
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.data_pipeline import load_and_clean, engineer_features
from src.graph_engine import (
    build_transaction_graph,
    find_circular_transactions,
    compute_pagerank,
    graph_summary,
)
from src.anomaly_detector import detect_invoice_anomalies, temporal_velocity_check
from src.risk_scorer import score_entities

st.set_page_config(page_title="GST FraudScope", page_icon="🔍", layout="wide")

st.sidebar.title("🔍 GST FraudScope")
st.sidebar.markdown("**PS-13** Hackathon Submission")

uploaded_file = st.sidebar.file_uploader("Upload Transaction CSV", type=["csv"])
data_source = uploaded_file if uploaded_file else "data/sample_transactions.csv"

if not uploaded_file:
    st.sidebar.info("Using sample dataset")

contamination = st.sidebar.slider("Anomaly sensitivity", 0.05, 0.3, 0.1, 0.05)


@st.cache_data
def run_pipeline(_source, contamination_val):
    df = load_and_clean(_source)
    df = engineer_features(df)
    df = detect_invoice_anomalies(df, contamination=contamination_val)
    df = temporal_velocity_check(df)
    G = build_transaction_graph(df)
    cycles = find_circular_transactions(G)
    pr = compute_pagerank(G)
    summary = graph_summary(G, cycles)
    scores = score_entities(df, cycles, pr)
    return df, G, cycles, pr, summary, scores


df, G, cycles, pr, summary, scores = run_pipeline(data_source, contamination)

st.title("GST Fraud Pattern Detection")
st.caption("Transaction graph analysis · Anomaly detection · MSME risk scoring")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Entities Analysed", summary["total_nodes"])
c2.metric("Circular Loops", summary["circular_loops"])
c3.metric("High Risk Entities", int((scores["status"] == "HIGH").sum()))
c4.metric("Total Transactions", summary["total_edges"])

st.divider()
st.subheader("Entity Risk Scores")
st.dataframe(
    scores[["gstin", "risk_score", "status", "circular_score", "anomaly_score", "txn_count"]],
    use_container_width=True,
    height=300,
)

st.subheader("Transaction Network Graph")

if G.number_of_nodes() > 0:
    pos = nx.spring_layout(G, seed=42)
    circular_nodes = set(n for cycle in cycles for n in cycle)
    score_lookup = dict(zip(scores["gstin"], scores["risk_score"]))

    edge_x, edge_y, edge_circ_x, edge_circ_y = [], [], [], []
    for u, v in G.edges():
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        if u in circular_nodes and v in circular_nodes:
            edge_circ_x += [x0, x1, None]
            edge_circ_y += [y0, y1, None]
        else:
            edge_x += [x0, x1, None]
            edge_y += [y0, y1, None]

    node_x, node_y, node_text, node_color = [], [], [], []
    for node in G.nodes():
        x, y = pos[node]
        node_x.append(x)
        node_y.append(y)
        risk = score_lookup.get(node, 0)
        node_text.append(f"{node}<br>Risk: {risk}")
        node_color.append(risk)

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=edge_x, y=edge_y, mode="lines",
                             line=dict(color="#888", width=1), hoverinfo="none"))
    fig.add_trace(go.Scatter(x=edge_circ_x, y=edge_circ_y, mode="lines",
                             line=dict(color="#FF4D6A", width=3), hoverinfo="none"))
    fig.add_trace(go.Scatter(
        x=node_x, y=node_y, mode="markers+text",
        text=[n[:10] for n in G.nodes()], textposition="top center",
        hovertext=node_text, hoverinfo="text",
        marker=dict(size=20, color=node_color,
                    colorscale=[[0, "#00D4AA"], [0.5, "#FFB547"], [1, "#FF4D6A"]],
                    showscale=True, colorbar=dict(title="Risk")),
    ))
    fig.update_layout(showlegend=False, height=500,
                      margin=dict(l=0, r=0, t=0, b=0),
                      xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                      yaxis=dict(showgrid=False, zeroline=False, showticklabels=False))
    st.plotly_chart(fig, use_container_width=True)

if cycles:
    st.subheader("⚠ Circular Transaction Loops Detected")
    for i, cycle in enumerate(cycles, 1):
        st.error(f"Loop {i}:  " + " → ".join(cycle) + f" → {cycle[0]}")