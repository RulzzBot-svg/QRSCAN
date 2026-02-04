import sys
import pandas as pd
from seed_from_excel import EXCEL_PATH

if len(sys.argv) < 2:
    print('Usage: python debug_print_rows.py <sheet_name>')
    sys.exit(1)

sheet = sys.argv[1]

df = pd.read_excel(EXCEL_PATH, sheet_name=sheet, header=4)
# normalize columns
cols = [str(c).strip() for c in df.columns]
df.columns = cols

wanted = ['AHU NO.', 'LOCATION', 'STAGE', 'FILTER SIZE', 'QUANTITY', 'FREQUENCY', 'PART NUMBER', 'FILTER TYPE', 'DATE OF REPLACEMENT']
present = [c for c in wanted if c in df.columns]
print(f"Sheet: {sheet} - showing first 80 rows for columns: {present}")
print('='*80)
print(df[present].head(80).to_string(index=True))
