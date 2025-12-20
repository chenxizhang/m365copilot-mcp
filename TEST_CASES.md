# M365 Copilot MCP Server - Test Cases (Stage 2)

This document provides test cases to verify Stage 2 functionality including tools, validation, and error handling.

## Test Environment Setup

1. Ensure the server is built: `npm run build`
2. MCP server is connected: `claude mcp list` shows `m365-copilot` as connected
3. Start a Claude Code session

---

## Test Suite 1: hello Tool

### TC1.1 - Valid greeting
**Test**: Ask Claude to use hello tool with a valid name
```
Use the hello tool to greet Alice
```
**Expected Result**:
```
Hello, Alice! Welcome to M365 Copilot MCP Server. The connection is working successfully!
```
**Status**: ✅ PASS

### TC1.2 - Greeting with special characters
**Test**:
```
Use the hello tool to greet "张三"
```
**Expected Result**:
```
Hello, 张三! Welcome to M365 Copilot MCP Server. The connection is working successfully!
```

### TC1.3 - Missing name parameter (Error Test)
**Test**: Ask Claude to call hello without name parameter (this may be hard to trigger as Claude usually validates)
**Expected Result**: ValidationError with message about missing 'name' parameter

---

## Test Suite 2: echo Tool

### TC2.1 - Basic echo
**Test**:
```
Use the echo tool with message "Hello World"
```
**Expected Result**:
```
Hello World
```
**Status**: ✅ PASS

### TC2.2 - Echo with uppercase
**Test**:
```
Use the echo tool with message "testing uppercase" and uppercase true
```
**Expected Result**:
```
TESTING UPPERCASE
```
**Status**: ✅ PASS

### TC2.3 - Echo with prefix only
**Test**:
```
Use the echo tool with message "test message" and prefix "LOG:"
```
**Expected Result**:
```
LOG: test message
```

### TC2.4 - Echo with both prefix and uppercase
**Test**:
```
Use the echo tool with message "combined test" with prefix "OUTPUT:" and uppercase true
```
**Expected Result**:
```
OUTPUT: COMBINED TEST
```
**Status**: ✅ PASS

### TC2.5 - Echo with empty string (Edge Case)
**Test**:
```
Use the echo tool with message ""
```
**Expected Result**: ValidationError - message cannot be empty

### TC2.6 - Echo with long message
**Test**:
```
Use the echo tool with a message that is 1000 characters long
```
**Expected Result**: Message echoed back successfully

