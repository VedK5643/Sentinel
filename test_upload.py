import requests

with open("c:/Users/Administrator/Downloads/test_agent.json", "rb") as f:
    files = {"file": f}
    # Wait, what is the port? Let's check package.json or something.
    res = requests.post("http://localhost:8000/agents/upload", files=files)
    print("Status code:", res.status_code)
    try:
        print("Response JSON:", res.json())
    except:
        print("Response text:", res.text)
