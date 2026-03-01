import urllib.request
import json
import traceback

def peek():
    req = urllib.request.Request("http://127.0.0.1:8000/health")
    resp = urllib.request.urlopen(req)
    # the orchestrator doesn't expose all sessions. We have to list them. Wait, it doesn't have an endpoint for listing sessions.
    # What if I query the Node.js DB?
peek()
