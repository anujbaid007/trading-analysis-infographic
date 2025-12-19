import pandas as pd
import os
import glob
import json
import re
from datetime import datetime

# Configuration
DATA_DIR = "/Users/anuj/Desktop/AKB Equity"
OUTPUT_FILE = "/Users/anuj/Desktop/AKB Equity/trading_analysis_infographic/data.js"

ENTITY_MAP = {
    "BL2333": "Anurita",
    "CG6535": "Aruna",
    "RH3979": "AKB"
}

def get_entity_from_filename(filename):
    for code, name in ENTITY_MAP.items():
        if code in filename:
            return name
    return "Unknown"

def find_header_row(file_path):
    # Read first 50 rows to find "Symbol"
    try:
        df = pd.read_excel(file_path, header=None, nrows=50)
        for idx, row in df.iterrows():
            # Check if likely header row
            row_str = row.astype(str).str.lower().tolist()
            if "symbol" in row_str or "scrip" in row_str:
                return idx
    except Exception as e:
        print(f"Error finding header in {file_path}: {e}")
    return -1

def get_fiscal_year(file_path):
    # Identify FY from the "date range" usually in line 10-15
    try:
        df = pd.read_excel(file_path, header=None, nrows=20)
        # Look for text like "from 2024-04-01"
        content = df.to_string()
        match = re.search(r'(\d{4})-\d{2}-\d{2}\s+to', content)
        if match:
            start_year = int(match.group(1))
            return start_year # 2024 for FY24-25
    except Exception as e:
        print(f"Error finding FY in {file_path}: {e}")
    return 2024 # Default

def process_file(file_path):
    print(f"Processing {file_path}...")
    filename = os.path.basename(file_path)
    entity = get_entity_from_filename(filename)
    
    start_year = get_fiscal_year(file_path) # 2024 or 2025
    fy_label = f"FY{str(start_year)[-2:]}-{str(start_year+1)[-2:]}"
    
    header_idx = find_header_row(file_path)
    if header_idx == -1:
        print(f"Could not find header for {filename}")
        return []

    # Read actual data
    df = pd.read_excel(file_path, header=header_idx)
    
    # Normalize columns
    df.columns = [str(c).strip() for c in df.columns]
    
    # Identify key columns
    symbol_col = next((c for c in df.columns if 'symbol' in c.lower()), None)
    realized_col = next((c for c in df.columns if 'realized p&l' in c.lower() and 'pct' not in c.lower()), None)
    unrealized_col = next((c for c in df.columns if 'unrealized p&l' in c.lower() and 'pct' not in c.lower()), None)
    
    if not symbol_col:
        print(f"Missing Symbol column in {filename}")
        return []

    records = []
    
    for _, row in df.iterrows():
        try:
            symbol = row[symbol_col]
            if pd.isna(symbol) or str(symbol).strip() == "" or str(symbol).lower() == "nan" or str(symbol).lower() == "total":
                continue
                
            realized = float(row[realized_col]) if realized_col and pd.notna(row[realized_col]) else 0.0
            unrealized = float(row[unrealized_col]) if unrealized_col and pd.notna(row[unrealized_col]) else 0.0
            
            # Application Logic
            # FY24-25: Ignore Unrealized
            if start_year == 2024:
                unrealized = 0.0
            
            # FY25-26: Keep both (default)
            
            records.append({
                "Entity": entity,
                "FY": fy_label,
                "Symbol": str(symbol).strip(),
                "Realized": realized,
                "Unrealized": unrealized,
                "Total": realized + unrealized
            })
            
        except Exception as e:
            # print(f"Skipping row: {e}")
            continue
            
    return records

def main():
    all_data = []
    files = glob.glob(os.path.join(DATA_DIR, "*.xlsx"))
    
    for f in files:
        if "~$" in f: continue # Skip lock files
        records = process_file(f)
        all_data.extend(records)
        
    # Aggregate data for clean frontend usage
    # Structure: { Entity: { Script: { Realized, Unrealized, Total } } }
    
    aggregated = {
        "Overall": {},
        "Anurita": {},
        "Aruna": {},
        "AKB": {}
    }
    
    for rec in all_data:
        entity = rec["Entity"]
        symbol = rec["Symbol"]
        
        # Add to Entity bucket
        if symbol not in aggregated[entity]:
            aggregated[entity][symbol] = {"Realized": 0, "Unrealized": 0, "Total": 0}
        
        aggregated[entity][symbol]["Realized"] += rec["Realized"]
        aggregated[entity][symbol]["Unrealized"] += rec["Unrealized"]
        aggregated[entity][symbol]["Total"] += rec["Total"]
        
        # Add to Overall bucket
        if symbol not in aggregated["Overall"]:
            aggregated["Overall"][symbol] = {"Realized": 0, "Unrealized": 0, "Total": 0}
            
        aggregated["Overall"][symbol]["Realized"] += rec["Realized"]
        aggregated["Overall"][symbol]["Unrealized"] += rec["Unrealized"]
        aggregated["Overall"][symbol]["Total"] += rec["Total"]

    # Convert to list for easier charting: { Entity: [ {Symbol, Realized, ...} ] }
    final_output = {}
    for key in aggregated:
        final_output[key] = []
        for sym, vals in aggregated[key].items():
            final_output[key].append({
                "Symbol": sym,
                "Realized": round(vals["Realized"], 2),
                "Unrealized": round(vals["Unrealized"], 2),
                "Total": round(vals["Total"], 2)
            })
            
    # Write to JS file
    js_content = f"const TRADING_DATA = {json.dumps(final_output, indent=2)};"
    
    with open(OUTPUT_FILE, 'w') as f:
        f.write(js_content)
    
    print(f"Data successfully generated at {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
