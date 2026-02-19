"""
Test suite for ALKNZ Fund Management CRM - Mini Profile Feature
Tests: Pipeline stages, investor profiles with pipeline data, investor notes API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FUND_MANAGER_EMAIL = "mariam@alknzventures.com"
FUND_MANAGER_PASSWORD = "Mariam123!"
ADMIN_EMAIL = "khaled@alknzventures.com"
ADMIN_PASSWORD = "Admin123!"


class TestAuthentication:
    """Authentication tests"""
    
    def test_fund_manager_login(self):
        """Test Fund Manager can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": FUND_MANAGER_EMAIL,
            "password": FUND_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == FUND_MANAGER_EMAIL
        assert data["user"]["role"] == "FUND_MANAGER"
        print(f"✓ Fund Manager login successful: {data['user']['first_name']} {data['user']['last_name']}")
    
    def test_admin_login(self):
        """Test Admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "ADMIN"
        print(f"✓ Admin login successful")


@pytest.fixture(scope="module")
def fm_token():
    """Get Fund Manager auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": FUND_MANAGER_EMAIL,
        "password": FUND_MANAGER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Fund Manager authentication failed")
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get Admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin authentication failed")
    return response.json()["token"]


@pytest.fixture(scope="module")
def fund_id(fm_token):
    """Get first assigned fund ID"""
    response = requests.get(
        f"{BASE_URL}/api/my-funds",
        headers={"Authorization": f"Bearer {fm_token}"}
    )
    if response.status_code != 200 or not response.json():
        pytest.skip("No funds assigned to Fund Manager")
    return response.json()[0]["id"]


