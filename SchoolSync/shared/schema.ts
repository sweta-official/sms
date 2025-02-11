import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const classLevels = pgTable("class_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Grade 1", "Grade 2"
  description: text("description"),
  academicYear: integer("academic_year").notNull(), // e.g., 2024
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  profilePicture: text("profile_picture"),
  currentClassId: integer("current_class_id").references(() => classLevels.id),
  academicYear: integer("academic_year"), // Current academic year for the student
});

export const studentAcademics = pgTable("student_academics", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  classLevelId: integer("class_level_id").references(() => classLevels.id).notNull(),
  academicYear: integer("academic_year").notNull(),
  overallGrade: text("overall_grade"), // A, B, C, D, F
  promotionStatus: text("promotion_status", {
    enum: ["pending", "promoted", "retained"]
  }).default("pending"),
  remarks: text("remarks"),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").references(() => users.id),
  classLevelId: integer("class_level_id").references(() => classLevels.id).notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  classLevelId: integer("class_level_id").references(() => classLevels.id).notNull(),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["present", "absent", "late"] }).notNull(),
  markedBy: integer("marked_by").references(() => users.id).notNull(),
  notes: text("notes"),
  notificationSent: boolean("notification_sent").default(false),
});

export const examResults = pgTable("exam_results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  academicYear: integer("academic_year").notNull(),
  term: integer("term").notNull(), // 1, 2, 3 for different terms
  marks: integer("marks").notNull(),
  grade: text("grade").notNull(), // A, B, C, D, F
  examDate: timestamp("exam_date").notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendanceStats = pgTable("attendance_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  presentDays: integer("present_days").notNull(),
  absentDays: integer("absent_days").notNull(),
  lateDays: integer("late_days").notNull(),
});

// Insert Schemas
export const insertClassLevelSchema = createInsertSchema(classLevels).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  email: true,
  profilePicture: true,
  currentClassId: true,
  academicYear: true,
});

export const insertStudentAcademicsSchema = createInsertSchema(studentAcademics).omit({
  id: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  notificationSent: true,
});

export const insertExamResultSchema = createInsertSchema(examResults).omit({
  id: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceStatsSchema = createInsertSchema(attendanceStats).omit({
  id: true,
});


// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ClassLevel = typeof classLevels.$inferSelect;
export type StudentAcademics = typeof studentAcademics.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type ExamResult = typeof examResults.$inferSelect;

// Additional types for operations
export type PromotionResult = {
  studentId: number;
  oldClassId: number;
  newClassId: number;
  academicYear: number;
  status: "promoted" | "retained";
  reason?: string;
};

export const promotionSchema = z.object({
  studentId: z.number(),
  decision: z.enum(["promote", "retain"]),
  remarks: z.string().optional(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type AttendanceStats = typeof attendanceStats.$inferSelect;
export type InsertAttendanceStats = z.infer<typeof insertAttendanceStatsSchema>;