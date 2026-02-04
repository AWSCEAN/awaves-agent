# API Contracts

This directory contains API contract documents that define the agreed interface between Frontend and Backend agents.

## Purpose

Contracts ensure:
- Clear communication between agents before implementation
- Documented agreements on request/response formats
- Traceable decisions and implementation status
- Reduced integration issues

## Contract Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      Contract Lifecycle                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DRAFT        Frontend or Backend proposes requirements       │
│       │                                                          │
│       ▼                                                          │
│  2. PROPOSED     Both agents discuss and refine                  │
│       │                                                          │
│       ▼                                                          │
│  3. AGREED       Interface locked, implementation begins         │
│       │                                                          │
│       ▼                                                          │
│  4. IMPLEMENTED  Both sides complete implementation              │
│       │                                                          │
│       ▼                                                          │
│  5. VERIFIED     QA and Review agents approve                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Template

Each contract file should include:

1. **Frontend Requirements** - What the UI needs
2. **Backend Proposal** - Endpoint, schemas, error codes
3. **Agreement** - Final agreed interface
4. **Test Cases** - Example requests/responses
5. **Implementation Tracking** - File changes and status
6. **Sign-off** - Agent approvals

## File Naming

```
{task-id}.md
```

Examples:
- `t01_user-registration01.md`
- `t02_login-flow.md`
- `t03_spot-search.md`

## Workflow

### For Full-Stack Tasks

1. **Task arrives** → Create contract file in DRAFT status
2. **@backend-dev-agent** proposes endpoint specification
3. **@frontend-dev-agent** confirms requirements are met
4. **Status → AGREED** when both agents approve
5. **Implementation** proceeds in parallel or sequence
6. **@review-agent** and **@qa-agent** verify
7. **Status → VERIFIED** when complete

### For Backend-Only Tasks

1. **@backend-dev-agent** creates contract with proposal
2. **Notify @frontend-dev-agent** of new API
3. Frontend updates when ready

### For Frontend-Only Tasks

1. **@frontend-dev-agent** checks `docs/api.md` for existing APIs
2. If new API needed → Create contract and request from backend
3. If API exists → Proceed with implementation

## Related Directories

```
docs/
├── contracts/     # API contracts (this directory)
├── tasks/
│   ├── active/    # Tasks in progress
│   └── completed/ # Completed tasks
├── api.md         # Full API specification
└── progress.md    # Project progress tracking
```
