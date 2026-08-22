from sqlalchemy import text
from database import engine

def upgrade():
    with engine.begin() as conn:
        print("Adding tool_call_loop_score...")
        conn.execute(text("ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS tool_call_loop_score FLOAT DEFAULT 0.0;"))
        
        print("Adding hallucinated_confidence_score...")
        conn.execute(text("ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS hallucinated_confidence_score FLOAT DEFAULT 0.0;"))
        
        print("Adding destructive_action_score...")
        conn.execute(text("ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS destructive_action_score FLOAT DEFAULT 0.0;"))
        
        print("Adding goal_drift_score...")
        conn.execute(text("ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS goal_drift_score FLOAT DEFAULT 0.0;"))
        
        print("Success.")

if __name__ == "__main__":
    upgrade()
