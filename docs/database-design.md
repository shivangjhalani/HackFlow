# Database Design

This document specifies a minimal data model for the hackathon app, including database-level logic to enforce key business rules.

## Design Principles
- **Single Hackathon**: The schema supports one hackathon at a time.
- **Minimal Data**: Only store data essential for the core features.
- **DB-level Integrity**: Use triggers and stored procedures to enforce critical constraints and transactional logic.

## MySQL Platform Choices
- **Engine**: InnoDB
- **Character set**: `utf8mb4`
- **Timestamps**: `DATETIME(3)` for event times, `TIMESTAMP(3)` for record creation.

## Entity Catalog

### Hackathon Core
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `hackathon` | Singleton record for the event. | `hackathon_id` (PK), `name`, `status` |
| `hackathon_phase` | Timeline windows for event stages. | `phase_id` (PK), `hackathon_id` FK, `phase_type`, `starts_at`, `ends_at` |
| `track` | Thematic tracks for projects. | `track_id` (PK), `hackathon_id` FK, `name` |
| `prize` | Prizes that can be awarded. | `prize_id` (PK), `hackathon_id` FK, `name`, `quantity` |
| `announcement`| Communications to all users. | `announcement_id` (PK), `hackathon_id` FK, `title`, `content`|

### Identity & Access
| Table | Purpose | Key Columns | Notes |
| --- | --- | --- | --- |
| `user` | A user account. | `user_id` (PK), `username` (UNIQUE) | Username is the only identifier. No personal info. |
| `role` | System roles (admin, organizer, etc.). | `role_id` (PK), `name` (UNIQUE) | Seeded at migration time. |
| `user_role` | Links users to roles. | `user_id` FK, `role_id` FK | Composite PK on `(user_id, role_id)`. |

### Teaming & Projects
| Table | Purpose | Key Columns | Notes |
| --- | --- | --- | --- |
| `team` | A team of participants. | `team_id` (PK), `hackathon_id` FK, `team_name` |
| `team_membership`| Links a user to one team. | `user_id` FK (PK), `team_id` FK | `user_id` is PK to enforce one-team-per-user rule. |
| `team_invite` | Invites to join a team. | `invite_id` (PK), `team_id` FK, `invitee_username`, `status`|
| `project` | The project a team works on. | `project_id` (PK), `team_id` FK (UNIQUE), `title`, `repo_url` | Serves as the official submission. One project per team. |

### Judging & Scoring
| Table | Purpose | Key Columns |
| --- | --- | --- |
| `score_criterion`| Scoring rubric. | `criterion_id` (PK), `hackathon_id` FK, `name`, `max_score` |
| `judge_assignment`| Assigns a judge to a project. | `assignment_id` (PK), `project_id` FK, `judge_user_id` FK |
| `score_entry` | A single score from a judge. | `entry_id` (PK), `project_id` FK, `criterion_id` FK, `judge_user_id` FK, `score_value` |
| `prize_award` | Record of a prize awarded to a project. | `prize_award_id` (PK), `prize_id` FK, `project_id` FK |

## Constraints & Rules
- **Default Participant Role**: An `AFTER INSERT` trigger on `user` adds the default 'participant' role.
- **Single Team Membership**: The `team_membership` table uses `user_id` as its primary key, which naturally enforces that a user can only be in one team.
- **Submission Window**: A trigger prevents updates to a project after the submission window has closed.
- **Judging Window**: A trigger ensures scores can only be submitted during the judging phase.
- **Atomic Operations**: Stored procedures are used for multi-step actions like accepting invites and awarding prizes to ensure they happen atomically.

## Triggers

```sql
-- Default participant role on user creation
DELIMITER $$
CREATE TRIGGER trg_user_after_insert
AFTER INSERT ON `user` FOR EACH ROW
BEGIN
  DECLARE v_participant_role_id BIGINT UNSIGNED;
  SELECT role_id INTO v_participant_role_id FROM role WHERE name = 'participant' LIMIT 1;
  IF v_participant_role_id IS NOT NULL THEN
    INSERT INTO user_role (user_id, role_id) VALUES (NEW.user_id, v_participant_role_id);
  END IF;
END $$
DELIMITER ;

-- Prevent updates to a project outside the submission window
DELIMITER $$
CREATE TRIGGER trg_project_submission_window
BEFORE UPDATE ON project FOR EACH ROW
BEGIN
  DECLARE v_is_submission_phase_active INT DEFAULT 0;
  SELECT COUNT(*) INTO v_is_submission_phase_active
  FROM hackathon_phase hp
  JOIN team t ON t.team_id = NEW.team_id
  WHERE hp.hackathon_id = t.hackathon_id
    AND hp.phase_type = 'submission'
    AND NOW(3) BETWEEN hp.starts_at AND hp.ends_at;

  IF v_is_submission_phase_active = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The submission window is closed.';
  END IF;
END $$
DELIMITER ;

-- Ensure scores are submitted during the judging window
DELIMITER $$
CREATE TRIGGER trg_score_entry_window
BEFORE INSERT ON score_entry FOR EACH ROW
BEGIN
  DECLARE v_is_judging_phase_active INT DEFAULT 0;
  SELECT COUNT(*) INTO v_is_judging_phase_active
  FROM hackathon_phase hp
  JOIN project p ON p.project_id = NEW.project_id
  JOIN team t ON t.team_id = p.team_id
  WHERE hp.hackathon_id = t.hackathon_id
    AND hp.phase_type = 'judging'
    AND NOW(3) BETWEEN hp.starts_at AND hp.ends_at;

  IF v_is_judging_phase_active = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The judging window is closed.';
  END IF;
END $$
DELIMITER ;
```

