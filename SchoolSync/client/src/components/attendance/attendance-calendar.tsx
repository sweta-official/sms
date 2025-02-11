import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Attendance, Subject } from "@shared/schema";
import { Loader2, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

export function AttendanceCalendar({
  userId,
  classId,
}: {
  userId: number;
  classId: number;
}) {
  const [date, setDate] = useState<Date>(new Date());

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects", `class/${classId}`],
  });

  const { data: attendance, isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", userId, format(date, "yyyy-MM")],
  });

  const getAttendanceForDate = (date: Date) => {
    return attendance?.find(
      (record) =>
        new Date(record.date).toDateString() === date.toDateString()
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attendance Calendar</CardTitle>
        <div className="text-sm text-muted-foreground">
          {format(date, "MMMM yyyy")}
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => date && setDate(date)}
          modifiers={{
            present: (date) => getAttendanceForDate(date)?.status === "present",
            absent: (date) => getAttendanceForDate(date)?.status === "absent",
            late: (date) => getAttendanceForDate(date)?.status === "late",
          }}
          modifiersClassNames={{
            present: "bg-green-100 text-green-900 hover:bg-green-200",
            absent: "bg-red-100 text-red-900 hover:bg-red-200",
            late: "bg-yellow-100 text-yellow-900 hover:bg-yellow-200",
          }}
          className="rounded-md border"
        />

        {/* Legend */}
        <div className="mt-6 flex gap-6 justify-center">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
              <X className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-sm">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="text-sm">Late</span>
          </div>
        </div>

        {/* Daily Details */}
        {getAttendanceForDate(date) && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3 text-lg">
              {format(date, "MMMM d, yyyy")}
            </h4>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Subject:</span>{" "}
                {subjects?.find((s) => s.id === getAttendanceForDate(date)?.subjectId)?.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${getAttendanceForDate(date)?.status === 'present' ? 'bg-green-100 text-green-800' :
                    getAttendanceForDate(date)?.status === 'absent' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'}`}>
                  {getAttendanceForDate(date)?.status.charAt(0).toUpperCase() + 
                   getAttendanceForDate(date)?.status.slice(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}