import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useGetTest, getGetTestQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock, Terminal, Download, LayoutList, Image as ImageIcon, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { AllureReport } from "@/components/AllureReport";

export default function TestDetail() {
  const [, params] = useRoute("/test/:id");
  const testId = params?.id ? parseInt(params.id, 10) : 0;

  const queryClient = useQueryClient();
  const { data: test, isLoading } = useGetTest(testId, {
    query: {
      enabled: !!testId,
      queryKey: getGetTestQueryKey(testId),
    },
  });

  const [liveSteps, setLiveSteps] = useState<any[]>([]);
  const [liveScreenshots, setLiveScreenshots] = useState<any[]>([]);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("progress");

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLogs]);

  useEffect(() => {
    if (!test) return;

    setLiveSteps(test.steps || []);
    setLiveScreenshots(test.screenshots || []);

    if (test.status === "pending" || test.status === "running") {
      setIsLiveRunning(true);
      const eventSource = new EventSource(`/api/tests/${testId}/stream`);

      eventSource.addEventListener("step", (e) => {
        const step = JSON.parse(e.data);
        setLiveSteps((prev) => {
          const exists = prev.findIndex((p) => p.id === step.id);
          if (exists >= 0) {
            const next = [...prev];
            next[exists] = step;
            return next;
          }
          return [...prev, step];
        });
        setLiveLogs((prev) => [
          ...prev,
          `[STEP ${step.stepIndex}] ${step.status.toUpperCase()}: ${step.action} - ${step.description}`,
        ]);
      });

      eventSource.addEventListener("screenshot", (e) => {
        const screenshot = JSON.parse(e.data);
        setLiveScreenshots((prev) => [...prev, screenshot]);
        setLiveLogs((prev) => [
          ...prev,
          `[SCREENSHOT] Captured at ${new Date(screenshot.capturedAt).toLocaleTimeString()}`,
        ]);
      });

      eventSource.addEventListener("done", (e) => {
        setIsLiveRunning(false);
        setLiveLogs((prev) => [...prev, `[INFO] Test completed.`]);
        queryClient.invalidateQueries({ queryKey: getGetTestQueryKey(testId) });
        eventSource.close();
        // Auto-switch to Allure report tab when done
        setTimeout(() => setActiveTab("report"), 400);
      });

      eventSource.addEventListener("error_event", (e) => {
        setIsLiveRunning(false);
        setLiveLogs((prev) => [...prev, `[ERROR] Stream error: ${e.data}`]);
        eventSource.close();
      });

      eventSource.onerror = () => {
        eventSource.close();
        setIsLiveRunning(false);
      };

      return () => {
        eventSource.close();
      };
    } else {
      setIsLiveRunning(false);
      // If already completed when page loads, start on report tab
      if (["passed", "failed"].includes(test.status) && test.steps?.length > 0) {
        setActiveTab("report");
      }
    }
  }, [test?.status, testId, queryClient]);

  const handleDownloadPDF = () => {
    window.open(`/api/tests/${testId}/pdf`, "_blank");
  };

  const isComplete = test && ["passed", "failed", "error"].includes(test.status);

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <Card className="h-[400px] animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!test) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold">Test not found</h2>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5 flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link href="/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-3 flex-wrap">
              Test Run #{test.id}
              <Badge
                variant={
                  test.status === "passed"
                    ? "default"
                    : test.status === "failed" || test.status === "error"
                    ? "destructive"
                    : "secondary"
                }
                className={test.status === "passed" ? "bg-green-500" : ""}
              >
                {test.status}
              </Badge>
              {isLiveRunning && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-normal">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  Running…
                </span>
              )}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1 truncate">{test.url}</p>
          </div>

          {isComplete && (
            <Button onClick={handleDownloadPDF} variant="outline" className="gap-2 shrink-0">
              <Download className="w-4 h-4" /> PDF Report
            </Button>
          )}
        </div>

        {/* Stats bar */}
        {test.totalSteps > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg px-4 py-3 bg-card border border-border text-center">
              <div className="text-2xl font-bold">{test.totalSteps}</div>
              <div className="text-xs text-muted-foreground">Total Steps</div>
            </div>
            <div className="rounded-lg px-4 py-3 bg-card border border-border text-center">
              <div className="text-2xl font-bold text-green-500">{test.passedSteps}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="rounded-lg px-4 py-3 bg-card border border-border text-center">
              <div className="text-2xl font-bold text-red-500">{test.failedSteps}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="progress" className="gap-2">
              <LayoutList className="w-4 h-4" /> Progress
            </TabsTrigger>
            {isComplete && liveSteps.length > 0 && (
              <TabsTrigger value="report" className="gap-2">
                <BarChart2 className="w-4 h-4" /> Allure Report
              </TabsTrigger>
            )}
            <TabsTrigger value="screenshots" className="gap-2">
              <ImageIcon className="w-4 h-4" /> Screenshots
            </TabsTrigger>
          </TabsList>

          {/* ── Progress tab ─────────────────────────────────── */}
          <TabsContent value="progress" className="space-y-5">
            <Card>
              <CardContent className="p-6">
                {liveSteps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {isLiveRunning ? (
                      <span className="flex flex-col items-center gap-3">
                        <span className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        Generating test steps with Gemini…
                      </span>
                    ) : (
                      "No steps recorded."
                    )}
                  </div>
                ) : (
                  <div className="relative border-l border-border ml-3 space-y-5">
                    {liveSteps.map((step) => (
                      <div key={step.id} className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 bg-background rounded-full">
                          {step.status === "passed" ? (
                            <CheckCircle className="w-5 h-5 text-green-500 bg-background" />
                          ) : step.status === "failed" ? (
                            <XCircle className="w-5 h-5 text-red-500 bg-background" />
                          ) : step.status === "skipped" ? (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground bg-background" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin bg-background" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-bold text-foreground">
                              Step {step.stepIndex + 1}: {step.action}
                            </span>
                            {step.durationMs != null && (
                              <Badge variant="outline" className="text-xs font-normal font-mono gap-1">
                                <Clock className="w-3 h-3" /> {step.durationMs}ms
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          {step.errorMessage && (
                            <div className="mt-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 font-mono">
                              {step.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isLiveRunning && liveSteps.length > 0 && (
                  <div className="flex items-center gap-3 text-muted-foreground pl-3 mt-5">
                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Test in progress…
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Terminal */}
            <div className="rounded-lg bg-[#0c0c0c] border border-border overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b border-border flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="text-sm font-medium">Terminal Output</span>
              </div>
              <div className="p-4 h-56 overflow-y-auto font-mono text-sm text-[#00ff00] space-y-1">
                {liveLogs.length === 0 ? (
                  <span className="text-[#555]">Waiting for test output…</span>
                ) : (
                  liveLogs.map((log, i) => <div key={i}>{log}</div>)
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </TabsContent>

          {/* ── Allure Report tab ─────────────────────────────── */}
          {isComplete && liveSteps.length > 0 && (
            <TabsContent value="report">
              <AllureReport
                test={{
                  id: test.id,
                  url: test.url,
                  status: test.status,
                  totalSteps: test.totalSteps,
                  passedSteps: test.passedSteps,
                  failedSteps: test.failedSteps,
                  createdAt: test.createdAt,
                  completedAt: test.completedAt ?? null,
                  errorMessage: test.errorMessage ?? null,
                  steps: liveSteps,
                }}
              />
            </TabsContent>
          )}

          {/* ── Screenshots tab ───────────────────────────────── */}
          <TabsContent value="screenshots">
            {liveScreenshots.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No screenshots captured for this run.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {liveScreenshots.map((shot) => (
                  <div
                    key={shot.id}
                    className="relative group rounded-lg overflow-hidden border border-border cursor-pointer aspect-video bg-muted"
                    onClick={() => setSelectedScreenshot(shot.imageData)}
                  >
                    <img
                      src={`data:image/png;base64,${shot.imageData}`}
                      alt={`Screenshot at ${shot.capturedAt}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-sm text-white text-xs">
                      {format(new Date(shot.capturedAt), "HH:mm:ss.SSS")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedScreenshot} onOpenChange={(open) => !open && setSelectedScreenshot(null)}>
        <DialogContent className="max-w-5xl p-1 bg-black/90 border-border">
          <DialogTitle className="sr-only">Screenshot Viewer</DialogTitle>
          <DialogDescription className="sr-only">Full size screenshot</DialogDescription>
          {selectedScreenshot && (
            <img
              src={`data:image/png;base64,${selectedScreenshot}`}
              alt="Full size"
              className="w-full h-auto object-contain max-h-[85vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
