---
name: webapp-testing
description: Toolkit for testing local web applications using Playwright.
---

# Web Application Testing Skill

## Playwright Pattern
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')  # CRITICAL
    page.screenshot(path='/tmp/inspect.png', full_page=True)
    browser.close()
```

## Best Practices
- Always `wait_for_load_state('networkidle')` before inspecting dynamic apps
- Use descriptive selectors: `text=`, `role=`, CSS, IDs
- Always close browser when done
