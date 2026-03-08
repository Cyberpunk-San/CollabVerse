#!/usr/bin/env python3
import re
import json
from pathlib import Path

def extract_backend_info():
    """Extract info from backend chat.py"""
    backend_file = Path("backend/app/api/chat.py")
    if not backend_file.exists():
        print("❌ Backend file not found")
        return {}
    
    content = backend_file.read_text()
    
    # Find all endpoints
    endpoints = re.findall(r'@router\.(get|post|put|delete|patch)\("([^"]+)"\)', content)
    
    # Find all response models
    responses = re.findall(r'response_model=(\w+)', content)
    
    # Find all function names
    functions = re.findall(r'def (\w+)\(', content)
    
    return {
        "endpoints": endpoints,
        "responses": list(set(responses)),
        "functions": functions
    }

def extract_frontend_info():
    """Extract info from frontend chat.ts (API client)"""
    frontend_file = Path("frontend/src/api/chat.ts")
    if not frontend_file.exists():
        print("❌ Frontend API file not found")
        return {}
    
    content = frontend_file.read_text()
    
    # Find all API client methods
    methods = re.findall(r'(\w+): async \(([^)]*)\)', content)
    
    # Find all API endpoints called
    api_calls = re.findall(r'apiClient\.(get|post|put|delete|patch)\([\'"](/chat/[^\'"]+)[\'"]', content)
    
    return {
        "methods": methods,
        "api_calls": api_calls
    }

def extract_frontend_types():
    """Extract types from frontend types/chat.ts"""
    types_file = Path("frontend/src/types/chat.ts")
    if not types_file.exists():
        print("❌ Frontend types file not found")
        return {}
    
    content = types_file.read_text()
    
    # Find all interfaces
    interfaces = re.findall(r'export interface (\w+)', content)
    
    # Find all type aliases
    type_aliases = re.findall(r'export type (\w+)', content)
    
    return {
        "interfaces": interfaces,
        "types": type_aliases
    }

def compare_endpoints(backend, frontend):
    """Compare backend endpoints vs frontend API calls"""
    print("\n🔍 **ENDPOINT COMPARISON**")
    
    backend_endpoints = [f"{method} {path}" for method, path in backend.get("endpoints", [])]
    frontend_calls = [f"{method} {path}" for method, path in frontend.get("api_calls", [])]
    
    # Find missing frontend implementations
    missing = []
    for be in backend_endpoints:
        found = False
        for fe in frontend_calls:
            if be.split()[-1] in fe:  # Check if path exists
                found = True
                break
        if not found:
            missing.append(be)
    
    if missing:
        print("❌ Missing frontend implementations for:")
        for m in missing:
            print(f"   - {m}")
    else:
        print("✅ All backend endpoints have frontend implementations")

def compare_models(backend, frontend_types):
    """Compare backend response models vs frontend interfaces"""
    print("\n🔍 **MODEL COMPARISON**")
    
    backend_models = backend.get("responses", [])
    frontend_interfaces = frontend_types.get("interfaces", [])
    
    # Check each backend model
    for model in backend_models:
        # Convert from Python class name to TypeScript interface name
        # e.g., ChatMessageResponse -> ChatMessageResponse
        if model in frontend_interfaces:
            print(f"✅ {model} exists in frontend")
        else:
            # Check for similar names
            similar = [i for i in frontend_interfaces if model.lower() in i.lower()]
            if similar:
                print(f"⚠️  {model} might be {similar[0]} in frontend")
            else:
                print(f"❌ {model} missing in frontend")

def check_field_consistency():
    """Deep check field consistency between backend and frontend"""
    print("\n🔍 **FIELD CONSISTENCY CHECK**")
    
    # Get backend schema fields
    schema_file = Path("backend/app/schemas/chat.py")
    if schema_file.exists():
        content = schema_file.read_text()
        
        # Find ChatMessageResponse fields
        match = re.search(r'class ChatMessageResponse.*?\n(.*?)(?=\nclass|\Z)', content, re.DOTALL)
        if match:
            backend_fields = re.findall(r'    (\w+):', match.group(1))
            print(f"Backend ChatMessageResponse fields: {', '.join(backend_fields)}")
    
    # Get frontend interface fields
    types_file = Path("frontend/src/types/chat.ts")
    if types_file.exists():
        content = types_file.read_text()
        
        # Find ChatMessageResponse interface
        match = re.search(r'export interface ChatMessageResponse.*?\n(.*?)(?=\n\}|$)', content, re.DOTALL)
        if match:
            frontend_fields = re.findall(r'  (\w+)\??:', match.group(1))
            print(f"Frontend ChatMessageResponse fields: {', '.join(frontend_fields)}")

def check_websocket_messages():
    """Compare WebSocket message structures"""
    print("\n🔍 **WEBSOCKET MESSAGE COMPARISON**")
    
    # Backend WebSocket handlers
    backend_file = Path("backend/app/api/chat.py")
    if backend_file.exists():
        content = backend_file.read_text()
        
        # Find handle functions
        handlers = re.findall(r'async def (handle_\w+)\(', content)
        print(f"Backend WebSocket handlers: {', '.join(handlers)}")
        
        # Find message types sent
        sent_types = re.findall(r'"type": "([^"]+)"', content)
        print(f"Backend message types: {', '.join(set(sent_types))}")
    
    # Frontend WebSocket types
    types_file = Path("frontend/src/types/chat.ts")
    if types_file.exists():
        content = types_file.read_text()
        
        # Find WebSocket interfaces
        ws_interfaces = re.findall(r'export interface (WebSocket\w+)', content)
        print(f"Frontend WebSocket interfaces: {', '.join(ws_interfaces)}")

def main():
    print("="*50)
    print("BACKEND vs FRONTEND CHAT COMPARISON")
    print("="*50)
    
    backend = extract_backend_info()
    frontend = extract_frontend_info()
    frontend_types = extract_frontend_types()
    
    print(f"\n📊 Found {len(backend.get('endpoints', []))} backend endpoints")
    print(f"📊 Found {len(frontend.get('api_calls', []))} frontend API calls")
    print(f"📊 Found {len(frontend_types.get('interfaces', []))} frontend interfaces")
    
    compare_endpoints(backend, frontend)
    compare_models(backend, frontend_types)
    check_field_consistency()
    check_websocket_messages()
    
    print("\n" + "="*50)

if __name__ == "__main__":
    main()