App Factory — Goals and Non-Goals
1. Purpose
This document defines what the App Factory is intended to accomplish and what it explicitly must not become.
It is a scope-control document.
When implementation decisions conflict with this document, the conflict must be surfaced rather than silently resolved by an agent.
2. Primary Goals
G-001 — Repeatable Application Production
The factory must provide a repeatable workflow for producing Android applications from validated opportunities.
A second application should reuse the factory infrastructure instead of requiring a new workflow.
G-002 — Progressive Automation
The factory should automate repetitive work wherever automation can be safely verified.
Automation should increase over time without removing required human approval gates.
G-003 — Model Independence
The factory must not be coupled to a single LLM provider.
Models must be replaceable through configuration and a defined model interface.
G-004 — Human-Controlled Consequential Decisions
Humans must retain control over consequential decisions.
The factory must technically enforce approval requirements rather than relying solely on prompts or documentation.
G-005 — Evidence-Based Opportunity Selection
The factory should identify opportunities using evidence rather than arbitrary AI-generated ideas.
Research should capture:

* target users
* problem
* existing solutions
* competitors
* differentiation
* demand signals
* monetization possibilities
* distribution channels
* distribution difficulty
* technical complexity
* relevant risks

G-006 — Automated Engineering
The factory should eventually automate:

* repository creation
* project initialization
* code generation
* code modification
* testing
* building
* bounded build-fix loops
* security checks
* release preparation

G-007 — Security by Default
Security must be part of the standard application lifecycle.
Security checks must not be an optional afterthought.
G-008 — Distribution as a First-Class Capability
Publishing an application is not considered completion.
The factory must eventually support:

* ASO
* store listing optimization
* landing pages
* organic content
* community distribution
* paid acquisition experiments
* acquisition measurement

G-009 — Measurable Products
Every published application should have measurable product and business outcomes.
The factory should eventually collect and analyze:

* installs
* activation
* retention
* crashes
* reviews
* ratings
* acquisition
* conversion
* revenue
* advertising metrics where applicable

G-010 — Controlled Iteration
The factory should detect meaningful changes in application performance and propose evidence-backed improvements.
Automated iteration must remain bounded and auditable.
G-011 — Cost Control
Every model-driven and externally billed workflow should have measurable or estimated cost.
The factory must support:

* per-task budgets
* per-app budgets
* retry limits
* model selection based on cost/quality requirements
* spending alerts
* hard spending limits where supported

G-012 — Auditability
Important factory actions must produce durable audit records.
A reviewer should be able to determine:

* what happened
* when it happened
* why it happened
* who or what initiated it
* which agent/model was involved
* which artifacts were produced
* whether validation passed

G-013 — Reusable Templates
Common application components should be reusable.
The Android template should progressively contain proven patterns for:

* project structure
* navigation
* persistence
* localization
* testing
* security
* logging
* analytics
* release configuration

3. Secondary Goals
The factory should eventually support:

* multiple application types
* multiple LLM providers
* multiple inference backends
* multiple distribution channels
* multiple application templates
* configurable approval policies
* reusable agents
* reusable tools
* reusable workflows

4. Non-Goals
NG-001 — General-Purpose AGI
The factory is not intended to create a general autonomous intelligence.
Agents exist to perform bounded software-production tasks.
NG-002 — Unrestricted Autonomous Operation
The factory must not have unrestricted authority over:

* money
* publishing
* credentials
* infrastructure
* arbitrary network access
* arbitrary host execution

Permissions must be explicit.
NG-003 — Replacing the Human Operator
The factory is intended to reduce repetitive work, not remove human ownership of consequential decisions.
NG-004 — Automatic Approval
No model, agent, workflow, webhook, or automated process may impersonate a human approval.
NG-005 — Infinite Build Loops
An agent must never be allowed to retry indefinitely.
All retries must have explicit limits.
NG-006 — Blind Code Generation
Generated code must pass appropriate validation before being considered successful.
"LLM produced the code" is not a verification criterion.
NG-007 — Vendor Lock-In
No architecture should require one specific AI provider.
NG-008 — Premature Complexity
The factory should not introduce infrastructure merely because it is technically interesting.
Every new component must have a documented reason to exist.
NG-009 — Fake Automation
The dashboard must never represent an unimplemented capability as operational.
Planned functionality must be clearly distinguished from functioning functionality.
NG-010 — Building Every Idea
The factory should reject, defer, or kill opportunities when evidence does not justify continued investment.
The purpose is not to maximize the number of applications produced.
The purpose is to maximize the efficiency of validated experimentation.
5. Success Criteria
The factory should eventually make the following possible:

```text
Human selects/approves opportunity
        ↓
Factory researches
        ↓
Factory produces specification
        ↓
Human approves
        ↓
Factory builds
        ↓
Factory tests
        ↓
Factory secures
        ↓
Factory produces release candidate
        ↓
Human approves
        ↓
Factory publishes
        ↓
Factory distributes
        ↓
Factory monitors
        ↓
Factory proposes improvements
        ↓
Human approves consequential changes

```

The system is successful when this workflow can be repeated reliably across multiple applications without redesigning the factory for each application.
