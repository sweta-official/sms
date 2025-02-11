import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertAnnouncementSchema, insertAttendanceSchema, insertMaterialSchema, insertSubjectSchema } from "@shared/schema";
import { z } from "zod";

// Middleware to check if user is admin
function requireAdmin(req: Express.Request, res: Express.Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
  if (req.user.role !== "admin") return res.status(403).send("Forbidden");
  next();
}

// Middleware to check if user is a teacher
function requireTeacher(req: Express.Request, res: Express.Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher" && req.user.role !== "admin") return res.status(403).send("Forbidden");
  next();
}

// Enhanced Attendance Reports and Analytics
const bulkAttendanceSchema = z.object({
  date: z.coerce.date(),
  subjectId: z.number(),
  studentIds: z.array(z.number()),
  status: z.enum(["present", "absent", "late"]),
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Admin User Management Routes
  app.get("/api/users", requireAdmin, async (_req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get("/api/users/:role", requireAdmin, async (req, res) => {
    const role = req.params.role as "admin" | "teacher" | "student";
    if (!["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const users = await storage.getUsersByRole(role);
    res.json(users);
  });

  // Class Level Management
  app.get("/api/class-levels", async (_req, res) => {
    const classLevels = await storage.getClassLevels();
    res.json(classLevels);
  });

  app.get("/api/class-levels/:id", async (req, res) => {
    const classLevel = await storage.getClassLevelById(parseInt(req.params.id));
    if (!classLevel) return res.status(404).json({ message: "Class level not found" });
    res.json(classLevel);
  });

  // Enhanced User Management
  app.patch("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    // Only allow users to update their own profile unless they're an admin
    if (req.user.role !== "admin" && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const updateSchema = z.object({
      fullName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      profilePicture: z.string().optional(),
      role: req.user.role === "admin" ? z.enum(["admin", "teacher", "student"]).optional() : z.undefined(),
    });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const user = await storage.updateUser(parseInt(req.params.id), parsed.data);
      res.json(user);
    } catch (error) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error) {
      res.status(404).json({ message: "User not found" });
    }
  });

  // Enhanced Attendance Management
  app.get("/api/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    let attendance;
    if (req.user.role === "student") {
      attendance = await storage.getAttendanceByUser(req.user.id);
    } else {
      // For teachers and admins, get attendance by class and date
      const { classId, date } = req.query;
      if (classId && date) {
        attendance = await storage.getAttendanceByClass(
          parseInt(classId as string),
          new Date(date as string)
        );
      } else {
        attendance = [];
      }
    }

    res.json(attendance);
  });

  app.post("/api/attendance", requireTeacher, async (req, res) => {
    const parsed = insertAttendanceSchema.safeParse({
      ...req.body,
      markedBy: req.user.id,
    });
    if (!parsed.success) return res.status(400).json(parsed.error);

    const attendance = await storage.createAttendance(parsed.data);
    res.status(201).json(attendance);
  });

  // Student Academics and Promotion
  app.get("/api/students/:id/academics", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    const academics = await storage.getStudentAcademics(parseInt(req.params.id));
    res.json(academics);
  });

  app.post("/api/students/:id/promote", requireAdmin, async (req, res) => {
    const studentId = parseInt(req.params.id);
    const { newClassId, academicYear } = req.body;

    try {
      await storage.promoteStudent(studentId, newClassId, academicYear);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to promote student" });
    }
  });

  // Exam Results
  app.get("/api/students/:id/results", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    const results = await storage.getExamResults(parseInt(req.params.id));
    res.json(results);
  });

  app.post("/api/results", requireTeacher, async (req, res) => {
    const { studentId, subjectId, academicYear, term, marks, grade, examDate } = req.body;

    try {
      const result = await storage.createExamResult({
        studentId,
        subjectId,
        academicYear,
        term,
        marks,
        grade,
        examDate: new Date(examDate),
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to create exam result" });
    }
  });

  // Subject Management
  app.get("/api/subjects", async (_req, res) => {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  });

  app.get("/api/subjects/class/:classId", async (req, res) => {
    const subjects = await storage.getSubjectsByClass(parseInt(req.params.classId));
    res.json(subjects);
  });

  app.get("/api/subjects/teacher/:teacherId", async (req, res) => {
    const subjects = await storage.getSubjectsByTeacher(parseInt(req.params.teacherId));
    res.json(subjects);
  });

  app.post("/api/subjects", requireAdmin, async (req, res) => {
    const parsed = insertSubjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const subject = await storage.createSubject(parsed.data);
    res.status(201).json(subject);
  });

  const httpServer = createServer(app);
  return httpServer;
}