### TC2.7 - Echo with special characters
**Test**:
```
Use the echo tool with message "Special chars: @#$%^&*()_+-=[]{}|;':,.<>?/~`"
```
**Expected Result**: Special characters echoed back correctly

### TC2.8 - Echo with unicode/emoji
**Test**:
```
Use the echo tool with message "Testing 测试 🚀🎉"
```
**Expected Result**: Unicode and emoji displayed correctly

### TC2.9 - Echo with multiline text
**Test**:
```
Use the echo tool with message "Line 1\nLine 2\nLine 3"
```
**Expected Result**: Multiline text preserved

---

## Test Suite 3: serverInfo Tool

### TC3.1 - Get server information
**Test**:
```
Use the serverInfo tool
```
**Expected Result**: JSON response containing:
```json
{
  "name": "m365-copilot-mcp",
  "version": "0.2.0",
  "stage": "Stage 2 - Enhanced Tools & Error Handling",
  "capabilities": {
    "tools": true,
    "resources": false,
    "prompts": false
  },
  "utilities": {
    "errorHandling": ["MCPError", "ValidationError", "AuthenticationError", "APIError", "ConfigurationError"],
    "logging": ["debug", "info", "warn", "error"],
    "validation": ["requireString", "requireNumber", "requireBoolean", "requireArray", "requireObject", "requireEnum"]
  },
  "toolCount": 3,
  "availableTools": ["hello", "echo", "serverInfo"]
}
```
**Status**: ✅ PASS

### TC3.2 - serverInfo with extra parameters (should be ignored)
**Test**: Try calling serverInfo with unexpected parameters
**Expected Result**: Parameters ignored, normal response returned

---

## Test Suite 4: Error Handling

### TC4.1 - Call unknown tool
**Test**: Ask Claude to use a non-existent tool (difficult to trigger directly)
**Expected Result**: ValidationError with "Unknown tool" message

### TC4.2 - Missing required parameter
**Test**: Various scenarios where required parameters are missing
**Expected Result**: ValidationError with specific parameter name in error message

### TC4.3 - Wrong parameter type
**Test**: Pass wrong type for parameters (e.g., number instead of string)
**Expected Result**: ValidationError with type mismatch information

---

## Test Suite 5: Input Validation

### TC5.1 - String validation - empty string
**Test**: Pass empty string to parameters that require non-empty strings
**Expected Result**: ValidationError indicating parameter cannot be empty

### TC5.2 - String validation - whitespace only
**Test**: Pass "   " (only spaces) as parameter value
**Expected Result**: ValidationError indicating parameter cannot be empty (after trim)

### TC5.3 - Boolean validation
**Test**: Pass various boolean values (true, false, "true", "false", 1, 0)
**Expected Result**:
- true/false work correctly
- Other values may trigger validation error or be coerced

### TC5.4 - Optional parameter - not provided
**Test**: Call echo without prefix parameter
**Expected Result**: Works correctly, prefix not added

### TC5.5 - Optional parameter - null
**Test**: Explicitly pass null for optional parameter
**Expected Result**: Treated as not provided

---

## Test Suite 6: Logging (Manual Verification)

These tests require checking stderr output.

### TC6.1 - Default log level
**Test**: Start server normally and check logs
**Expected Result**: INFO level messages visible in stderr

### TC6.2 - DEBUG log level
**Test**: Start server with `LOG_LEVEL=DEBUG node build/index.js`
**Expected Result**: DEBUG messages visible, including detailed request info

### TC6.3 - ERROR log level only
**Test**: Start server with `LOG_LEVEL=ERROR node build/index.js`
**Expected Result**: Only ERROR messages visible, INFO messages suppressed

### TC6.4 - Log format verification
**Test**: Check any log output
**Expected Result**: Format is `[timestamp] [level] message {context}`

---

## Test Suite 7: Integration Tests

### TC7.1 - Multiple tool calls in sequence
**Test**:
```
1. Use serverInfo tool
2. Use hello tool to greet "Bob"
3. Use echo tool with message "test"
```
**Expected Result**: All three calls succeed independently

### TC7.2 - Rapid consecutive calls
**Test**: Make multiple echo calls quickly
**Expected Result**: All calls processed correctly without interference

### TC7.3 - Server restart
**Test**:
1. Use a tool successfully
2. Rebuild: `npm run build`
3. Claude Code reconnects automatically
4. Use the same tool again
**Expected Result**: Tool works after rebuild

---

## Test Suite 8: Edge Cases

### TC8.1 - Very long tool name in error
**Test**: (Requires code modification) Call tool with very long name
**Expected Result**: Error message handles long names gracefully

### TC8.2 - Special characters in parameters
**Test**: Pass SQL injection attempts, XSS attempts in message parameters
**Expected Result**: Content echoed safely without execution

### TC8.3 - Unicode in all fields
**Test**: Use unicode characters in all string parameters
**Expected Result**: Unicode handled correctly throughout

### TC8.4 - Maximum parameter length
**Test**: Pass extremely long strings (10KB+) as parameters
**Expected Result**: Either accepted or gracefully rejected with clear error

---

## Performance Tests

### TC9.1 - Response time - simple call
**Test**: Measure time for echo tool call
**Expected Result**: Response within 100ms

### TC9.2 - Response time - serverInfo
**Test**: Measure time for serverInfo call
**Expected Result**: Response within 100ms

### TC9.3 - Concurrent requests
**Test**: Make multiple requests simultaneously (if possible)
**Expected Result**: All requests handled correctly

---

## Regression Tests (for future stages)

These should be re-run after each new stage to ensure nothing broke:

- ✅ TC1.1 - hello tool basic functionality
- ✅ TC2.1 - echo tool basic functionality
- ✅ TC2.4 - echo tool with all options
- ✅ TC3.1 - serverInfo returns correct structure

---

## Test Execution Checklist

- [ ] All TC1.x (hello tool) tests
- [ ] All TC2.x (echo tool) tests
- [ ] All TC3.x (serverInfo tool) tests
- [ ] TC4.x (Error handling) tests
- [ ] TC5.x (Input validation) tests
- [ ] TC6.x (Logging) tests - manual check of stderr
- [ ] TC7.x (Integration) tests
- [ ] TC8.x (Edge cases) tests
- [ ] TC9.x (Performance) tests

---

## Known Issues / Limitations

*Document any known issues discovered during testing here*

---

## Test Results Summary

**Date**: 2025-12-20
**Version**: 0.2.0
**Stage**: Stage 2 - Enhanced Tools & Error Handling

| Test Suite | Total | Passed | Failed | Skipped |
|------------|-------|--------|--------|---------|
| TC1 (hello) | 3 | 1 | 0 | 2 |
| TC2 (echo) | 9 | 3 | 0 | 6 |
| TC3 (serverInfo) | 2 | 1 | 0 | 1 |
| TC4 (errors) | 3 | 0 | 0 | 3 |
| TC5 (validation) | 5 | 0 | 0 | 5 |
| TC6 (logging) | 4 | 0 | 0 | 4 |
| TC7 (integration) | 3 | 0 | 0 | 3 |
| TC8 (edge cases) | 4 | 0 | 0 | 4 |
| TC9 (performance) | 3 | 0 | 0 | 3 |
| **TOTAL** | **36** | **5** | **0** | **31** |

**Overall Status**: 5 tests executed and passed, 31 pending execution

---

## Notes for Test Execution

1. Some tests are difficult to trigger directly through Claude Code interface (e.g., passing invalid parameters) as Claude validates inputs before making tool calls
2. Error handling tests may require direct API calls or modified test harness
3. Logging tests require access to stderr output
4. Performance tests require timing measurements
5. Consider creating automated test scripts for Stage 8
