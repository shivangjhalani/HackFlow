-- DATABASE INITIALIZEE
drop database if exists hackathon;
create database hackathon;
use hackathon;

-- TABLES
-- Roles and User Management

create table role (
  role_id int auto_increment primary key,
  name varchar(20) not null unique
);

insert into role (name) values
  ('admin'),
  ('organizer'),
  ('judge'),
  ('participant');

-- Hackathon config (ONLY ONE HACKAHON)

create table hackathon (
  hackathon_id int primary key,
  name varchar(20) not null,
  description text,
  start_at datetime,
  end_at datetime,
  reg_start_at datetime,
  reg_end_at datetime,
  min_team_size int not null default 1,
  max_team_size int not null,
  published tinyint(1) not null default 0,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

-- Users & roles

create table user (
  user_id int auto_increment primary key,
  username varchar(64) not null unique,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table user_role (
  user_id int not null,
  role_id int not null,
  assigned_at timestamp not null default current_timestamp,
  primary key (user_id, role_id),
  foreign key (user_id) references user(user_id) on delete cascade,
  foreign key (role_id) references role(role_id)
);

-- TEAM MANAGEMENT
create table team (
  team_id int auto_increment primary key,
  team_name varchar(100) not null unique,
  owner_user_id int not null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  foreign key (owner_user_id) references user(user_id)
);

create table team_member (
  team_id int not null,
  user_id int not null,
  joined_at timestamp not null default current_timestamp,
  primary key (team_id, user_id),
  unique key (user_id),
  foreign key (team_id) references team(team_id) on delete cascade,
  foreign key (user_id) references user(user_id)
);

create table team_invite (
  invite_id int auto_increment primary key,
  team_id int not null,
  invitee_username varchar(20) not null,
  token char(36) not null unique,
  status enum('pending','accepted','revoked','expired') not null default 'pending',
  created_at timestamp not null default current_timestamp,
  accepted_at timestamp,
  revoked_at timestamp,
  expires_at datetime,
  foreign key (team_id) references team(team_id) on delete cascade
);

-- TRACKS AND PROJECTS
create table track (
  track_id int auto_increment primary key,
  name varchar(100) not null unique,
  description text,
  max_teams int check (max_teams > 0)
);

create table project (
  project_id int auto_increment primary key,
  team_id int not null unique,
  track_id int,
  title varchar(140) not null,
  abstract text,
  repo_url varchar(255),
  demo_url varchar(255),
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  foreign key (team_id) references team(team_id) on delete cascade,
  foreign key (track_id) references track(track_id) on delete set null
);

-- JUDGING AND SCORING
create table judging_round (
  round_id int auto_increment primary key,
  name varchar(120) not null,
  seq_no int not null unique,
  start_at datetime,
  end_at datetime,
  created_at timestamp not null default current_timestamp
);

create table submission (
  submission_id int auto_increment primary key,
  project_id int not null,
  round_id int not null,
  submitted_at timestamp not null default current_timestamp,
  notes text,
  sub_version int not null,
  unique key (project_id, round_id, sub_version),
  foreign key (project_id) references project(project_id) on delete cascade,
  foreign key (round_id) references judging_round(round_id)
);

create table score (
  score_id int auto_increment primary key,
  submission_id int not null,
  judge_user_id int not null,
  score decimal(5,2) not null,
  feedback text,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  unique key (submission_id, judge_user_id),
  foreign key (submission_id) references submission(submission_id) on delete cascade,
  foreign key (judge_user_id) references user(user_id)
);

create table judge_assignment (
  assignment_id int auto_increment primary key,
  judge_user_id int not null,
  team_id int not null,
  assigned_at timestamp not null default current_timestamp,
  unique key (judge_user_id, team_id),
  foreign key (judge_user_id) references user(user_id) on delete cascade,
  foreign key (team_id) references team(team_id) on delete cascade
);

-- PRIZES AND AWARDS
create table prize (
  prize_id int auto_increment primary key,
  name varchar(20) not null unique,
  description text,
  quantity int not null default 1,
  prize_value decimal(10,2)
);

create table prize_award (
  award_id int auto_increment primary key,
  prize_id int not null,
  team_id int not null,
  awarded_at timestamp not null default current_timestamp,
  unique key (prize_id, team_id),
  foreign key (prize_id) references prize(prize_id),
  foreign key (team_id) references team(team_id)
);

-- ANNOUNCEMENTS
create table announcement (
  announcement_id int auto_increment primary key,
  title varchar(150) not null,
  content text not null,
  created_at timestamp not null default current_timestamp,
  author_user_id int,
  foreign key (author_user_id) references user(user_id) on delete set null
);

-- FUNCTIONS
delimiter $$

create function fn_normalize_username(username varchar(64))
returns varchar(64)
deterministic
begin
  return lower(trim(username));
end $$

create function fn_max_team_size()
returns int
deterministic
begin
  return coalesce((select max_team_size from hackathon where hackathon_id = 1), 5);
end $$

delimiter ;

-- STORED PROCEDURES
-- Hackathon Management
delimiter $$

create procedure sp_upsert_hackathon(
  in p_name varchar(120),
  in p_description text,
  in p_start_at datetime,
  in p_end_at datetime,
  in p_reg_start_at datetime,
  in p_reg_end_at datetime,
  in p_min_team_size int,
  in p_max_team_size int,
  in p_published tinyint(1)
)
begin
  if exists (select 1 from hackathon where hackathon_id = 1) then
    update hackathon
    set name = p_name, description = p_description, start_at = p_start_at,
        end_at = p_end_at, reg_start_at = p_reg_start_at, reg_end_at = p_reg_end_at,
        min_team_size = p_min_team_size, max_team_size = p_max_team_size,
        published = p_published
    where hackathon_id = 1;
  else
    insert into hackathon (hackathon_id, name, description, start_at, end_at,
                           reg_start_at, reg_end_at, min_team_size, max_team_size, published)
    values (1, p_name, p_description, p_start_at, p_end_at,
            p_reg_start_at, p_reg_end_at, p_min_team_size, p_max_team_size, p_published);
  end if;
end $$

-- User Management

create procedure sp_claim_username(in p_username varchar(64))
begin
  declare v_username varchar(64);
  declare v_user_id int;
  set v_username = fn_normalize_username(p_username);

  if v_username is null or v_username = '' then
    signal sqlstate '45000' set message_text = 'Username cannot be empty';
  end if;

  insert into user (username) values (v_username)
  on duplicate key update user_id = user_id;

  select user_id into v_user_id from user where username = v_username;

  insert ignore into user_role (user_id, role_id)
  select v_user_id, role_id from role where name = 'participant';

  select v_user_id as user_id;
end $$

-- Team Management

create procedure sp_create_team(
  in p_owner_user_id int,
  in p_team_name varchar(100)
)
begin
  declare v_team_id int;

  if exists (select 1 from team_member where user_id = p_owner_user_id) then
    signal sqlstate '45000' set message_text = 'User already in a team';
  end if;

  insert into team (team_name, owner_user_id) values (p_team_name, p_owner_user_id);
  set v_team_id = last_insert_id();
  insert into team_member (team_id, user_id) values (v_team_id, p_owner_user_id);
  select v_team_id as team_id;
end $$

-- Q: How can a team owner invite a new member while respecting limits?
create procedure sp_invite_user(
  in p_owner_user_id int,
  in p_team_id int,
  in p_invitee_username varchar(64)
)
begin
  declare v_token char(36);
  declare v_normalized_username varchar(64);
  declare v_team_size int;

  if not exists (select 1 from team where team_id = p_team_id and owner_user_id = p_owner_user_id) then
    signal sqlstate '45000' set message_text = 'Not team owner';
  end if;

  select count(*) into v_team_size from team_member where team_id = p_team_id;
  if v_team_size >= fn_max_team_size() then
    signal sqlstate '45000' set message_text = 'Team is full';
  end if;

  set v_normalized_username = fn_normalize_username(p_invitee_username);

  if exists (
    select 1 from team_member tm
    join user u on u.user_id = tm.user_id
    where tm.team_id = p_team_id and u.username = v_normalized_username
  ) then
    signal sqlstate '45000' set message_text = 'User is already a team member';
  end if;

  if exists (
    select 1 from team_invite
    where team_id = p_team_id and invitee_username = v_normalized_username and status = 'pending'
  ) then
    signal sqlstate '45000' set message_text = 'User already has a pending invite';
  end if;

  set v_token = uuid();
  insert into team_invite (team_id, invitee_username, token)
  values (p_team_id, v_normalized_username, v_token);
  select v_token as token;
end $$

create procedure sp_accept_invite(
  in p_token char(36),
  in p_invitee_user_id int
)
begin
  declare v_team_id int;
  declare v_team_size int;

  select team_id into v_team_id from team_invite where token = p_token and status = 'pending';

  if v_team_id is null then
    signal sqlstate '45000' set message_text = 'Invalid invite token';
  end if;

  if exists (select 1 from team_member where user_id = p_invitee_user_id) then
    signal sqlstate '45000' set message_text = 'User is already in a team';
  end if;

  select count(*) into v_team_size from team_member where team_id = v_team_id;
  if v_team_size >= fn_max_team_size() then
    signal sqlstate '45000' set message_text = 'Team is full';
  end if;

  update team_invite set status = 'accepted', accepted_at = current_timestamp where token = p_token;
  insert into team_member (team_id, user_id) values (v_team_id, p_invitee_user_id);
end $$

-- Project and Submission Management

create procedure sp_submit_project(
  in p_team_id int,
  in p_title varchar(140),
  in p_abstract text,
  in p_repo_url varchar(255),
  in p_demo_url varchar(255),
  in p_track_id int
)
begin
  insert into project (team_id, track_id, title, abstract, repo_url, demo_url)
  values (p_team_id, p_track_id, p_title, p_abstract, p_repo_url, p_demo_url)
  on duplicate key update
    track_id = p_track_id, title = p_title, abstract = p_abstract,
    repo_url = p_repo_url, demo_url = p_demo_url;
end $$

create procedure sp_create_submission(
  in p_project_id int,
  in p_round_id int,
  in p_notes text
)
begin
  declare v_submission_id int;
  declare v_next_version int;

  select ifnull(max(sub_version), 0) + 1 into v_next_version
  from submission
  where project_id = p_project_id and round_id = p_round_id;

  insert into submission (project_id, round_id, notes, sub_version)
  values (p_project_id, p_round_id, p_notes, v_next_version);

  set v_submission_id = last_insert_id();
  select v_submission_id as submission_id;
end $$

-- Judge Assignment and Scoring

create procedure sp_assign_judge(
  in p_team_id int,
  in p_judge_user_id int,
  in p_assigned_by int
)
begin
  if not exists (
    select 1 from user_role ur
    join role r on r.role_id = ur.role_id
    where ur.user_id = p_assigned_by and r.name in ('admin', 'organizer')
  ) then
    signal sqlstate '45000' set message_text = 'Not authorized to assign judges';
  end if;

  if not exists (
    select 1 from user_role ur
    join role r on r.role_id = ur.role_id
    where ur.user_id = p_judge_user_id and r.name = 'judge'
  ) then
    signal sqlstate '45000' set message_text = 'User is not a judge';
  end if;

  insert into judge_assignment (judge_user_id, team_id)
  values (p_judge_user_id, p_team_id)
  on duplicate key update assigned_at = current_timestamp;
end $$

create procedure sp_remove_judge_assignment(
  in p_team_id int,
  in p_judge_user_id int,
  in p_removed_by int
)
begin
  if not exists (
    select 1 from user_role ur
    join role r on r.role_id = ur.role_id
    where ur.user_id = p_removed_by and r.name in ('admin', 'organizer')
  ) then
    signal sqlstate '45000' set message_text = 'Not authorized to remove assignments';
  end if;

  delete from judge_assignment
  where judge_user_id = p_judge_user_id and team_id = p_team_id;
end $$

create procedure sp_record_score(
  in p_judge_user_id int,
  in p_submission_id int,
  in p_score decimal(5,2),
  in p_feedback text
)
begin
  if p_score < 0 or p_score > 100 then
    signal sqlstate '45000' set message_text = 'Score out of range';
  end if;

  insert into score (submission_id, judge_user_id, score, feedback)
  values (p_submission_id, p_judge_user_id, p_score, p_feedback)
  on duplicate key update score = p_score, feedback = p_feedback, updated_at = current_timestamp;
end $$

-- Prize Management

create procedure sp_award_prize(
  in p_prize_id int,
  in p_team_id int
)
begin
  declare v_quantity int;
  declare v_awarded int;

  select quantity into v_quantity from prize where prize_id = p_prize_id;
  select count(*) into v_awarded from prize_award where prize_id = p_prize_id;

  if v_awarded >= v_quantity then
    signal sqlstate '45000' set message_text = 'No remaining quantity for this prize';
  end if;

  insert into prize_award (prize_id, team_id) values (p_prize_id, p_team_id);
end $$

delimiter ;

-- TRIGGERS
delimiter $$

-- Hackathon Singleton Enforcement

create trigger trg_hackathon_singleton_bi before insert on hackathon
for each row
begin
  set new.hackathon_id = 1;
end $$

-- Username Normalization

create trigger trg_user_normalize_bi before insert on user
for each row
begin
  set new.username = fn_normalize_username(new.username);
  if new.username = '' then
    signal sqlstate '45000' set message_text = 'Username cannot be empty';
  end if;
end $$

create trigger trg_user_normalize_bu before update on user
for each row
begin
  set new.username = fn_normalize_username(new.username);
  if new.username = '' then
    signal sqlstate '45000' set message_text = 'Username cannot be empty';
  end if;
end $$

-- First User Auto-Admin Assignment

create trigger trg_first_user_admin_ai after insert on user
for each row
begin
  declare v_admin_role int;
  declare v_admin_count int;

  select role_id into v_admin_role from role where name = 'admin';
  select count(*) into v_admin_count from user_role where role_id = v_admin_role;

  if v_admin_count = 0 then
    insert into user_role (user_id, role_id) values (new.user_id, v_admin_role);
  end if;
end $$

-- Team Size Validation

create trigger trg_team_size_guard_bi before insert on team_member
for each row
begin
  declare v_member_count int;

  select count(*) into v_member_count from team_member where team_id = new.team_id;
  if v_member_count >= fn_max_team_size() then
    signal sqlstate '45000' set message_text = 'Team size exceeds max limit';
  end if;
end $$

-- Prize Quantity Validation

create trigger trg_prize_quantity_guard_bi before insert on prize_award
for each row
begin
  declare v_quantity int;
  declare v_awarded int;

  select quantity into v_quantity from prize where prize_id = new.prize_id;
  select count(*) into v_awarded from prize_award where prize_id = new.prize_id;

  if v_awarded >= v_quantity then
    signal sqlstate '45000' set message_text = 'No remaining quantity for prize';
  end if;
end $$

delimiter ;

-- VIEWS
-- Scoring and Leaderboard Views

create or replace view vw_round_scores as
select
  s.round_id,
  r.seq_no,
  r.name as round_name,
  s.project_id,
  p.team_id,
  s.submission_id,
  s.sub_version,
  avg(sc.score) as avg_score,
  min(sc.score) as min_score,
  max(sc.score) as max_score,
  count(sc.score_id) as judge_count
from submission s
join judging_round r on r.round_id = s.round_id
join project p on p.project_id = s.project_id
left join score sc on sc.submission_id = s.submission_id
group by s.submission_id;

-- Q: What are each team's total and average scores based on latest submissions?
create or replace view vw_overall_scores as
with latest_submissions as (
  select project_id, round_id, max(sub_version) as latest_version
  from submission
  group by project_id, round_id
)
select
  t.team_id,
  t.team_name,
  sum(rs.avg_score) as total_avg_score,
  avg(rs.avg_score) as avg_per_round,
  count(distinct rs.round_id) as rounds_participated
from team t
join project p on p.team_id = t.team_id
join latest_submissions ls on ls.project_id = p.project_id
join vw_round_scores rs on rs.project_id = ls.project_id
  and rs.round_id = ls.round_id
  and rs.sub_version = ls.latest_version
group by t.team_id, t.team_name;

-- Participation Tracking Views

create or replace view vw_team_participation as
with round_counts as (
  select count(*) as total_rounds from judging_round
),
team_rounds as (
  select t.team_id, t.team_name, count(distinct s.round_id) as rounds_submitted
  from team t
  left join project p on p.team_id = t.team_id
  left join submission s on s.project_id = p.project_id
  group by t.team_id, t.team_name
)
select
  tr.team_id,
  tr.team_name,
  case
    when rc.total_rounds > 0 and tr.rounds_submitted = rc.total_rounds then 'complete'
    when tr.rounds_submitted > 0 then 'partial'
    else 'none'
  end as participation_status
from team_rounds tr
cross join round_counts rc;

-- Q: Which judges are keeping up with their assigned submissions?
create or replace view vw_judge_participation as
with judge_stats as (
  select
    u.user_id,
    u.username,
    count(distinct ja.team_id) as assigned_teams,
    count(distinct sc.submission_id) as scored_count,
    count(distinct s.submission_id) as expected_count
  from user u
  join user_role ur on ur.user_id = u.user_id
  join role r on r.role_id = ur.role_id and r.name = 'judge'
  left join judge_assignment ja on ja.judge_user_id = u.user_id
  left join score sc on sc.judge_user_id = u.user_id
  left join submission s on s.project_id in (
    select project_id from project where team_id in (
      select team_id from judge_assignment where judge_user_id = u.user_id
    )
  )
  group by u.user_id, u.username
)
select
  user_id,
  username,
  assigned_teams,
  scored_count as scored_submissions,
  case
    when assigned_teams = 0 then 'not_assigned'
    when scored_count = 0 then 'none'
    when scored_count < expected_count then 'partial'
    else 'complete'
  end as participation_status
from judge_stats;
