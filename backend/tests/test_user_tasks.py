"""
Test suite for User-Created Tasks feature in Task Manager
Tests: GET /api/task-templates, POST/GET /api/funds/{fund_id}/user-tasks,
       PUT /api/user-tasks/{task_id}, PUT /api/user-tasks/{task_id}/complete,
       DELETE /api/user-tasks/{task_id}, GET /api/funds/{fund_id}/all-tasks
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


class TestUserTasksAPI:
    """Test suite for user-created tasks feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store created task IDs for cleanup
        self.created_task_ids = []
        
        yield
        
        # Cleanup: Delete any tasks created during tests
        for task_id in self.created_task_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/user-tasks/{task_id}")
            except:
                pass
    
    # ============== GET /api/task-templates ==============
    
    def test_get_task_templates_returns_all_stages(self):
        """Test that task templates endpoint returns templates for all 12 pipeline stages"""
        response = self.session.get(f"{BASE_URL}/api/task-templates")
        
        assert response.status_code == 200
        templates = response.json()
        
        # Verify it's a dictionary
        assert isinstance(templates, dict)
        
        # Expected stages
        expected_stages = [
            "Investors", "Intro Email", "Opportunity Email", "Phone Call",
            "First Meeting", "Second Meeting", "Follow Up Email", "Signing Contract",
            "Signing Subscription", "Letter for Capital Call", "Money Transfer", "Transfer Date"
        ]
        
        # Verify all stages have templates
        for stage in expected_stages:
            assert stage in templates, f"Missing templates for stage: {stage}"
            assert isinstance(templates[stage], list), f"Templates for {stage} should be a list"
            assert len(templates[stage]) > 0, f"Stage {stage} should have at least one template"
        
        print(f"✓ Task templates returned for all {len(templates)} stages")
    
    def test_task_templates_have_valid_content(self):
        """Test that task templates contain valid string content"""
        response = self.session.get(f"{BASE_URL}/api/task-templates")
        
        assert response.status_code == 200
        templates = response.json()
        
        # Check a few specific templates
        assert "Send intro email" in templates.get("Intro Email", [])
        assert "Schedule phone call" in templates.get("Phone Call", [])
        assert "Send contract" in templates.get("Signing Contract", [])
        
        print("✓ Task templates contain expected content")
    
    # ============== POST /api/funds/{fund_id}/user-tasks ==============
    
    def test_create_user_task_with_all_fields(self):
        """Test creating a user task with all fields populated"""
        # First get pipeline stages to get a valid stage_id
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        assert stages_response.status_code == 200
        stages = stages_response.json()
        assert len(stages) > 0, "No pipeline stages found"
        
        stage = stages[0]  # Use first stage
        
        task_data = {
            "title": "TEST_User task with all fields",
            "stage_id": stage["id"],
            "stage_name": stage["name"],
            "investor_id": None,
            "investor_name": None,
            "priority": "high",
            "due_date": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        
        assert response.status_code == 200, f"Create task failed: {response.text}"
        task = response.json()
        
        # Store for cleanup
        self.created_task_ids.append(task["id"])
        
        # Verify response structure
        assert "id" in task
        assert task["title"] == task_data["title"]
        assert task["stage_id"] == task_data["stage_id"]
        assert task["stage_name"] == task_data["stage_name"]
        assert task["priority"] == "high"
        assert task["due_date"] == task_data["due_date"]
        assert task["status"] == "open"
        assert task["is_user_created"] == True
        assert "created_by" in task
        assert "created_at" in task
        
        print(f"✓ Created user task with ID: {task['id']}")
    
    def test_create_user_task_minimal_fields(self):
        """Test creating a user task with only required fields (title, stage)"""
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[1]  # Use second stage
        
        task_data = {
            "title": "TEST_Minimal task",
            "stage_id": stage["id"],
            "stage_name": stage["name"]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        
        assert response.status_code == 200
        task = response.json()
        self.created_task_ids.append(task["id"])
        
        # Verify defaults
        assert task["priority"] == "medium"  # Default priority
        assert task["status"] == "open"
        assert task["investor_id"] is None
        
        print("✓ Created user task with minimal fields")
    
    def test_create_user_task_with_investor(self):
        """Test creating a user task linked to an investor"""
        # Get investors
        investors_response = self.session.get(
            f"{BASE_URL}/api/investor-profiles/fund/{FUND_ID}"
        )
        assert investors_response.status_code == 200
        investors = investors_response.json()
        
        if len(investors) == 0:
            pytest.skip("No investors found for testing")
        
        investor = investors[0]
        
        # Get stages
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[2]
        
        task_data = {
            "title": "TEST_Task with investor",
            "stage_id": stage["id"],
            "stage_name": stage["name"],
            "investor_id": investor["id"],
            "priority": "medium"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        
        assert response.status_code == 200
        task = response.json()
        self.created_task_ids.append(task["id"])
        
        # Verify investor is linked
        assert task["investor_id"] == investor["id"]
        assert task["investor_name"] == investor["investor_name"]
        
        print(f"✓ Created user task linked to investor: {investor['investor_name']}")
    
    def test_create_user_task_invalid_fund(self):
        """Test creating a task for non-existent fund returns 404"""
        task_data = {
            "title": "TEST_Invalid fund task",
            "stage_id": "some-stage-id",
            "stage_name": "Some Stage"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/funds/invalid-fund-id/user-tasks",
            json=task_data
        )
        
        assert response.status_code == 404
        print("✓ Invalid fund returns 404")
    
    # ============== GET /api/funds/{fund_id}/user-tasks ==============
    
    def test_get_user_tasks_returns_only_user_created(self):
        """Test that GET user-tasks returns only user-created tasks"""
        # Create a test task first
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[0]
        
        task_data = {
            "title": "TEST_Get user tasks test",
            "stage_id": stage["id"],
            "stage_name": stage["name"],
            "priority": "low"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        assert create_response.status_code == 200
        created_task = create_response.json()
        self.created_task_ids.append(created_task["id"])
        
        # Get user tasks
        response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "fund_id" in data
        assert "total_tasks" in data
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        
        # Verify all tasks are user-created
        for task in data["tasks"]:
            assert task.get("is_user_created") == True
        
        # Verify our created task is in the list
        task_ids = [t["id"] for t in data["tasks"]]
        assert created_task["id"] in task_ids
        
        print(f"✓ GET user-tasks returned {data['total_tasks']} user-created tasks")
    
    # ============== GET /api/funds/{fund_id}/all-tasks ==============
    
    def test_get_all_tasks_returns_combined(self):
        """Test that all-tasks endpoint returns both system and user tasks"""
        response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/all-tasks")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "fund_id" in data
        assert "total_tasks" in data
        assert "system_tasks_count" in data
        assert "user_tasks_count" in data
        assert "overdue_count" in data
        assert "tasks" in data
        
        # Verify counts add up
        assert data["total_tasks"] == data["system_tasks_count"] + data["user_tasks_count"]
        
        # Verify tasks have is_user_created flag
        for task in data["tasks"]:
            assert "is_user_created" in task
        
        # Count user vs system tasks
        user_count = len([t for t in data["tasks"] if t["is_user_created"]])
        system_count = len([t for t in data["tasks"] if not t["is_user_created"]])
        
        assert user_count == data["user_tasks_count"]
        assert system_count == data["system_tasks_count"]
        
        print(f"✓ All-tasks returned {data['system_tasks_count']} system + {data['user_tasks_count']} user tasks = {data['total_tasks']} total")
    
    def test_all_tasks_sorted_correctly(self):
        """Test that all-tasks are sorted by overdue first, then priority"""
        response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/all-tasks")
        
        assert response.status_code == 200
        tasks = response.json()["tasks"]
        
        if len(tasks) < 2:
            pytest.skip("Not enough tasks to test sorting")
        
        # Verify overdue tasks come first
        found_non_overdue = False
        for task in tasks:
            if not task.get("is_overdue", False):
                found_non_overdue = True
            elif found_non_overdue:
                # Found overdue after non-overdue - sorting is wrong
                pytest.fail("Overdue tasks should come before non-overdue tasks")
        
        print("✓ Tasks are sorted correctly (overdue first)")
    
    # ============== PUT /api/user-tasks/{task_id}/complete ==============
    
    def test_complete_user_task(self):
        """Test marking a user task as complete"""
        # Create a task
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[0]
        
        task_data = {
            "title": "TEST_Task to complete",
            "stage_id": stage["id"],
            "stage_name": stage["name"]
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        task = create_response.json()
        self.created_task_ids.append(task["id"])
        
        # Complete the task
        complete_response = self.session.put(
            f"{BASE_URL}/api/user-tasks/{task['id']}/complete"
        )
        
        assert complete_response.status_code == 200
        result = complete_response.json()
        assert result["message"] == "Task marked as complete"
        assert result["task_id"] == task["id"]
        
        # Verify task is no longer in active tasks
        user_tasks_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks")
        active_task_ids = [t["id"] for t in user_tasks_response.json()["tasks"]]
        assert task["id"] not in active_task_ids
        
        print("✓ Task completed and removed from active list")
    
    def test_complete_task_reduces_count(self):
        """Test that completing a task reduces the total count"""
        # Get initial count
        initial_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/all-tasks")
        initial_count = initial_response.json()["total_tasks"]
        
        # Create a task
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[0]
        
        task_data = {
            "title": "TEST_Count reduction test",
            "stage_id": stage["id"],
            "stage_name": stage["name"]
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        task = create_response.json()
        self.created_task_ids.append(task["id"])
        
        # Verify count increased
        after_create_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/all-tasks")
        after_create_count = after_create_response.json()["total_tasks"]
        assert after_create_count == initial_count + 1
        
        # Complete the task
        self.session.put(f"{BASE_URL}/api/user-tasks/{task['id']}/complete")
        
        # Verify count decreased
        after_complete_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/all-tasks")
        after_complete_count = after_complete_response.json()["total_tasks"]
        assert after_complete_count == initial_count
        
        print("✓ Completing task reduces total count correctly")
    
    def test_complete_nonexistent_task(self):
        """Test completing a non-existent task returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/user-tasks/nonexistent-task-id/complete"
        )
        
        assert response.status_code == 404
        print("✓ Completing non-existent task returns 404")
    
    # ============== DELETE /api/user-tasks/{task_id} ==============
    
    def test_delete_user_task(self):
        """Test deleting a user task"""
        # Create a task
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[0]
        
        task_data = {
            "title": "TEST_Task to delete",
            "stage_id": stage["id"],
            "stage_name": stage["name"]
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        task = create_response.json()
        # Don't add to cleanup list since we're deleting it
        
        # Delete the task
        delete_response = self.session.delete(
            f"{BASE_URL}/api/user-tasks/{task['id']}"
        )
        
        assert delete_response.status_code == 200
        result = delete_response.json()
        assert result["message"] == "Task deleted"
        
        # Verify task is gone
        user_tasks_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks")
        task_ids = [t["id"] for t in user_tasks_response.json()["tasks"]]
        assert task["id"] not in task_ids
        
        print("✓ Task deleted successfully")
    
    def test_delete_nonexistent_task(self):
        """Test deleting a non-existent task returns 404"""
        response = self.session.delete(
            f"{BASE_URL}/api/user-tasks/nonexistent-task-id"
        )
        
        assert response.status_code == 404
        print("✓ Deleting non-existent task returns 404")
    
    # ============== PUT /api/user-tasks/{task_id} ==============
    
    def test_update_user_task(self):
        """Test updating a user task"""
        # Create a task
        stages_response = self.session.get(f"{BASE_URL}/api/funds/{FUND_ID}/pipeline-stages")
        stages = stages_response.json()
        stage = stages[0]
        
        task_data = {
            "title": "TEST_Task to update",
            "stage_id": stage["id"],
            "stage_name": stage["name"],
            "priority": "low"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/funds/{FUND_ID}/user-tasks",
            json=task_data
        )
        task = create_response.json()
        self.created_task_ids.append(task["id"])
        
        # Update the task
        update_data = {
            "title": "TEST_Updated task title",
            "priority": "high",
            "due_date": (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/user-tasks/{task['id']}",
            json=update_data
        )
        
        assert update_response.status_code == 200
        updated_task = update_response.json()
        
        assert updated_task["title"] == update_data["title"]
        assert updated_task["priority"] == "high"
        assert updated_task["due_date"] == update_data["due_date"]
        
        print("✓ Task updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
