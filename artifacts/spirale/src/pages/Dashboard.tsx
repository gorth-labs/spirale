import { useGetTestStats } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Activity, CheckCircle, XCircle, Percent, PlusCircle } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetTestStats();

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "-" : stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{isLoading ? "-" : stats?.passed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
              <XCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{isLoading ? "-" : stats?.failed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
              <Percent className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "-" : `${(stats?.successRate || 0).toFixed(1)}%`}</div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-bold mb-4">Recent Runs</h2>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-16 animate-pulse" />
            ))}
          </div>
        ) : stats?.recentRuns && stats.recentRuns.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">URL</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Steps</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium truncate max-w-[200px]" title={run.url}>
                      {run.url}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={run.status === "passed" ? "default" : run.status === "failed" || run.status === "error" ? "destructive" : "secondary"}
                        className={run.status === "passed" ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {run.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted-foreground">
                        <span className={run.passedSteps === run.totalSteps && run.totalSteps > 0 ? "text-green-500" : "text-foreground"}>{run.passedSteps}</span> / {run.totalSteps}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(run.createdAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/test/${run.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">No tests run yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start your first automated test run to see statistics and recent runs here.
            </p>
            <Button asChild>
              <Link href="/test/new">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Test
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </Layout>
  );
}
