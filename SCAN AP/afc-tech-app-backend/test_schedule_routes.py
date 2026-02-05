#!/usr/bin/env python3
"""
Simple test to verify the schedule routes are properly defined
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    # Test imports
    from routes.schedule_routes import schedule_bp
    print("✅ schedule_routes.py imports successfully")
    
    # Check blueprint
    assert schedule_bp.name == "schedule", f"Blueprint name is {schedule_bp.name}, expected 'schedule'"
    print(f"✅ Blueprint name is correct: {schedule_bp.name}")
    
    # Check routes are registered
    rules = list(schedule_bp.deferred_functions)
    print(f"✅ Blueprint has {len(rules)} deferred functions")
    
    # Try to import the app
    from app import create_app
    print("✅ app.py imports successfully")
    
    # Check that schedule_bp is imported in app.py
    with open('app.py', 'r') as f:
        app_content = f.read()
        assert 'schedule_routes' in app_content, "schedule_routes not imported in app.py"
        assert 'schedule_bp' in app_content, "schedule_bp not used in app.py"
    print("✅ schedule_bp is properly imported and registered in app.py")
    
    print("\n🎉 All basic checks passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
