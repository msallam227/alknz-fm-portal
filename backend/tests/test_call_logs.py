"""
Test suite for Call Logs feature in Communication Center
Tests: GET /api/call-outcomes, GET/POST /api/funds/{fund_id}/call-logs, 
       GET/PUT/DELETE /api/call-logs/{call_log_id}
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FUND_MANAGER_EMAIL = "mariam@alknzventures.com"
FUND_MANAGER_PASSWORD = "Mariam123!"
FUND_ID = "eea15889-0c70-4c6b-b02f-1b4d32596d27"


class TestCallLogsAPI:
    """Call Logs API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        self.token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store created call log IDs for cleanup
        self.created_call_logs = []
        self.created_tasks = []
        
        yield
        
        # Cleanup: Delete test call logs
        for call_log_id in self.created_call_logs:
            try:
                self.session.delete(f"{BASE_URL}/api/call-logs/{call_log_id}")
            except:
                pass
        
        # Cleanup: Delete test tasks
        for task_id in self.created_tasks:
            try:
                self.session.delete(f"{BASE_URL}/api/user-tasks/{task_id}")
            except:
                pass
    
    # ============== GET /api/call-outcomes Tests ==============
    
    def test_get_call_outcomes_returns_valid_options(self):
        """GET /api/call-outcomes returns valid outcome options"""
        response = self.session.get(f"{BASE_URL}/api/call-outcomes")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "outcomes" in data
        assert "labels" in data
        
        # Verify expected outcomes
        expected_outcomes = ["no_answer", "connected", "interested", "not_interested", "follow_up_needed"]
        assert data["outcomes"] == expected_outcomes
        
        # Verify labels exist for all outcomes
        for outcome in expected_outcomes:
            assert outcome in data["labels"]
            assert isinstance(data["labels"][outcome], str)
        
        print(f"✓ GET /api/call-outcomes returns {len(data['outcomes'])} valid outcomes")
    
    # ============== GET /api/funds/{fund_id}/call-logs Tests ==============
    
    def test_get_call_logs_for_fund(self):
        """GET /api/funds/{fund_id}/call-logs returns call logs for the fund"""
        response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "fund_id" in data
        assert "total" in data
        assert "call_logs" in data
        assert data["fund_id"] == FUND_ID
        assert isinstance(data["call_logs"], list)
        
        print(f"✓ GET /api/funds/{FUND_ID}/call-logs returns {data['total']} call logs")
    
    def test_get_call_logs_with_investor_filter(self):
        """GET /api/funds/{fund_id}/call-logs with investor_id filter works"""
        # First get investors for the fund
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        assert investors_response.status_code == 200
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor_id = investors[0]["id"]
        
        # Get call logs filtered by investor
        response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs?investor_id={investor_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all returned logs are for the specified investor
        for log in data["call_logs"]:
            assert log["investor_id"] == investor_id
        
        print(f"✓ GET /api/funds/{FUND_ID}/call-logs?investor_id={investor_id} returns {data['total']} filtered logs")
    
    def test_get_call_logs_with_date_range_filter(self):
        """GET /api/funds/{fund_id}/call-logs with date range filters works"""
        # Use a wide date range to include all logs
        start_date = (datetime.now() - timedelta(days=365)).isoformat()
        end_date = (datetime.now() + timedelta(days=1)).isoformat()
        
        response = self.session.get(
            f"{BASE_URL}/api/funds/{FUND_ID}/call-logs?start_date={start_date}&end_date={end_date}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["call_logs"], list)
        
        print(f"✓ GET /api/funds/{FUND_ID}/call-logs with date range returns {data['total']} logs")
    
    # ============== POST /api/funds/{fund_id}/call-logs Tests ==============
    
    def test_create_call_log_without_task(self):
        """POST /api/funds/{fund_id}/call-logs creates a call log without task"""
        # Get an investor
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        assert investors_response.status_code == 200
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        
        # Create call log
        call_data = {
            "investor_id": investor["id"],
            "call_datetime": datetime.now().isoformat(),
            "outcome": "connected",
            "notes": "TEST_call_log - Test call notes",
            "next_step": "Schedule follow-up meeting",
            "create_task": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Track for cleanup
        self.created_call_logs.append(data["id"])
        
        # Verify response
        assert data["investor_id"] == investor["id"]
        assert data["investor_name"] == investor["investor_name"]
        assert data["outcome"] == "connected"
        assert data["notes"] == "TEST_call_log - Test call notes"
        assert data["next_step"] == "Schedule follow-up meeting"
        assert data["task_created"] == False
        assert data["task_id"] is None
        assert "id" in data
        assert "created_at" in data
        
        print(f"✓ POST /api/funds/{FUND_ID}/call-logs creates call log without task")
    
    def test_create_call_log_with_task(self):
        """POST /api/funds/{fund_id}/call-logs with create_task=true creates both call log and user task"""
        # Get an investor
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        assert investors_response.status_code == 200
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        
        # Create call log with task
        call_data = {
            "investor_id": investor["id"],
            "call_datetime": datetime.now().isoformat(),
            "outcome": "follow_up_needed",
            "notes": "TEST_call_log - Needs follow-up",
            "next_step": "Send proposal",
            "create_task": True,
            "task_title": f"TEST_task - Follow up with {investor['investor_name']}",
            "task_priority": "high",
            "task_due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        }
        
        response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Track for cleanup
        self.created_call_logs.append(data["id"])
        if data.get("task_id"):
            self.created_tasks.append(data["task_id"])
        
        # Verify call log
        assert data["investor_id"] == investor["id"]
        assert data["outcome"] == "follow_up_needed"
        assert data["task_created"] == True
        assert data["task_id"] is not None
        
        # Verify task was created
        task_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks")
        assert task_response.status_code == 200
        task_data = task_response.json()
        tasks = task_data.get("tasks", [])
        
        # Find the created task
        created_task = next((t for t in tasks if t["id"] == data["task_id"]), None)
        assert created_task is not None
        assert created_task["investor_id"] == investor["id"]
        assert created_task["priority"] == "high"
        
        print(f"✓ POST /api/funds/{FUND_ID}/call-logs with create_task=true creates call log and task")
    
    def test_create_call_log_validates_outcome(self):
        """POST /api/funds/{fund_id}/call-logs validates outcome field"""
        # Get an investor
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        assert investors_response.status_code == 200
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        
        # Try to create call log with invalid outcome
        call_data = {
            "investor_id": investor["id"],
            "call_datetime": datetime.now().isoformat(),
            "outcome": "invalid_outcome",
            "create_task": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        
        assert response.status_code == 400
        assert "Invalid outcome" in response.json().get("detail", "")
        
        print(f"✓ POST /api/funds/{FUND_ID}/call-logs validates outcome field")
    
    def test_create_call_log_validates_investor(self):
        """POST /api/funds/{fund_id}/call-logs validates investor exists"""
        call_data = {
            "investor_id": "non-existent-investor-id",
            "call_datetime": datetime.now().isoformat(),
            "outcome": "connected",
            "create_task": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        
        assert response.status_code == 404
        assert "Investor not found" in response.json().get("detail", "")
        
        print(f"✓ POST /api/funds/{FUND_ID}/call-logs validates investor exists")
    
    # ============== PUT /api/call-logs/{call_log_id} Tests ==============
    
    def test_update_call_log(self):
        """PUT /api/call-logs/{call_log_id} updates call log fields"""
        # First create a call log
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        
        # Create call log
        call_data = {
            "investor_id": investor["id"],
            "call_datetime": datetime.now().isoformat(),
            "outcome": "no_answer",
            "notes": "TEST_call_log - Original notes",
            "create_task": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        assert create_response.status_code == 200
        call_log = create_response.json()
        self.created_call_logs.append(call_log["id"])
        
        # Update call log
        update_data = {
            "outcome": "connected",
            "notes": "TEST_call_log - Updated notes",
            "next_step": "Send follow-up email"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/call-logs/{call_log['id']}", json=update_data)
        
        assert update_response.status_code == 200
        updated = update_response.json()
        
        # Verify updates
        assert updated["outcome"] == "connected"
        assert updated["notes"] == "TEST_call_log - Updated notes"
        assert updated["next_step"] == "Send follow-up email"
        assert updated["updated_at"] != call_log["created_at"]
        
        print(f"✓ PUT /api/call-logs/{call_log['id']} updates call log fields")
    
    def test_update_call_log_not_found(self):
        """PUT /api/call-logs/{call_log_id} returns 404 for non-existent log"""
        update_data = {"outcome": "connected"}
        
        response = self.session.put(f"{BASE_URL}/api/call-logs/non-existent-id", json=update_data)
        
        assert response.status_code == 404
        
        print(f"✓ PUT /api/call-logs/non-existent-id returns 404")
    
    # ============== DELETE /api/call-logs/{call_log_id} Tests ==============
    
    def test_delete_call_log(self):
        """DELETE /api/call-logs/{call_log_id} deletes call log"""
        # First create a call log
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        
        # Create call log
        call_data = {
            "investor_id": investor["id"],
            "call_datetime": datetime.now().isoformat(),
            "outcome": "connected",
            "notes": "TEST_call_log - To be deleted",
            "create_task": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        assert create_response.status_code == 200
        call_log = create_response.json()
        
        # Delete call log
        delete_response = self.session.delete(f"{BASE_URL}/api/call-logs/{call_log['id']}")
        
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Call log deleted"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/call-logs/{call_log['id']}")
        assert get_response.status_code == 404
        
        print(f"✓ DELETE /api/call-logs/{call_log['id']} deletes call log")
    
    def test_delete_call_log_not_found(self):
        """DELETE /api/call-logs/{call_log_id} returns 404 for non-existent log"""
        response = self.session.delete(f"{BASE_URL}/api/call-logs/non-existent-id")
        
        assert response.status_code == 404
        
        print(f"✓ DELETE /api/call-logs/non-existent-id returns 404")
    
    # ============== GET /api/call-logs/{call_log_id} Tests ==============
    
    def test_get_single_call_log(self):
        """GET /api/call-logs/{call_log_id} returns single call log"""
        # First create a call log
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        
        # Create call log
        call_data = {
            "investor_id": investor["id"],
            "call_datetime": datetime.now().isoformat(),
            "outcome": "interested",
            "notes": "TEST_call_log - Single log test",
            "create_task": False
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
        assert create_response.status_code == 200
        call_log = create_response.json()
        self.created_call_logs.append(call_log["id"])
        
        # Get single call log
        get_response = self.session.get(f"{BASE_URL}/api/call-logs/{call_log['id']}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["id"] == call_log["id"]
        assert data["investor_id"] == investor["id"]
        assert data["outcome"] == "interested"
        
        print(f"✓ GET /api/call-logs/{call_log['id']} returns single call log")
    
    # ============== All Outcomes Test ==============
    
    def test_create_call_log_with_all_outcomes(self):
        """Test creating call logs with all valid outcome types"""
        investors_response = self.session.get(f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}")
        investors = investors_response.json()
        
        if not investors:
            pytest.skip("No investors found for fund")
        
        investor = investors[0]
        outcomes = ["no_answer", "connected", "interested", "not_interested", "follow_up_needed"]
        
        for outcome in outcomes:
            call_data = {
                "investor_id": investor["id"],
                "call_datetime": datetime.now().isoformat(),
                "outcome": outcome,
                "notes": f"TEST_call_log - Testing {outcome}",
                "create_task": False
            }
            
            response = self.session.post(f"{BASE_URL}/api/funds/{FUND_ID}/call-logs", json=call_data)
            assert response.status_code == 200
            data = response.json()
            self.created_call_logs.append(data["id"])
            
            assert data["outcome"] == outcome
            assert "outcome_label" in data
        
        print(f"✓ Created call logs with all {len(outcomes)} outcome types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
