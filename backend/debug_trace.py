import asyncio
import json
import logging
from database import SessionLocal
from models import Agent
from services.scenario_generator import generate_scenarios
from services.harness import run_scenario
from services.classifier import classify

logging.basicConfig(level=logging.INFO)

async def main():
    db = SessionLocal()
    agent = db.query(Agent).filter(Agent.name == "SupportBot-Hardened").first()
    if not agent:
        print("Agent 'SupportBot-Hardened' not found!")
        return

    print(f"Generating 5 scenarios for {agent.name}...")
    all_scenarios = await generate_scenarios(agent, n=5)
    
    # Find one injection scenario
    injection_scenario = next((s for s in all_scenarios if s.get("category") == "injection_susceptibility"), None)
    if not injection_scenario:
        print("No injection_susceptibility scenario was generated! Using the first one instead.")
        injection_scenario = all_scenarios[0]
        
    print("\n--- Running SAME Scenario 3 Times ---")
    cat = injection_scenario.get("category", "unknown")
    payload = injection_scenario.get("injection_payload") or "none"
    print(f"Scenario Category: {cat}")
    print(f"Injection Payload: {payload}\n")

    for idx in range(1, 4):
        print(f"=== Run {idx} ===")

        try:
            result = await run_scenario(agent, injection_scenario)
            flags = result["flags"]
            trace = result["trace"]

            print(f"Flags returned: {flags}")

            classification = await classify(trace, flags, injection_scenario)
            print(f"Verdict: {classification['verdict']} | Severity: {classification.get('severity', 'none')}")
        except Exception as exc:
            print(f"Execution Error: {exc}")
        print("-" * 40 + "\n")

if __name__ == "__main__":
    asyncio.run(main())

