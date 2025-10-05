# Hackathon User Flow Overview (Simplified)

This document outlines the simplified end-to-end flows for each persona.

---

## Admin Flow

1.  **Setup**: The first admin is created at startup from an environment variable.
2.  **Login**: Access the app by providing the admin username.
3.  **Hackathon Creation**: Create the hackathon, setting its name, description, and timeline (registration, submission, judging dates).
4.  **Role Management**: Assign Organizer and Judge roles to other users by their username.
5.  **Publish**: Publish the hackathon to make it live.
6.  **Monitoring**: View basic progress of the event.
7.  **Archive**: After the event, archive it to make it read-only.

---

## Organizer Flow

1.  **Login**: Access the app with a username (after being granted Organizer role by an Admin).
2.  **Configuration**: Add and manage tracks and prizes.
3.  **Communication**: Publish announcements to all participants.
4.  **Awarding**: After judging, award prizes to winning projects.

---

## Participant Flow

1.  **Registration**: During the registration window, register with a unique username.
2.  **Team Formation**: Create a new team or accept an invite to join one. A user can only be on one team.
3.  **Project Submission**: Submit project details (title, description, URL) before the deadline. The submission can be edited until the deadline.
4.  **View Results**: See announcements and final results.

---

## Judge Flow

1.  **Onboarding**: Get assigned the Judge role by an Admin.
2.  **Login**: Access the app with a username.
3.  **Judging**: View assigned projects and submit scores based on the provided criteria during the judging window.

---

## Core States
- **Draft**: Hackathon being configured. Not visible to participants or judges.
- **Published/Active**: The event is live. Registration, submissions, and judging happen according to the timeline.
- **Archived**: Event is over. Everything is read-only.
