import pandas as pd

df = pd.read_excel("C:\\Users\\AFC5admin\\Documents\\PIHWHITTIER.xlsx", sheet_name="MAIN BUILDING", header=4)

df = df.loc[:, ~df.columns.str.contains("^Unnamed")]
df.columns=(
    df.columns
        .str.strip()
        .str.lower()
        .str.replace("\n"," ")
        .str.replace(" ","_")            
            )

df= df.dropna(subset=["ahu_no.","filter_size","quantity"])

df["ahu_no."] = df["ahu_no."].str.strip()
df["filter_size"] = df["filter_size"].str.strip()
df["stage"] = df["stage"].str.upper().str.strip()
df["part_number"] = df["part_number"].fillna(df["filter_type"])


def parse_frequency(val):
    if pd.isna(val):
        return None
    val = str(val).lower()
    if "30" in val:
        return 30
    if "60" in val:
        return 60
    if "90" in val:
        return 90
    if "180" in val:
        return 180
    if "365" in val or "year" in val:
        return 365
    return None

df["frequency_days"] = df["frequency"].apply(parse_frequency)

df["last_serviced_date"] = pd.to_datetime(df["date_of__replacement"], errors="coerce").dt.date


print(df.columns.tolist())

