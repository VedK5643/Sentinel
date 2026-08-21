import requests
import json
import time

URL = "http://localhost:8000"
agent_id = "e8ca8685-c91e-4f12-9fa1-446cf03fab2d"

print("Starting audit run...")
start_res = requests.post(f"{URL}/agents/{agent_id}/runs")
print("Start response:", start_res.status_code, start_res.text)

if start_res.status_code == 200:
    run_id = start_res.json()["runId"]
    print(f"Streaming events for run {run_id}...")
    
    with requests.get(f"{URL}/runs/{run_id}/stream", stream=True) as r:
        for line in r.iter_lines():
            if line:
                print(line.decode('utf-8'))
