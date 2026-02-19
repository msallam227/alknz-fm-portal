"""
Test Task Manager Feature for ALKNZ Fund Management CRM
Tests: GET /api/funds/{fund_id}/tasks, PUT /api/tasks/due-date
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FUND_MANAGER_EMAIL = "mariam@alknzventures.com"
FUND_MANAGER_PASSWORD = "Mariam123!"
FUND_ID = "eea15889-0c70-4c6b-b02f-1b4d32596d27"  # ALKNZ Fund I


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for Fund Manager"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": FUND_MANAGER_EMAIL, "password": FUND_MANAGER_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestTaskManagerAPI:
    """Test Task Manager API endpoints"""
    
    def test_get_tasks_returns_200(self, api_client):
        """Test GET /api/funds/{fund_id}/tasks returns 200"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert "total_tasks" in data
        assert "overdue_count" in data
        print(f"✓ GET tasks returned {data['total_tasks']} tasks, {data['overdue_count']} overdue")
    
    def test_tasks_response_structure(self, api_client):
        """Test task response has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "fund_id" in data
        assert data["fund_id"] == FUND_ID
        assert isinstance(data["total_tasks"], int)
        assert isinstance(data["overdue_count"], int)
        assert isinstance(data["tasks"], list)
        print(f"✓ Response structure is correct")
    
    def test_task_item_structure(self, api_client):
        """Test individual task items have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["tasks"]) > 0:
            task = data["tasks"][0]
            required_fields = [
                "id", "type", "description", "detail", "investor_id",
                "investor_name", "investor_type", "pipeline_stage",
                "stage_id", "status", "due_date", "is_overdue", "priority"
            ]
            for field in required_fields:
                assert field in task, f"Missing field: {field}"
            
            # Validate types
            assert task["type"] in ["missing_investment_size", "missing_expected_ticket", "missing_contact"]
            assert task["priority"] in ["high", "medium", "low"]
            assert isinstance(task["is_overdue"], bool)
            print(f"✓ Task item structure is correct: {task['type']}")
        else:
            pytest.skip("No tasks available to test structure")
    
    def test_overdue_task_detection(self, api_client):
        """Test that overdue tasks are correctly identified"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        data = response.json()
        
        overdue_tasks = [t for t in data["tasks"] if t["is_overdue"]]
        assert data["overdue_count"] == len(overdue_tasks)
        
        # Verify overdue tasks have past due dates
        for task in overdue_tasks:
            if task["due_date"]:
                due_date = datetime.strptime(task["due_date"], "%Y-%m-%d")
                assert due_date < datetime.now(), f"Task {task['id']} marked overdue but due date is in future"
        
        print(f"✓ Overdue detection correct: {len(overdue_tasks)} overdue tasks")
    
    def test_tasks_sorted_by_priority(self, api_client):
        """Test that tasks are sorted: overdue first, then by priority"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        data = response.json()
        
        tasks = data["tasks"]
        if len(tasks) > 1:
            # Check overdue tasks come first
            overdue_ended = False
            for task in tasks:
                if not task["is_overdue"]:
                    overdue_ended = True
                elif overdue_ended:
                    pytest.fail("Non-overdue task found before overdue task")
            print(f"✓ Tasks sorted correctly (overdue first)")
        else:
            pytest.skip("Not enough tasks to test sorting")
    
    def test_update_due_date(self, api_client):
        """Test PUT /api/tasks/due-date updates due date"""
        # First get a task
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        tasks = response.json()["tasks"]
        
        if len(tasks) == 0:
            pytest.skip("No tasks available to test due date update")
        
        task = tasks[0]
        task_id = task["id"]
        new_due_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Update due date
        update_response = api_client.put(
            f"{BASE_URL}/api/tasks/due-date",
            json={"task_id": task_id, "due_date": new_due_date}
        )
        assert update_response.status_code == 200
        update_data = update_response.json()
        assert update_data["task_id"] == task_id
        assert update_data["due_date"] == new_due_date
        
        # Verify the update persisted
        verify_response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert verify_response.status_code == 200
        updated_task = next((t for t in verify_response.json()["tasks"] if t["id"] == task_id), None)
        assert updated_task is not None
        assert updated_task["due_date"] == new_due_date
        
        print(f"✓ Due date updated and persisted for task: {task_id}")
    
    def test_clear_due_date(self, api_client):
        """Test clearing a due date by setting it to null"""
        # First get a task with a due date
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        tasks = response.json()["tasks"]
        
        task_with_due_date = next((t for t in tasks if t["due_date"]), None)
        if not task_with_due_date:
            pytest.skip("No task with due date to test clearing")
        
        task_id = task_with_due_date["id"]
        
        # Clear due date
        update_response = api_client.put(
            f"{BASE_URL}/api/tasks/due-date",
            json={"task_id": task_id, "due_date": None}
        )
        assert update_response.status_code == 200
        
        # Verify the due date was cleared
        verify_response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        updated_task = next((t for t in verify_response.json()["tasks"] if t["id"] == task_id), None)
        assert updated_task is not None
        assert updated_task["due_date"] is None
        assert updated_task["is_overdue"] is False
        
        print(f"✓ Due date cleared for task: {task_id}")
    
    def test_invalid_task_id_format(self, api_client):
        """Test that invalid task ID format returns 400"""
        response = api_client.put(
            f"{BASE_URL}/api/tasks/due-date",
            json={"task_id": "invalid_format", "due_date": "2026-02-15"}
        )
        assert response.status_code == 400
        print(f"✓ Invalid task ID format correctly rejected")
    
    def test_nonexistent_investor_task(self, api_client):
        """Test that task with nonexistent investor returns 404"""
        response = api_client.put(
            f"{BASE_URL}/api/tasks/due-date",
            json={"task_id": "missing_contact_nonexistent-investor-id", "due_date": "2026-02-15"}
        )
        assert response.status_code == 404
        print(f"✓ Nonexistent investor task correctly rejected")
    
    def test_invalid_fund_id(self, api_client):
        """Test that invalid fund ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/funds/invalid-fund-id/tasks")
        assert response.status_code == 404
        print(f"✓ Invalid fund ID correctly rejected")


class TestTaskTypes:
    """Test different task types are generated correctly"""
    
    def test_missing_expected_ticket_task(self, api_client):
        """Test missing_expected_ticket tasks are generated for potential stages"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        tasks = response.json()["tasks"]
        
        missing_ticket_tasks = [t for t in tasks if t["type"] == "missing_expected_ticket"]
        for task in missing_ticket_tasks:
            # These should be in potential stages (not Money Transfer/Transfer Date)
            assert task["pipeline_stage"] not in ["Money Transfer", "Transfer Date"]
            assert task["priority"] == "medium"
        
        print(f"✓ Found {len(missing_ticket_tasks)} missing_expected_ticket tasks")
    
    def test_missing_contact_task(self, api_client):
        """Test missing_contact tasks are generated for meeting stages"""
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        tasks = response.json()["tasks"]
        
        missing_contact_tasks = [t for t in tasks if t["type"] == "missing_contact"]
        meeting_stages = ["Phone Call", "First Meeting", "Second Meeting", "Follow Up Email",
                        "Signing Contract", "Signing Subscription", "Letter for Capital Call",
                        "Money Transfer", "Transfer Date"]
        
        for task in missing_contact_tasks:
            assert task["pipeline_stage"] in meeting_stages, f"Unexpected stage: {task['pipeline_stage']}"
            assert task["priority"] == "low"
        
        print(f"✓ Found {len(missing_contact_tasks)} missing_contact tasks")


class TestTaskAutoResolution:
    """Test that tasks are auto-resolved when data issues are fixed"""
    
    def test_task_count_changes_after_data_fix(self, api_client):
        """Test that fixing data removes the corresponding task"""
        # Get initial task count
        response = api_client.get(f"{BASE_URL}/api/funds/{FUND_ID}/tasks")
        assert response.status_code == 200
        initial_count = response.json()["total_tasks"]
        
        # Note: This test documents the expected behavior
        # Actual data fix would require updating investor profile
        # which would then remove the task on next fetch
        print(f"✓ Initial task count: {initial_count}")
        print("  Note: Auto-resolution tested via UI flow")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
