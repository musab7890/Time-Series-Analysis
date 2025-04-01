import pandas as pd
import psycopg2
from sqlalchemy import create_engine
from fuzzywuzzy import process
import os

def get_db_data(query, connection_string):
    """Fetch data from a database using SQL query."""
    engine = create_engine(connection_string)
    return pd.read_sql(query, engine)

def get_csv_data(file_path):
    """Read CSV file into a DataFrame."""
    return pd.read_csv(file_path)

def map_columns(source_columns, predefined_columns):
    """Map source columns to predefined column names using fuzzy matching."""
    column_mapping = {}
    for col in source_columns:
        best_match, score = process.extractOne(col, predefined_columns)
        column_mapping[col] = best_match if score > 80 else col  # Use best match if confidence is high
    print("Column Mapping:", column_mapping)
    return column_mapping

def transform_data(df, column_mapping):
    """Rename DataFrame columns based on mapping."""
    return df.rename(columns=column_mapping)

def load_data_to_db(df, table_name, connection_string):
    """Load DataFrame into PostgreSQL."""
    engine = create_engine(connection_string)
    df.to_sql(table_name, engine, if_exists='append', index=False)

def main():
    predefined_columns = ['id', 'name', 'email', 'age', 'location']  # Define standard column names
    connection_string = "postgresql://user:password@localhost:5432/mydatabase"

    # Define sources dynamically
    sources = {
        "db_source_1": {"type": "db", "query": "SELECT * FROM users"},
        "csv_source_2": {"type": "csv", "path": "data/source_2.csv"},
        "csv_source_3": {"type": "csv", "path": "data/source_3.csv"}  # Future-proofing
    }
    
    for source_name, source_details in sources.items():
        print(f"Processing {source_name}...")
        if source_details['type'] == 'db':
            df = get_db_data(source_details['query'], connection_string)
        elif source_details['type'] == 'csv' and os.path.exists(source_details['path']):
            df = get_csv_data(source_details['path'])
        else:
            print(f"Skipping {source_name} as the source is unavailable.")
            continue
        
        column_mapping = map_columns(df.columns, predefined_columns)
        transformed_df = transform_data(df, column_mapping)
        load_data_to_db(transformed_df, "unified_table", connection_string)
        print(f"Successfully loaded data from {source_name}.")

if __name__ == "__main__":
    main()
