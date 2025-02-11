import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { AttendanceStats } from "@/components/attendance/attendance-stats";
import type { ClassLevel, User, Subject, Attendance } from "@shared/schema";

export default function Attendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedSubject, setSelectedSubject] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Get classes for teacher
  const { data: classes, isLoading: loadingClasses } = useQuery<ClassLevel[]>({
    queryKey: ["/api/class-levels"],
    enabled: user?.role === "teacher" || user?.role === "admin",
  });

  // Get subjects for the selected class
  const { data: subjects, isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", `class/${selectedClass}`],
    enabled: !!selectedClass,
  });

  // Get students for the selected class
  const { data: students, isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ["/api/users/class", selectedClass],
    enabled: !!selectedClass && (user?.role === "teacher" || user?.role === "admin"),
  });

  // Get attendance records
  const { data: attendance, isLoading: loadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", selectedClass, selectedSubject, selectedDate],
    enabled: !!selectedClass && !!selectedSubject,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: number;
      status: "present" | "absent" | "late";
    }) => {
      const res = await apiRequest("POST", "/api/attendance", {
        userId,
        subjectId: parseInt(selectedSubject!),
        classLevelId: parseInt(selectedClass!),
        date: new Date(selectedDate),
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/attendance", selectedClass, selectedSubject, selectedDate],
      });
      toast({
        title: "Success",
        description: "Attendance marked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingClasses || (user?.role === "student" && loadingAttendance)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role === "student") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Attendance Record</h1>
          <div className="text-sm text-muted-foreground">
            Current Class: {user.currentClassId ? classes?.find(c => c.id === user.currentClassId)?.name : 'Not Assigned'}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AttendanceStats userId={user.id} />
          {user.currentClassId && (
            <AttendanceCalendar
              userId={user.id}
              classId={user.currentClassId}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <div className="text-sm text-muted-foreground">
          {selectedClass && classes && `Selected Class: ${classes.find(c => c.id === parseInt(selectedClass))?.name}`}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Class Level</label>
                <Select
                  value={selectedClass}
                  onValueChange={(value) => {
                    setSelectedClass(value);
                    setSelectedSubject(undefined); // Reset subject when class changes
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((classLevel) => (
                      <SelectItem 
                        key={classLevel.id} 
                        value={classLevel.id.toString()}
                      >
                        {classLevel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  disabled={!selectedClass || loadingSubjects}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingSubjects ? "Loading..." : "Select a subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem 
                        key={subject.id} 
                        value={subject.id.toString()}
                      >
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : selectedClass && selectedSubject && students?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found in this class
              </div>
            ) : selectedClass && selectedSubject && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map((student) => {
                      const studentAttendance = attendance?.find(
                        (a) => a.userId === student.id
                      );
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.fullName}</TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${studentAttendance?.status === 'present' ? 'bg-green-100 text-green-800' :
                                studentAttendance?.status === 'absent' ? 'bg-red-100 text-red-800' :
                                studentAttendance?.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'}`}>
                              {studentAttendance?.status ? studentAttendance.status.charAt(0).toUpperCase() + studentAttendance.status.slice(1) : 'Not marked'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={studentAttendance?.status === "present" ? "default" : "outline"}
                                onClick={() => markAttendanceMutation.mutate({
                                  userId: student.id,
                                  status: "present",
                                })}
                                className="min-w-[90px]"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={studentAttendance?.status === "absent" ? "default" : "outline"}
                                onClick={() => markAttendanceMutation.mutate({
                                  userId: student.id,
                                  status: "absent",
                                })}
                                className="min-w-[90px]"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                variant={studentAttendance?.status === "late" ? "default" : "outline"}
                                onClick={() => markAttendanceMutation.mutate({
                                  userId: student.id,
                                  status: "late",
                                })}
                                className="min-w-[90px]"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Late
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}