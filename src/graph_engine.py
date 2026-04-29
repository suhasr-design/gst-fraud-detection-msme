import networkx as nx


def build_transaction_graph(df):
    G = nx.DiGraph()
    for _, row in df.iterrows():
        seller = row["seller_gstin"]
        buyer = row["buyer_gstin"]
        amount = float(row["amount"])

        if G.has_edge(seller, buyer):
            G[seller][buyer]["weight"] += amount
            G[seller][buyer]["count"] += 1
        else:
            G.add_edge(seller, buyer, weight=amount, count=1)
    return G


def find_circular_transactions(G, max_length=5):
    cycles = []
    try:
        for cycle in nx.simple_cycles(G):
            if 2 <= len(cycle) <= max_length:
                cycles.append(cycle)
    except Exception:
        pass
    return cycles


def compute_pagerank(G):
    if G.number_of_nodes() == 0:
        return {}
    return nx.pagerank(G, weight="weight")


def get_circular_entities(cycles):
    flagged = set()
    for cycle in cycles:
        flagged.update(cycle)
    return flagged


def graph_summary(G, cycles):
    return {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "circular_loops": len(cycles),
        "flagged_entities": len(get_circular_entities(cycles)),
    }