## Stored Procedures

```sql
-- Procedure to accept a team invite atomically
DELIMITER $$
CREATE PROCEDURE sp_accept_team_invite(IN p_invite_id BIGINT UNSIGNED, IN p_user_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_team_id BIGINT UNSIGNED;
  DECLARE v_invite_status VARCHAR(20);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT team_id, status INTO v_team_id, v_invite_status
  FROM team_invite WHERE invite_id = p_invite_id FOR UPDATE;

  IF v_invite_status != 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invite is no longer valid.';
  END IF;

  IF EXISTS(SELECT 1 FROM team_membership WHERE user_id = p_user_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User is already in a team.';
  END IF;

  INSERT INTO team_membership (user_id, team_id) VALUES (p_user_id, v_team_id);
  UPDATE team_invite SET status = 'accepted' WHERE invite_id = p_invite_id;

  COMMIT;
END $$
DELIMITER ;

-- Procedure to award a prize, checking quantity
DELIMITER $$
CREATE PROCEDURE sp_award_prize(IN p_prize_id BIGINT UNSIGNED, IN p_project_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_prize_quantity INT;
  DECLARE v_current_awards INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT quantity INTO v_prize_quantity FROM prize WHERE prize_id = p_prize_id FOR UPDATE;
  SELECT COUNT(*) INTO v_current_awards FROM prize_award WHERE prize_id = p_prize_id;

  IF v_current_awards >= v_prize_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'All prizes of this type have been awarded.';
  END IF;

  INSERT INTO prize_award (prize_id, project_id) VALUES (p_prize_id, p_project_id);

  COMMIT;
END $$
DELIMITER ;
```

## MySQL DDL Snippets

```sql
-- Core hackathon tables
CREATE TABLE hackathon (
  hackathon_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','published','active','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (hackathon_id)
);

CREATE TABLE hackathon_phase (
  phase_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hackathon_id BIGINT UNSIGNED NOT NULL,
  phase_type ENUM('registration','submission','judging') NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  PRIMARY KEY (phase_id),
  UNIQUE KEY ux_phase_unique (hackathon_id, phase_type),
  CONSTRAINT fk_phase_hackathon FOREIGN KEY (hackathon_id) REFERENCES hackathon(hackathon_id) ON DELETE CASCADE
);

-- Simplified user and role tables
CREATE TABLE `user` (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY ux_user_username (username)
);

CREATE TABLE role (
  role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (role_id),
  UNIQUE KEY ux_role_name (name)
);

CREATE TABLE user_role (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE RESTRICT
);

-- Teaming tables
CREATE TABLE team (
  team_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hackathon_id BIGINT UNSIGNED NOT NULL,
  team_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (team_id),
  UNIQUE KEY (hackathon_id, team_name),
  CONSTRAINT fk_team_hackathon FOREIGN KEY (hackathon_id) REFERENCES hackathon(hackathon_id) ON DELETE CASCADE
);

CREATE TABLE team_membership (
  user_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  joined_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_team FOREIGN KEY (team_id) REFERENCES team(team_id) ON DELETE CASCADE
);

-- Project is the submission
CREATE TABLE project (
  project_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  repo_url VARCHAR(255),
  demo_url VARCHAR(255),
  submitted_at DATETIME(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (project_id),
  UNIQUE KEY (team_id),
  CONSTRAINT fk_project_team FOREIGN KEY (team_id) REFERENCES team(team_id) ON DELETE CASCADE
);

-- Simplified judging tables
CREATE TABLE score_criterion (
  criterion_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hackathon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  max_score INT NOT NULL,
  PRIMARY KEY (criterion_id),
  CONSTRAINT fk_criterion_hackathon FOREIGN KEY (hackathon_id) REFERENCES hackathon(hackathon_id) ON DELETE CASCADE
);

CREATE TABLE judge_assignment (
  assignment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  judge_user_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (assignment_id),
  UNIQUE KEY ux_assignment_unique (project_id, judge_user_id),
  CONSTRAINT fk_assign_project FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_judge FOREIGN KEY (judge_user_id) REFERENCES `user`(user_id) ON DELETE CASCADE
);

CREATE TABLE score_entry (
  entry_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  criterion_id BIGINT UNSIGNED NOT NULL,
  judge_user_id BIGINT UNSIGNED NOT NULL,
  score_value INT NOT NULL,
  submitted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (entry_id),
  UNIQUE KEY ux_score_unique (project_id, criterion_id, judge_user_id),
  CONSTRAINT fk_score_project FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE,
  CONSTRAINT fk_score_criterion FOREIGN KEY (criterion_id) REFERENCES score_criterion(criterion_id) ON DELETE CASCADE,
  CONSTRAINT fk_score_judge FOREIGN KEY (judge_user_id) REFERENCES `user`(user_id) ON DELETE CASCADE
);

CREATE TABLE prize (
  prize_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hackathon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (prize_id),
  CONSTRAINT fk_prize_hackathon FOREIGN KEY (hackathon_id) REFERENCES hackathon(hackathon_id) ON DELETE CASCADE
);

CREATE TABLE prize_award (
  prize_award_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prize_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  awarded_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (prize_award_id),
  KEY ix_award_project (project_id),
  CONSTRAINT fk_award_prize FOREIGN KEY (prize_id) REFERENCES prize(prize_id) ON DELETE CASCADE,
  CONSTRAINT fk_award_project FOREIGN KEY (project_id) REFERENCES project(project_id) ON DELETE CASCADE
);
```