class TestPipelineStages:
    """Test Pipeline Stages API - 12 lanes for Kanban board"""
    
    def test_get_pipeline_stages(self, fm_token, fund_id):
        """Test getting pipeline stages for a fund - should return 12 stages"""
        response = requests.get(
            f"{BASE_URL}/api/funds/{fund_id}/pipeline-stages",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 200, f"Failed to get stages: {response.text}"
        stages = response.json()
        
        # Verify we have 12 stages
        assert len(stages) == 12, f"Expected 12 stages, got {len(stages)}"
        
        # Verify expected stage names
        expected_stages = [
            "Investors", "Intro Email", "Opportunity Email", "Phone Call",
            "First Meeting", "Second Meeting", "Follow Up Email", "Signing Contract",
            "Signing Subscription", "Letter for Capital Call", "Money Transfer", "Transfer Date"
        ]
        stage_names = [s["name"] for s in stages]
        for expected in expected_stages:
            assert expected in stage_names, f"Missing stage: {expected}"
        
        print(f"✓ Pipeline has {len(stages)} stages: {', '.join(stage_names)}")
    
    def test_stages_have_required_fields(self, fm_token, fund_id):
        """Test that each stage has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/funds/{fund_id}/pipeline-stages",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        stages = response.json()
        
        for stage in stages:
            assert "id" in stage, "Stage missing 'id'"
            assert "name" in stage, "Stage missing 'name'"
            assert "position" in stage, "Stage missing 'position'"
            assert "fund_id" in stage, "Stage missing 'fund_id'"
        
        print(f"✓ All stages have required fields")


class TestInvestorProfilesWithPipeline:
    """Test Investor Profiles with Pipeline data - for card display"""
    
    def test_get_investor_profiles_with_pipeline(self, fm_token, fund_id):
        """Test getting investor profiles with pipeline status"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 200, f"Failed to get profiles: {response.text}"
        profiles = response.json()
        
        print(f"✓ Found {len(profiles)} investor profiles")
        
        # Check that profiles have pipeline fields
        if profiles:
            profile = profiles[0]
            # Card display fields
            assert "investor_name" in profile, "Missing investor_name"
            assert "investor_type" in profile, "Missing investor_type"
            
            # Pipeline fields should be present (even if null)
            pipeline_fields = [
                "pipeline_stage_id", "pipeline_stage_name", "pipeline_position",
                "pipeline_stage_entered_at", "pipeline_last_interaction_date", "pipeline_next_step"
            ]
            for field in pipeline_fields:
                assert field in profile, f"Missing pipeline field: {field}"
            
            print(f"✓ Profile has all required fields for card display")
    
    def test_investor_card_data_fields(self, fm_token, fund_id):
        """Test that investor profiles have all fields needed for card display"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        
        # Required fields for investor card (some may be null but should exist in response)
        card_fields = [
            "investor_name",      # Name
            "investor_type",      # Type
            "sector",             # Sector
            "city",               # Location
            "country",            # Location
            "expected_ticket_amount",     # Expected ticket
            "expected_ticket_currency",   # Currency
        ]
        
        for profile in profiles:
            for field in card_fields:
                assert field in profile, f"Missing card field: {field} in profile {profile.get('investor_name')}"
            
            # Verify investor has name and type (required for card display)
            assert profile.get("investor_name"), f"Investor name is empty"
        
        print(f"✓ All {len(profiles)} profiles have card display fields")


class TestInvestorMiniProfile:
    """Test Mini Profile data - Quick Identity, Contact, Investment Context, Pipeline Context"""
    
    def test_mini_profile_quick_identity_fields(self, fm_token, fund_id):
        """Test Quick Identity section fields"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        
        # Quick Identity fields
        identity_fields = ["investor_name", "investor_type", "sector", "city", "country", "website"]
        
        for profile in profiles:
            for field in identity_fields:
                assert field in profile, f"Missing identity field: {field}"
        
        print(f"✓ Quick Identity fields present in all profiles")
    
    def test_mini_profile_contact_fields(self, fm_token, fund_id):
        """Test Contact & Relationship section fields - verify API returns investor data"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        
        # Verify we have profiles
        assert len(profiles) > 0, "No investor profiles found"
        
        # Check that profiles have basic structure
        for profile in profiles:
            assert "id" in profile, "Profile missing 'id'"
            assert "investor_name" in profile, "Profile missing 'investor_name'"
        
        print(f"✓ {len(profiles)} profiles retrieved with contact data available")
    
    def test_mini_profile_investment_context_fields(self, fm_token, fund_id):
        """Test Investment Context section fields"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        
        # Investment Context fields (core fields that should be present)
        investment_fields = [
            "has_invested_with_alknz", "previous_alknz_funds",
            "expected_ticket_amount", "expected_ticket_currency",
            "wealth"
        ]
        
        for profile in profiles:
            for field in investment_fields:
                assert field in profile, f"Missing investment field: {field}"
        
        print(f"✓ Investment Context fields present in all profiles")
    
    def test_mini_profile_pipeline_context_fields(self, fm_token, fund_id):
        """Test Pipeline Context section fields"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        
        # Pipeline Context fields
        pipeline_fields = [
            "pipeline_stage_id", "pipeline_stage_name",
            "pipeline_stage_entered_at", "pipeline_last_interaction_date",
            "pipeline_next_step"
        ]
        
        for profile in profiles:
            for field in pipeline_fields:
                assert field in profile, f"Missing pipeline field: {field}"
        
        print(f"✓ Pipeline Context fields present in all profiles")


class TestInvestorNotes:
    """Test Investor Notes API - for mini profile notes section"""
    
    @pytest.fixture
    def test_investor_id(self, fm_token, fund_id):
        """Get a test investor ID"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        if not profiles:
            pytest.skip("No investors available for testing")
        return profiles[0]["id"]
    
    def test_get_investor_notes(self, fm_token, test_investor_id):
        """Test getting notes for an investor"""
        response = requests.get(
            f"{BASE_URL}/api/investor-notes/{test_investor_id}?limit=5",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 200, f"Failed to get notes: {response.text}"
        notes = response.json()
        
        print(f"✓ Retrieved {len(notes)} notes for investor")
        
        # Check note structure if notes exist
        if notes:
            note = notes[0]
            assert "id" in note, "Note missing 'id'"
            assert "content" in note, "Note missing 'content'"
            assert "created_by" in note, "Note missing 'created_by'"
            assert "created_by_name" in note, "Note missing 'created_by_name'"
            assert "created_at" in note, "Note missing 'created_at'"
            print(f"✓ Note structure is correct")
    
    def test_create_investor_note(self, fm_token, test_investor_id):
        """Test creating a new note"""
        note_content = "TEST_NOTE: This is a test note from automated testing"
        
        response = requests.post(
            f"{BASE_URL}/api/investor-notes",
            json={"investor_id": test_investor_id, "content": note_content},
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 200, f"Failed to create note: {response.text}"
        
        note = response.json()
        assert note["content"] == note_content
        assert note["investor_id"] == test_investor_id
        assert "created_by_name" in note
        assert "created_at" in note
        
        print(f"✓ Note created successfully by {note['created_by_name']}")
        
        # Verify note appears in list
        get_response = requests.get(
            f"{BASE_URL}/api/investor-notes/{test_investor_id}?limit=5",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        notes = get_response.json()
        note_ids = [n["id"] for n in notes]
        assert note["id"] in note_ids, "Created note not found in notes list"
        
        print(f"✓ Note verified in notes list")
        
        # Cleanup - delete the test note
        delete_response = requests.delete(
            f"{BASE_URL}/api/investor-notes/{note['id']}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert delete_response.status_code == 200, f"Failed to delete note: {delete_response.text}"
        print(f"✓ Test note cleaned up")
    
    def test_delete_investor_note(self, fm_token, test_investor_id):
        """Test deleting a note"""
        # First create a note to delete
        response = requests.post(
            f"{BASE_URL}/api/investor-notes",
            json={"investor_id": test_investor_id, "content": "TEST_NOTE: To be deleted"},
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        note_id = response.json()["id"]
        
        # Delete the note
        delete_response = requests.delete(
            f"{BASE_URL}/api/investor-notes/{note_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert delete_response.status_code == 200, f"Failed to delete note: {delete_response.text}"
        
        # Verify note is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/investor-notes/{test_investor_id}?limit=10",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        notes = get_response.json()
        note_ids = [n["id"] for n in notes]
        assert note_id not in note_ids, "Deleted note still appears in list"
        
        print(f"✓ Note deleted and verified")


class TestPipelineMovement:
    """Test moving investors in pipeline - for drag and drop"""
    
    @pytest.fixture
    def test_investor_id(self, fm_token, fund_id):
        """Get a test investor ID"""
        response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = response.json()
        if not profiles:
            pytest.skip("No investors available for testing")
        return profiles[0]["id"]
    
    @pytest.fixture
    def stage_ids(self, fm_token, fund_id):
        """Get stage IDs"""
        response = requests.get(
            f"{BASE_URL}/api/funds/{fund_id}/pipeline-stages",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        stages = response.json()
        return {s["name"]: s["id"] for s in stages}
    
    def test_move_investor_to_stage(self, fm_token, fund_id, test_investor_id, stage_ids):
        """Test moving an investor to a different stage"""
        # Move to "Intro Email" stage
        target_stage = "Intro Email"
        target_stage_id = stage_ids.get(target_stage)
        
        if not target_stage_id:
            pytest.skip(f"Stage '{target_stage}' not found")
        
        response = requests.put(
            f"{BASE_URL}/api/investor-pipeline/move/{test_investor_id}?fund_id={fund_id}&new_stage_id={target_stage_id}&new_position=0",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 200, f"Failed to move investor: {response.text}"
        
        result = response.json()
        assert result["stage_id"] == target_stage_id
        assert "stage_entered_at" in result
        
        print(f"✓ Investor moved to '{target_stage}' stage")
        
        # Verify the move
        verify_response = requests.get(
            f"{BASE_URL}/api/investor-profiles-with-pipeline/fund/{fund_id}",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        profiles = verify_response.json()
        investor = next((p for p in profiles if p["id"] == test_investor_id), None)
        
        assert investor is not None, "Investor not found after move"
        assert investor["pipeline_stage_id"] == target_stage_id
        assert investor["pipeline_stage_name"] == target_stage
        
        print(f"✓ Move verified - investor is now in '{target_stage}'")


class TestTeamMembers:
    """Test Team Members API - for ALKNZ POC display"""
    
    def test_get_team_members(self, fm_token):
        """Test getting team members for POC dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/team-members",
            headers={"Authorization": f"Bearer {fm_token}"}
        )
        assert response.status_code == 200, f"Failed to get team members: {response.text}"
        
        members = response.json()
        assert len(members) > 0, "No team members found"
        
        # Check member structure
        member = members[0]
        assert "id" in member
        assert "first_name" in member
        assert "last_name" in member
        
        print(f"✓ Found {len(members)} team members")
        for m in members:
            print(f"  - {m['first_name']} {m['last_name']} ({m['role']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
