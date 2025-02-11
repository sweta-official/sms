import { InsertUser, User, Attendance, Subject, ClassLevel, StudentAcademics, ExamResult } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { users, attendance, subjects, classLevels, studentAcademics, examResults } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: "admin" | "teacher" | "student"): Promise<User[]>;
  updateUser(id: number, data: Partial<Omit<User, "id" | "password">>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Class Management
  getClassLevels(): Promise<ClassLevel[]>;
  getClassLevelById(id: number): Promise<ClassLevel | undefined>;
  createClassLevel(data: Omit<ClassLevel, "id">): Promise<ClassLevel>;
  updateClassLevel(id: number, data: Partial<Omit<ClassLevel, "id">>): Promise<ClassLevel>;

  // Student Academics
  getStudentAcademics(studentId: number): Promise<StudentAcademics[]>;
  getCurrentAcademicYear(studentId: number): Promise<number | undefined>;
  updateStudentAcademics(id: number, data: Partial<Omit<StudentAcademics, "id">>): Promise<StudentAcademics>;
  promoteStudent(studentId: number, newClassId: number, academicYear: number): Promise<void>;

  // Subjects
  getSubjects(): Promise<Subject[]>;
  getSubjectsByTeacher(teacherId: number): Promise<Subject[]>;
  getSubjectsByClass(classId: number): Promise<Subject[]>;
  createSubject(subject: Omit<Subject, "id">): Promise<Subject>;
  updateSubject(id: number, data: Partial<Omit<Subject, "id">>): Promise<Subject>;
  deleteSubject(id: number): Promise<void>;

  // Attendance
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAttendanceByClass(classId: number, date: Date): Promise<Attendance[]>;
  createAttendance(attendance: Omit<Attendance, "id">): Promise<Attendance>;
  updateAttendance(id: number, data: Partial<Omit<Attendance, "id">>): Promise<Attendance>;

  // Exam Results
  getExamResults(studentId: number): Promise<ExamResult[]>;
  createExamResult(result: Omit<ExamResult, "id">): Promise<ExamResult>;
  updateExamResult(id: number, data: Partial<Omit<ExamResult, "id">>): Promise<ExamResult>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersByRole(role: "admin" | "teacher" | "student"): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async updateUser(id: number, data: Partial<Omit<User, "id" | "password">>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Class Management
  async getClassLevels(): Promise<ClassLevel[]> {
    return db.select().from(classLevels);
  }

  async getClassLevelById(id: number): Promise<ClassLevel | undefined> {
    const [classLevel] = await db.select().from(classLevels).where(eq(classLevels.id, id));
    return classLevel;
  }

  async createClassLevel(data: Omit<ClassLevel, "id">): Promise<ClassLevel> {
    const [classLevel] = await db.insert(classLevels).values(data).returning();
    return classLevel;
  }

  async updateClassLevel(id: number, data: Partial<Omit<ClassLevel, "id">>): Promise<ClassLevel> {
    const [classLevel] = await db.update(classLevels).set(data).where(eq(classLevels.id, id)).returning();
    return classLevel;
  }

  // Student Academics
  async getStudentAcademics(studentId: number): Promise<StudentAcademics[]> {
    return db.select().from(studentAcademics).where(eq(studentAcademics.studentId, studentId));
  }

  async getCurrentAcademicYear(studentId: number): Promise<number | undefined> {
    const [record] = await db
      .select()
      .from(users)
      .where(eq(users.id, studentId));
    return record?.academicYear;
  }

  async updateStudentAcademics(id: number, data: Partial<Omit<StudentAcademics, "id">>): Promise<StudentAcademics> {
    const [record] = await db.update(studentAcademics).set(data).where(eq(studentAcademics.id, id)).returning();
    return record;
  }

  async promoteStudent(studentId: number, newClassId: number, academicYear: number): Promise<void> {
    // Update user's current class and academic year
    await db.update(users)
      .set({ currentClassId: newClassId, academicYear })
      .where(eq(users.id, studentId));

    // Create new academic record for the next year
    await db.insert(studentAcademics).values({
      studentId,
      classLevelId: newClassId,
      academicYear,
      promotionStatus: "pending",
    });
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return db.select().from(subjects);
  }

  async getSubjectsByTeacher(teacherId: number): Promise<Subject[]> {
    return db.select().from(subjects).where(eq(subjects.teacherId, teacherId));
  }

  async getSubjectsByClass(classId: number): Promise<Subject[]> {
    return db.select().from(subjects).where(eq(subjects.classLevelId, classId));
  }

  async createSubject(subject: Omit<Subject, "id">): Promise<Subject> {
    const [newSubject] = await db.insert(subjects).values(subject).returning();
    return newSubject;
  }

  async updateSubject(id: number, data: Partial<Omit<Subject, "id">>): Promise<Subject> {
    const [subject] = await db.update(subjects).set(data).where(eq(subjects.id, id)).returning();
    return subject;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // Attendance
  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.userId, userId));
  }

  async getAttendanceByClass(classId: number, date: Date): Promise<Attendance[]> {
    return db.select().from(attendance).where(
      and(
        eq(attendance.classLevelId, classId),
        eq(attendance.date, date)
      )
    );
  }

  async createAttendance(attendanceData: Omit<Attendance, "id">): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(attendanceData).returning();
    return record;
  }

  async updateAttendance(id: number, data: Partial<Omit<Attendance, "id">>): Promise<Attendance> {
    const [record] = await db.update(attendance).set(data).where(eq(attendance.id, id)).returning();
    return record;
  }

  // Exam Results
  async getExamResults(studentId: number): Promise<ExamResult[]> {
    return db.select().from(examResults).where(eq(examResults.studentId, studentId));
  }

  async createExamResult(result: Omit<ExamResult, "id">): Promise<ExamResult> {
    const [record] = await db.insert(examResults).values(result).returning();
    return record;
  }

  async updateExamResult(id: number, data: Partial<Omit<ExamResult, "id">>): Promise<ExamResult> {
    const [record] = await db.update(examResults).set(data).where(eq(examResults.id, id)).returning();
    return record;
  }
}

export const storage = new DatabaseStorage();