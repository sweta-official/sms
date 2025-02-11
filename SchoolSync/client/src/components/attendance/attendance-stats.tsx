import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUp } from "lucide-react";

interface AttendanceStats {
  month: number;
  year: number;
  stats: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    attendancePercentage: number;
  };
}

export function AttendanceStats({ userId }: { userId: number }) {
  const currentYear = new Date().getFullYear();

  const { data: monthlyStats, isLoading } = useQuery<AttendanceStats[]>({
    queryKey: ["/api/attendance/monthly", userId, currentYear],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = monthlyStats?.map((month) => ({
    name: new Date(month.year, month.month - 1).toLocaleString('default', { month: 'short' }),
    Present: month.stats.presentDays,
    Absent: month.stats.absentDays,
    Late: month.stats.lateDays,
    'Attendance %': month.stats.attendancePercentage,
  }));

  // Calculate overall statistics
  const totalDays = monthlyStats?.reduce((acc, month) => 
    acc + month.stats.presentDays + month.stats.absentDays + month.stats.lateDays, 0) || 0;
  const totalPresent = monthlyStats?.reduce((acc, month) => acc + month.stats.presentDays, 0) || 0;
  const overallAttendance = totalDays ? (totalPresent / totalDays) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Attendance Statistics {currentYear}</span>
          <div className="flex items-center gap-2 text-lg">
            <span>{overallAttendance.toFixed(1)}%</span>
            <ArrowUp className={`h-4 w-4 ${overallAttendance >= 75 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="text-2xl font-bold text-green-700">{totalPresent}</div>
            <div className="text-sm text-green-600">Present Days</div>
          </div>
          <div className="p-4 rounded-lg bg-red-50 border border-red-100">
            <div className="text-2xl font-bold text-red-700">
              {monthlyStats?.reduce((acc, month) => acc + month.stats.absentDays, 0) || 0}
            </div>
            <div className="text-sm text-red-600">Absent Days</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
            <div className="text-2xl font-bold text-yellow-700">
              {monthlyStats?.reduce((acc, month) => acc + month.stats.lateDays, 0) || 0}
            </div>
            <div className="text-sm text-yellow-600">Late Days</div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}