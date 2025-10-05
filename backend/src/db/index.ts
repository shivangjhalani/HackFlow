import { Kysely, MysqlDialect, Generated } from 'kysely';
import { createPool } from 'mysql2';
import * as dotenv from 'dotenv';

dotenv.config();

// This is a placeholder for the generated database types.
// We will generate this file later.
export interface Database {
  hackathon: HackathonTable;
  hackathon_phase: HackathonPhaseTable;
  track: TrackTable;
  prize: PrizeTable;
  announcement: AnnouncementTable;
  user: UserTable;
  role: RoleTable;
  user_role: UserRoleTable;
  team: TeamTable;
  team_membership: TeamMembershipTable;
  team_invite: TeamInviteTable;
  project: ProjectTable;
  score_criterion: ScoreCriterionTable;
  judge_assignment: JudgeAssignmentTable;
  score_entry: ScoreEntryTable;
  prize_award: PrizeAwardTable;
}

export interface HackathonTable {
  hackathon_id: Generated<number>;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'active' | 'archived';
  created_at: Generated<Date>;
}

export interface HackathonPhaseTable {
    phase_id: Generated<number>;
    hackathon_id: number;
    phase_type: 'registration' | 'submission' | 'judging';
    starts_at: Date;
    ends_at: Date;
}

export interface TrackTable {
    track_id: Generated<number>;
    hackathon_id: number;
    name: string;
}

export interface PrizeTable {
    prize_id: Generated<number>;
    hackathon_id: number;
    name: string;
    quantity: number;
}

export interface AnnouncementTable {
    announcement_id: Generated<number>;
    hackathon_id: number;
    title: string;
    content: string;
}

export interface UserTable {
    user_id: Generated<number>;
    username: string;
    created_at: Generated<Date>;
}

export interface RoleTable {
    role_id: Generated<number>;
    name: string;
    description: string | null;
}

export interface UserRoleTable {
    user_id: number;
    role_id: number;
}

export interface TeamTable {
    team_id: Generated<number>;
    hackathon_id: number;
    team_name: string;
    created_at: Generated<Date>;
}

export interface TeamMembershipTable {
    user_id: number;
    team_id: number;
    joined_at: Generated<Date>;
}

export interface TeamInviteTable {
    invite_id: Generated<number>;
    team_id: number;
    invitee_username: string;
    status: 'pending' | 'accepted' | 'declined';
}

export interface ProjectTable {
    project_id: Generated<number>;
    team_id: number;
    title: string;
    description: string | null;
    repo_url: string | null;
    demo_url: string | null;
    submitted_at: Date | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export interface ScoreCriterionTable {
    criterion_id: Generated<number>;
    hackathon_id: number;
    name: string;
    max_score: number;
}

export interface JudgeAssignmentTable {
    assignment_id: Generated<number>;
    project_id: number;
    judge_user_id: number;
}

export interface ScoreEntryTable {
    entry_id: Generated<number>;
    project_id: number;
    criterion_id: number;
    judge_user_id: number;
    score_value: number;
    submitted_at: Generated<Date>;
}

export interface PrizeAwardTable {
    prize_award_id: Generated<number>;
    prize_id: number;
    project_id: number;
    awarded_at: Generated<Date>;
}

const dialect = new MysqlDialect({
  pool: createPool({
    uri: process.env.DATABASE_URL,
  }),
});

export const db = new Kysely<Database>({
  dialect,
});
