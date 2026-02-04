"""Tests for user registration endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestUserRegistration:
    """Test cases for /register endpoint."""

    def test_register_success(self):
        """Test successful user registration."""
        response = client.post(
            "/register",
            json={
                "username": "testuser",
                "password": "testpass",
                "confirm_password": "testpass",
                "user_level": "beginner",
                "privacy_consent_yn": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "success"
        assert data["data"]["username"] == "testuser"
        assert data["data"]["user_level"] == "beginner"
        assert data["data"]["privacy_consent_yn"] is True
        assert "user_id" in data["data"]

    def test_register_password_mismatch(self):
        """Test registration with mismatched passwords."""
        response = client.post(
            "/register",
            json={
                "username": "testuser2",
                "password": "testpass",
                "confirm_password": "differentpass",
                "user_level": "intermediate",
                "privacy_consent_yn": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "error"
        assert data["error"]["code"] == "PASSWORD_MISMATCH"

    def test_register_without_consent(self):
        """Test registration without privacy consent."""
        response = client.post(
            "/register",
            json={
                "username": "testuser3",
                "password": "testpass",
                "confirm_password": "testpass",
                "user_level": "advanced",
                "privacy_consent_yn": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "error"
        assert data["error"]["code"] == "CONSENT_REQUIRED"

    def test_register_duplicate_username(self):
        """Test registration with existing username."""
        # First registration
        client.post(
            "/register",
            json={
                "username": "duplicateuser",
                "password": "testpass",
                "confirm_password": "testpass",
                "user_level": "beginner",
                "privacy_consent_yn": True,
            },
        )

        # Second registration with same username
        response = client.post(
            "/register",
            json={
                "username": "duplicateuser",
                "password": "testpass",
                "confirm_password": "testpass",
                "user_level": "intermediate",
                "privacy_consent_yn": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"] == "error"
        assert data["error"]["code"] == "USERNAME_EXISTS"

    def test_register_all_user_levels(self):
        """Test registration with all valid user levels."""
        for level in ["beginner", "intermediate", "advanced"]:
            response = client.post(
                "/register",
                json={
                    "username": f"user_{level}",
                    "password": "testpass",
                    "confirm_password": "testpass",
                    "user_level": level,
                    "privacy_consent_yn": True,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["result"] == "success"
            assert data["data"]["user_level"] == level

    def test_register_invalid_user_level(self):
        """Test registration with invalid user level."""
        response = client.post(
            "/register",
            json={
                "username": "invalidleveluser",
                "password": "testpass",
                "confirm_password": "testpass",
                "user_level": "expert",  # Invalid level
                "privacy_consent_yn": True,
            },
        )

        # Should fail validation
        assert response.status_code == 422

    def test_register_response_format(self):
        """Test that response follows common response model format."""
        response = client.post(
            "/register",
            json={
                "username": "formatuser",
                "password": "testpass",
                "confirm_password": "testpass",
                "user_level": "beginner",
                "privacy_consent_yn": True,
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Verify common response format
        assert "result" in data
        assert "error" in data
        assert "data" in data

        # Verify user data fields
        user_data = data["data"]
        assert "user_id" in user_data
        assert "username" in user_data
        assert "user_level" in user_data
        assert "privacy_consent_yn" in user_data
        assert "created_at" in user_data
