import { pgTable, serial, timestamp, varchar, boolean, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 用户表 - 管理员和代理
export const users = pgTable(
	"users",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		username: varchar("username", { length: 50 }).notNull().unique(),
		password: varchar("password", { length: 255 }).notNull(),
		role: varchar("role", { length: 20 }).notNull().default('agent'), // admin / agent
		name: varchar("name", { length: 100 }),
		phone: varchar("phone", { length: 20 }),
		is_active: boolean("is_active").default(true).notNull(),
		login_fail_count: integer("login_fail_count").default(0).notNull(), // 登录失败次数
		locked_until: timestamp("locked_until", { withTimezone: true }), // 锁定到期时间
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("users_username_idx").on(table.username),
		index("users_role_idx").on(table.role),
	]
);

// 投票项目表
export const votes = pgTable(
	"votes",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 200 }).notNull(),
		description: varchar("description", { length: 1000 }),
		status: varchar("status", { length: 20 }).notNull().default('active'), // active / closed
		created_by: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
		sms_number: varchar("sms_number", { length: 20 }).notNull().default('106988881700511'), // 短信接收号码
		cover_image: varchar("cover_image", { length: 500 }),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }),
	},
	(table) => [
		index("votes_created_by_idx").on(table.created_by),
		index("votes_status_idx").on(table.status),
		index("votes_created_at_idx").on(table.created_at),
	]
);

// 投票候选人/选项表（包含图片、短信内容）
export const voteCandidates = pgTable(
	"vote_candidates",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		vote_id: varchar("vote_id", { length: 36 }).notNull().references(() => votes.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(), // 候选人姓名
		description: varchar("description", { length: 500 }), // 候选人简介
		image_url: varchar("image_url", { length: 500 }), // 候选人图片
		sms_content: varchar("sms_content", { length: 100 }).notNull(), // 发送的短信内容
		vote_count: integer("vote_count").default(0).notNull(),
		order_num: integer("order_num").default(0).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("vote_candidates_vote_id_idx").on(table.vote_id),
		index("vote_candidates_order_idx").on(table.order_num),
	]
);

// 投票记录表（包含手机号、代理信息）
export const voteRecords = pgTable(
	"vote_records",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		vote_id: varchar("vote_id", { length: 36 }).notNull().references(() => votes.id, { onDelete: "cascade" }),
		candidate_id: varchar("candidate_id", { length: 36 }).notNull().references(() => voteCandidates.id, { onDelete: "cascade" }),
		phone_number: varchar("phone_number", { length: 20 }).notNull(), // 用户手机号
		agent_id: varchar("agent_id", { length: 36 }).references(() => users.id), // 来源代理
		source_link: varchar("source_link", { length: 200 }), // 来源链接标识
		user_agent: varchar("user_agent", { length: 500 }), // 浏览器信息
		ip_address: varchar("ip_address", { length: 50 }), // IP地址
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("vote_records_vote_id_idx").on(table.vote_id),
		index("vote_records_candidate_id_idx").on(table.candidate_id),
		index("vote_records_phone_idx").on(table.phone_number),
		index("vote_records_agent_id_idx").on(table.agent_id),
		index("vote_records_created_at_idx").on(table.created_at),
	]
);

// 代理推广链接表
export const agentLinks = pgTable(
	"agent_links",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		agent_id: varchar("agent_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
		vote_id: varchar("vote_id", { length: 36 }).references(() => votes.id, { onDelete: "cascade" }), // 可选，特定投票的链接
		link_code: varchar("link_code", { length: 20 }).notNull().unique(), // 链接唯一标识
		name: varchar("name", { length: 100 }), // 链接名称
		click_count: integer("click_count").default(0).notNull(), // 点击次数
		vote_count: integer("vote_count").default(0).notNull(), // 投票次数
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("agent_links_agent_id_idx").on(table.agent_id),
		index("agent_links_vote_id_idx").on(table.vote_id),
		index("agent_links_link_code_idx").on(table.link_code),
	]
);

// 类型导出
export type User = typeof users.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type VoteCandidate = typeof voteCandidates.$inferSelect;
export type VoteRecord = typeof voteRecords.$inferSelect;
export type AgentLink = typeof agentLinks.$inferSelect;
