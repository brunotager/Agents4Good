# Style Guide: SSD Application Agent (Mobile-First)

## 1. Core Design Philosophy
- **Clarity Over Cleverness**: No jargon, no "bubbly" AI personality. Grounded, direct, and fact-based.
- **Builder Mindset**: The UI is a tool to ship an application, not a playground. Focus on momentum and reliability.
- **Accessibility as Baseline**: Target WCAG 2.2 AAA contrast and interaction standards.

## 2. Visual Specifications

### Typography (The Verdana System)
Verdana is the locked typeface due to its high legibility on small screens and wide character spacing.

| Element | Size | Weight | Line Height | Note |
| :--- | :--- | :--- | :--- | :--- |
| **Heading** | 22px | Bold | 1.2 | Section titles |
| **Agent Dialog** | 19px | Regular | 1.6 | Main chat bubbles |
| **Body/Inputs** | 18px | Regular | 1.5 | Minimum size for all text |
| **Labels** | 16px | Bold | 1.4 | Must be persistent above fields |

### Color Palette (7:1 Contrast Minimum)
- **Background**: `#F9F9F9` (Off-white). Prevents screen glare and "blinding" the user.
- **Primary Action/Text**: `#003366` (Navy Blue). Provides a 12:1 contrast ratio against the background.
- **Error State**: `#D32F2F` (Pure Red). Must always be accompanied by an icon.
- **Secondary Text**: `#1A1A1A` (Charcoal). Used for high-legibility body text.

### Iconography
- **Style**: Solid/Filled icons only (no thin outlines).
- **Stroke**: Minimum 2px thickness.
- **Rule**: Every icon must have a text label underneath it.
- **Touch Targets**: Minimum 48 x 48px for all interactive icons.

## 3. Interaction & Form Design

### Mobile-First Layout
- **Single-Column Only**: No side-by-side elements. The user moves in one vertical line to prevent confusion.
- **Navigation & Drawer**: Include a hamburger menu that triggers a left-side drawer. The drawer lists application categories.
- **Persistent Labels**: Input labels never disappear or transition into placeholders. They sit permanently above the field.
- **Input Fields**: Minimum height of 56px.
- **Voice Input**: A microphone icon must be persistently available within the input field. When active, it pulses red (#D32F2F) to indicate listening state.
- **Focus State**: When a field is active, it must show a 3px Navy Blue border.
- **Sticky Actions**: The "Next" or "Primary Action" button is pinned to the bottom of the mobile viewport. It must remain disabled (grayed out) until a valid input is detected.

### Progress Tracking
- **Multi-Segment Progress Bar**: Pinned below the trust badge.
- **Logic**: Acts as a stacked bar chart displaying three statuses:
  - **Complete** (Green `#34C759`): Questions answered fully.
  - **Semi-Answered** (Yellow `#FFCC00`): Questions with partial data.
  - **Unanswered** (Red `#FF3B30`): Questions not yet addressed.
- **Engineering Note**: Categories in the side drawer must use these exact same color dots to indicate status.

## 4. AI Agent Behavior & States

### Backend State Machine & Schema
*Engineers must ALWAYS refer to this flow when integrating the frontend agent with the backend logic:*
1. **New Answer Input**: The user provides a new natural language answer.
2. **Field Matching**: The backend attempts to match the answer to relevant form fields.
3. **Form State Check**: The system queries the "Form Data - In Progress" database to check for:
   - Conflicts with existing answers.
   - Unfilled fields that are relevant based on the new data.
   - Relevant filled fields that can be appended to.
4. **Resolution Paths**:
   - **Default**: If no conflicts exist, the system updates the form data, generates the next question, and prompts the user.
   - **Conflict Loop**: If a conflict is found, the agent enters a specific "Conflict conversation loop" with the user. It will not generate the next formal question until the conflict is resolved and the form data is cleanly updated.

### Logic: Redundant Entry Prevention
The agent must map natural language to the application schema.
- **Rule**: Never ask a question the user has already answered. If a user says "I haven't worked since my injury in 2023," the "Last Date of Work" field is silently populated.

### UI States
- **Listening/Analyzing**: A slow, soft pulse animation on the agent avatar + descriptive text: *"The agent is reviewing your notes..."*
- **Clarifying**: Triggered when AI confidence in a data point is <85%. The UI highlights the specific field with a high-contrast border and asks for confirmation.
- **Gap-Filling**: After the initial "free-form" session, the agent generates a targeted list of remaining questions to reach 100% application completion.
- **Validating**: Buttons must remain disabled until required input is met. Use the Pure Red state if logic errors occur (e.g., an end date before a start date), rather than for empty fields.

## 5. Content & Tone
- **Reading Level**: 6th Grade (Plain Language).
- **Fact-Grounded**: State exactly what is happening. *"I am saving your medical history to Section 4."*
- **Trust Signifiers**: Include a persistent "🔒 Your information is secure" badge in the header.

## 6. Engineering Requirements
- **State Persistence**: Save the application state after every interaction. Users may need to exit due to fatigue; they must return exactly where they left off.
- **Haptic Feedback**: Use heavy vibration for errors and light double-tap for successful data capture.
- **No CAPTCHAs**: Use accessible authentication (magic links or SMS codes).
