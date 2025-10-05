# Hackathon Management App Requirements (Simplified)

## Product Vision / Goal
A simple, single-hackathon management platform for running a small-scale event. An admin sets up the event, participants form teams and submit projects, and judges score them.

## Key Features
- **Hackathon Setup**: Admin configures the event name, timeline, tracks, and prizes.
- **Participant & Team Management**: Users register with a username, create a team, and invite others.
- **Project Submission**: Teams submit their project details.
- **Judging**: Judges score submissions based on defined criteria.
- **Communication**: Organizers can post announcements.
- **Results**: Admins/Organizers can see results and award prizes.

## Key Personas & Roles
- **Admin**: The super-user. Sets up everything, manages roles.
- **Organizer**: Helps manage the event, like defining tracks, prizes, and sending announcements.
- **Participant**: The default role for any user. Joins a team, submits a project.
- **Judge**: Reviews and scores project submissions.

## End-to-End Flow Overview
1.  Admin sets up the hackathon (name, description, timeline).
2.  Organizers add tracks and prizes.
3.  Admin publishes the hackathon.
4.  Users register with a unique username during the registration window.
5.  Participants create teams and invite others.
6.  Teams submit their projects before the deadline.
7.  Judges score the submissions.
8.  Organizers award prizes and announce winners.
9.  Admin archives the event, making it read-only.

## User Stories

### Epic: Hackathon Setup & Timeline Control

#### Story: Initialize and Configure Hackathon
- As an admin, I want to create the hackathon with a name, description, and timeline (registration, submission, judging phases).
- As an admin, I want to publish the hackathon to make it live.
- As an organizer, I want to add tracks and prizes for the hackathon.

#### Story: Manage Event State
- As an admin, I want to archive the hackathon after it ends to make it read-only.

### Epic: Participant & Team Management

#### Story: Register for Hackathon
- As a user, I want to register by choosing a unique username when registration is open.

#### Story: Form a Team
- As a participant, I want to create a team and invite other participants by their username.
- A participant can only be on one team.

### Epic: Project Submission & Evaluation

#### Story: Submit a Project
- As a team member, I want to submit our project details (title, description, links) before the submission deadline.
- I can edit my submission any time before the deadline.

#### Story: Score Submissions
- As a judge, I want to view my assigned submissions and score them based on the criteria.

### Epic: Communication & Results

#### Story: Publish Announcements
- As an organizer, I want to publish announcements to all participants.

#### Story: Award Prizes
- As an organizer, I want to award prizes to winning projects.

### Epic: Administration

#### Story: Manage Roles
- As an admin, I can assign the Organizer or Judge role to any user.

#### Story: Bootstrap First Admin
- On first startup, the system should create an admin user from a username specified in an environment variable (e.g., `INITIAL_ADMIN_USERNAME`). This only happens if no admin exists.

## Constraints
- **Single Hackathon**: The system supports only one hackathon at a time.
- **Username-based Identity**: Users are identified by a unique username. No passwords.
- **External Artifacts**: Project submissions are links to external sites (e.g., GitHub, Figma). The app does not store project files.

