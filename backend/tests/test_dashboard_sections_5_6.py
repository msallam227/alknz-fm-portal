"""
Test Suite for Admin Dashboard Section 5 (Investor Intelligence) and Section 6 (Execution Health)
Tests the new dashboard endpoints: /api/dashboard/investor-intelligence and /api/dashboard/execution-health
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "khaled@alknzventures.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestInvestorIntelligenceEndpoint:
    """Tests for GET /api/dashboard/investor-intelligence (Section 5)"""
    
    def test_investor_intelligence_returns_200(self, auth_headers):
        """Test that investor intelligence endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_investor_intelligence_has_required_fields(self, auth_headers):
        """Test that response contains all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        # Check all required top-level fields
        required_fields = [
            "total_investors",
            "geography",
            "investor_types",
            "avg_ticket_by_type",
            "fit_score_distribution",
            "stage_distribution",
            "generated_at"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_geography_structure(self, auth_headers):
        """Test geography data structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["geography"], list), "geography should be a list"
        
        if len(data["geography"]) > 0:
            geo = data["geography"][0]
            assert "country" in geo, "geography item should have 'country'"
            assert "count" in geo, "geography item should have 'count'"
            assert isinstance(geo["count"], int), "count should be an integer"
    
    def test_investor_types_structure(self, auth_headers):
        """Test investor types distribution structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["investor_types"], list), "investor_types should be a list"
        
        if len(data["investor_types"]) > 0:
            inv_type = data["investor_types"][0]
            assert "type" in inv_type, "investor_types item should have 'type'"
            assert "count" in inv_type, "investor_types item should have 'count'"
            assert "percentage" in inv_type, "investor_types item should have 'percentage'"
    
    def test_avg_ticket_by_type_structure(self, auth_headers):
        """Test average ticket by type structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["avg_ticket_by_type"], list), "avg_ticket_by_type should be a list"
        
        if len(data["avg_ticket_by_type"]) > 0:
            ticket = data["avg_ticket_by_type"][0]
            assert "type" in ticket, "avg_ticket_by_type item should have 'type'"
            assert "average_ticket" in ticket, "avg_ticket_by_type item should have 'average_ticket'"
            assert isinstance(ticket["average_ticket"], (int, float)), "average_ticket should be numeric"
    
    def test_fit_score_distribution_structure(self, auth_headers):
        """Test fit score (relationship strength) distribution structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["fit_score_distribution"], list), "fit_score_distribution should be a list"
        
        # Should have predefined categories
        expected_scores = ["Excellent", "Good", "Fair", "Poor", "Unknown"]
        actual_scores = [item["score"] for item in data["fit_score_distribution"]]
        
        for score in expected_scores:
            assert score in actual_scores, f"Missing fit score category: {score}"
        
        for item in data["fit_score_distribution"]:
            assert "score" in item, "fit_score item should have 'score'"
            assert "count" in item, "fit_score item should have 'count'"
            assert "percentage" in item, "fit_score item should have 'percentage'"
    
    def test_stage_distribution_structure(self, auth_headers):
        """Test stage distribution structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["stage_distribution"], list), "stage_distribution should be a list"
        
        if len(data["stage_distribution"]) > 0:
            stage = data["stage_distribution"][0]
            assert "stage" in stage, "stage_distribution item should have 'stage'"
            assert "count" in stage, "stage_distribution item should have 'count'"
            assert "percentage" in stage, "stage_distribution item should have 'percentage'"
    
    def test_total_investors_is_positive(self, auth_headers):
        """Test that total_investors is a non-negative integer"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/investor-intelligence",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["total_investors"], int), "total_investors should be an integer"
        assert data["total_investors"] >= 0, "total_investors should be non-negative"


class TestExecutionHealthEndpoint:
    """Tests for GET /api/dashboard/execution-health (Section 6)"""
    
    def test_execution_health_returns_200(self, auth_headers):
        """Test that execution health endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_execution_health_has_required_fields(self, auth_headers):
        """Test that response contains all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        data = response.json()
        
        # Check all required top-level fields
        required_fields = [
            "tasks_per_fund_manager",
            "overdue_tasks",
            "avg_response_time_days",
            "meetings",
            "bottlenecks",
            "generated_at"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
    
    def test_tasks_per_fund_manager_structure(self, auth_headers):
        """Test tasks per fund manager structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["tasks_per_fund_manager"], list), "tasks_per_fund_manager should be a list"
        
        if len(data["tasks_per_fund_manager"]) > 0:
            fm = data["tasks_per_fund_manager"][0]
            # Check required columns: FM Name, Total, Open, Done, Overdue
            assert "fund_manager" in fm, "tasks_per_fund_manager item should have 'fund_manager'"
            assert "total" in fm, "tasks_per_fund_manager item should have 'total'"
            assert "open" in fm, "tasks_per_fund_manager item should have 'open'"
            assert "completed" in fm, "tasks_per_fund_manager item should have 'completed'"
            assert "overdue" in fm, "tasks_per_fund_manager item should have 'overdue'"
            
            # Verify types
            assert isinstance(fm["total"], int), "total should be an integer"
            assert isinstance(fm["open"], int), "open should be an integer"
            assert isinstance(fm["completed"], int), "completed should be an integer"
            assert isinstance(fm["overdue"], int), "overdue should be an integer"
    
    def test_overdue_tasks_structure(self, auth_headers):
        """Test overdue tasks structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        data = response.json()
        
        overdue = data["overdue_tasks"]
        assert "total" in overdue, "overdue_tasks should have 'total'"
        assert "by_priority" in overdue, "overdue_tasks should have 'by_priority'"
        
        by_priority = overdue["by_priority"]
        assert "high" in by_priority, "by_priority should have 'high'"
        assert "medium" in by_priority, "by_priority should have 'medium'"
        assert "low" in by_priority, "by_priority should have 'low'"
    
    def test_meetings_structure(self, auth_headers):
        """Test meetings structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        data = response.json()
        
        meetings = data["meetings"]
        assert "scheduled" in meetings, "meetings should have 'scheduled'"
        assert "completed" in meetings, "meetings should have 'completed'"
        assert "completion_rate" in meetings, "meetings should have 'completion_rate'"
        
        assert isinstance(meetings["scheduled"], int), "scheduled should be an integer"
        assert isinstance(meetings["completed"], int), "completed should be an integer"
        assert isinstance(meetings["completion_rate"], (int, float)), "completion_rate should be numeric"
    
    def test_bottlenecks_structure(self, auth_headers):
        """Test bottlenecks structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data["bottlenecks"], list), "bottlenecks should be a list"
        
        if len(data["bottlenecks"]) > 0:
            bottleneck = data["bottlenecks"][0]
            assert "category" in bottleneck, "bottleneck should have 'category'"
            assert "task_count" in bottleneck, "bottleneck should have 'task_count'"
            assert "capital_blocked" in bottleneck, "bottleneck should have 'capital_blocked'"
            
            # Verify category is one of expected values
            expected_categories = ["Legal", "IC", "Documentation", "Compliance", "Other"]
            assert bottleneck["category"] in expected_categories, f"Unexpected category: {bottleneck['category']}"
    
    def test_avg_response_time_is_nullable(self, auth_headers):
        """Test that avg_response_time_days can be null or numeric"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/execution-health",
            headers=auth_headers
        )
        data = response.json()
        
        avg_time = data["avg_response_time_days"]
        assert avg_time is None or isinstance(avg_time, (int, float)), \
            "avg_response_time_days should be null or numeric"


class TestEndpointAuthentication:
    """Test authentication requirements for dashboard endpoints"""
    
    def test_investor_intelligence_requires_auth(self):
        """Test that investor intelligence endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/investor-intelligence")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_execution_health_requires_auth(self):
        """Test that execution health endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/execution-health")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
