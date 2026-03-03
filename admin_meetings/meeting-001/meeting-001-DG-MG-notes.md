# CRM and Crew Pack Software Development Planning Session

Tue, 24 Feb 26

### CRM and Crew Pack Software Development Planning Session

### Role-Based Access Control Structure

- Operations Manager role
  - Company-wide operations control (division-specific: Octave for contracting/wood, Nina for telecom/electric)
  - Access to all operational functions within their division
  - Handles change order approvals, purchase orders, invoices
- Project Manager role
  - Full control over specific assigned projects
  - Access to schedules, estimates, everything project-related
  - Receives project assignments from Operations Manager
- Project Coordinator role
  - Subcontractor communication and scheduling support
  - Material requests and RFIs
  - Procurement support functions
- Field Supervisor role
  - Site-specific responsibilities only
  - Daily logs, safety forms, photos
  - Access to job files and drawings on mobile
  - No crew management responsibilities
- Estimator role
  - Umbrella role structure allowing multiple assignments
  - Currently assigned to Operations Manager until dedicated hire

### Lead Generation and CRM Pipeline

- Apollo-powered automated lead research
  - Monthly lead scraping with AI evaluation layer
  - Proximity analysis via Google API
  - Social media and web research integration
  - Division-specific targeting and rating system
- Website integration
  - Form submissions feeding into same CRM
  - Client portal access through crew pack
  - Automated email/Teams notifications
- Unified pipeline structure
  - All leads (Apollo + website) flow into single CRM
  - AI layer structures and divides by division
  - Automatic branding based on division context

### Development Phases and Timeline

- Phase 1: CRM and Sales Pipeline (1.5 weeks target)
  - Lead intake, opportunity tracking, client management
  - Apollo integration with AI evaluation
  - Division-based separation and workflow
- Phase 2: Inventory Management (following CRM)
  - PO system, purchase approvals
  - Division-specific material tracking
  - Migration from existing VM to Superbase backend
- Phase 3: Project Management
  - Scheduling, task management
  - Integration with existing workflows

### Implementation Strategy

- Phased rollout with gray-out approach
  - Incomplete features grayed out but visible
  - Users can familiarize with available functions
  - Progressive feature activation
- Testing and adoption process
  - 2-3 days parallel operation (old + new systems)
  - Presentation and training for each phase
  - Jira integration for bug reporting
  - Stakeholder approval before rollout

### Technical Infrastructure

- Single Superbase backend for all divisions
  - API connections between different front-ends
  - Potential separate repos per division for performance
  - Unified data storage with division-based access
- Authentication via [hub.mdmgroup.ca](http://hub.mdmgroup.ca)
  - Microsoft email integration for internal users
  - Invite-only access for external users
  - Clerk authentication system

### Website Development Progress

- Framer-based site with custom CMS backend
  - Service pages, interactive elements
  - Material selection integration planned
  - SEO and content review with Marianne scheduled
- Publishing timeline: Beginning of week after next
  - All forms and backend connections required first
  - Photo/video organization in progress via cloud storage

### Next Steps

- Tomorrow’s meeting: Present refined development plan with specific dates
- Stakeholder input session with Nina and operations team
- Workflow refinement based on existing process documentation
- Help desk/support system setup as first priority feature

---

Chat with meeting transcript: [https://notes.granola.ai/t/d90b0644-2e39-42e6-a93e-0b6279d206a6-00demib2](https://notes.granola.ai/t/d90b0644-2e39-42e6-a93e-0b6279d206a6-00demib2)
