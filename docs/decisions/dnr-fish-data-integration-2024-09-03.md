# DNR Fish Data Integration - Decision Log (2024-09-03)

This file documents the integration of Minnesota DNR fish catch data into the React demo application to showcase real fishing data alongside user-generated catches.

## Decision Log

### [Decision 1]: Integrate DNR Fish Survey Data with React Demo
**Timestamp (UTC):** 2024-09-03T17:30:00Z
**Scope:** `react-demo/src/App.jsx`, `react-demo/public/dnr_lakes_data.json`, data processing scripts
**Change Summary:** Added 20 lakes with real Minnesota DNR fish catch data to the React demo, 
displaying DNR survey results alongside user-generated catches. Implemented data loading from 
JSON file and combined catch display logic.
**Rationale:** The demo needed to show real fishing data coexisting with verified user catches to 
demonstrate the ecosystem's data richness. DNR data provides authentic Minnesota lake fishing 
information that validates the concept of combining official survey data with user-generated content.
**Alternatives Considered:**
  - Mock DNR data — rejected as it wouldn't showcase real data integration
  - Separate DNR section — rejected as it would fragment the user experience
  - API calls to DNR — rejected as it would add complexity for a demo
**Trade-offs / Risks:**
  - Increased bundle size with additional lake data
  - Potential fetch failures if DNR data file is missing
  - More complex state management combining user and DNR catches
**Follow-ups / TODOs:**
  - Test DNR data loading in production build
  - Add error handling for missing DNR data file
  - Consider pagination for lakes list if more DNR lakes are added
**Source Prompt(s):** "pull in some of the fish catch data that we already have from the Minnesota DNR so we can see kind of the data coexisting with our new verified catches and our unverified catches"

### [Decision 2]: Implement "Show All" Button for Future Functionality
**Timestamp (UTC):** 2024-09-03T17:35:00Z
**Scope:** `react-demo/src/App.jsx` UI components
**Change Summary:** Added a "Show All" button to the Recent Catches section that currently logs 
to console but provides placeholder for future pagination or expanded view functionality.
**Rationale:** The user requested a "Show All" button that doesn't do anything yet, allowing 
demo attendees to see the interface structure for future features. This demonstrates the app's 
extensibility and provides a clear call-to-action for expanded functionality.
**Alternatives Considered:**
  - Implement full pagination immediately — rejected as it would delay demo completion
  - Hide the button until functional — rejected as it wouldn't show the intended UI flow
  - Use a disabled state — rejected as it would suggest broken functionality
**Trade-offs / Risks:**
  - Button appears functional but doesn't perform action (could confuse users)
  - Console logging provides developer feedback but isn't user-facing
  - Placeholder functionality may need to be replaced before production
**Follow-ups / TODOs:**
  - Implement actual "Show All" functionality with pagination
  - Add loading states for expanded catch views
  - Consider modal or separate page for full catch history
**Source Prompt(s):** "have a show all button that does not do anything. But this will allow them to see recent catches and kind of reconfirmed that that data is still, and they'll get a feel for kind of us updating"

### [Decision 3]: Distinguish DNR Catches from User Catches in UI
**Timestamp (UTC):** 2024-09-03T17:40:00Z
**Scope:** `react-demo/src/App.jsx` catch display logic, UI components
**Change Summary:** Modified catch display to show DNR catches with "Minnesota DNR" as angler, 
"DNR Data" instead of FISH tokens, and source information. User catches maintain FISH token 
display and verification status.
**Rationale:** Clear visual distinction between official DNR survey data and user-generated 
catches helps demo attendees understand the data ecosystem. DNR catches don't earn tokens 
since they're official data, not user contributions, which reinforces the token economics.
**Alternatives Considered:**
  - Same display format for all catches — rejected as it would confuse data sources
  - Separate DNR section — rejected as it would fragment the unified catch experience
  - Hide DNR data — rejected as it wouldn't showcase the data integration
**Trade-offs / Risks:**
  - More complex catch rendering logic
  - Potential confusion about why DNR catches don't earn tokens
  - Need to maintain consistent styling while showing different data types
**Follow-ups / TODOs:**
  - Add tooltips explaining DNR vs user catch differences
  - Consider filtering options for catch types
  - Add data source indicators in catch details
**Source Prompt(s):** "user will be Minnesota DNR, who technically caught"
