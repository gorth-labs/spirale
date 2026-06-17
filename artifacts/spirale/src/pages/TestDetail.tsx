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
import { ArrowLeft, CheckCircle, XCircle, Clock, Terminal, Download, FileText, LayoutList, Layers, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

export default function TestDetail() {
  const [, params] = useRoute("/test/:id");
  const testId = params?.id ? parseInt(params.id, 10) : 0;
  
  const queryClient = useQueryClient();
  const { data: test, isLoading } = useGetTest(testId, {
    query: {
      enabled: !!testId,
      queryKey: getGetTestQueryKey(testId),
    }
  });

  const [liveSteps, setLiveSteps] = useState<any[]>([]);
  const [liveScreenshots, setLiveScreenshots] = useState<any[]>([]);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveLogs]);

  useEffect(() => {
    if (!test) return;
    
    // Initialize from server state
    setLiveSteps(test.steps || []);
    setLiveScreenshots(test.screenshots || []);
    
    if (test.status === "pending" || test.status === "running") {
      setIsLiveRunning(true);
      const eventSource = new EventSource(`/api/tests/${testId}/stream`);

      eventSource.addEventListener("step", (e) => {
        const step = JSON.parse(e.data);
        setLiveSteps((prev) => {
          const exists = prev.findIndex(p => p.id === step.id);
          if (exists >= 0) {
            const next = [...prev];
            next[exists] = step;
            return next;
          }
          return [...prev, step];
        });
        setLiveLogs(prev => [...prev, `[STEP ${step.stepIndex}] ${step.status.toUpperCase()}: ${step.action} - ${step.description}`]);
      });

      eventSource.addEventListener("screenshot", (e) => {
        const screenshot = JSON.parse(e.data);
        setLiveScreenshots((prev) => [...prev, screenshot]);
        setLiveLogs(prev => [...prev, `[SCREENSHOT] Captured at ${new Date(screenshot.capturedAt).toLocaleTimeString()}`]);
      });

      eventSource.addEventListener("done", (e) => {
        setIsLiveRunning(false);
        setLiveLogs(prev => [...prev, `[INFO] Test completed.`]);
        queryClient.invalidateQueries({ queryKey: getGetTestQueryKey(testId) });
        eventSource.close();
      });

      eventSource.addEventListener("error_event", (e) => {
        setIsLiveRunning(false);
        setLiveLogs(prev => [...prev, `[ERROR] Stream error: ${e.data}`]);
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
    }
  }, [test?.status, testId, queryClient]);

  const handleDownloadPDF = () => {
    window.open(`/api/tests/${testId}/pdf`, "_blank");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
          <Card className="h-[400px] animate-pulse"></Card>
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
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Test Run #{test.id}
              <Badge 
                variant={test.status === "passed" ? "default" : test.status === "failed" || test.status === "error" ? "destructive" : "secondary"}
                className={test.status === "passed" ? "bg-green-500" : ""}
              >
                {test.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">{test.url}</p>
          </div>
          
          {!isLiveRunning && test.status !== "pending" && (
            <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          )}
        </div>

        <Tabs defaultValue="progress">
          <TabsList className="mb-6">
            <TabsTrigger value="progress" className="gap-2">
              <LayoutList className="w-4 h-4" /> Progress
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="gap-2">
              <ImageIcon className="w-4 h-4" /> Screenshots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {liveSteps.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      {isLiveRunning ? "Initializing test..." : "No steps recorded."}
                    </div>
                  ) : (
                    <div className="relative border-l border-border ml-3 space-y-6">
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
                              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin bg-background" />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-foreground">Step {step.stepIndex}: {step.action}</span>
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

                  {isLiveRunning && (
                    <div className="flex items-center gap-3 text-muted-foreground pl-3">
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Test in progress...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg bg-[#0c0c0c] border border-border overflow-hidden flex flex-col">
              <div className="bg-muted px-4 py-2 border-b border-border flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="text-sm font-medium">Terminal Output</span>
              </div>
              <div className="p-4 h-64 overflow-y-auto font-mono text-sm text-[#00ff00] space-y-1">
                {liveLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {!isLiveRunning && (test.status === "passed" || test.status === "failed") && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Allure Report Summary
                  </h3>
                  <Tabs defaultValue="suite" className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-4">
                      <TabsTrigger value="suite" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Suite</TabsTrigger>
                      <TabsTrigger value="environment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Environment</TabsTrigger>
                      <TabsTrigger value="categories" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Categories</TabsTrigger>
                    </TabsList>
                    <TabsContent value="suite" className="text-sm text-muted-foreground">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-foreground mb-2">Test Suite</p>
                          <ul className="space-y-1">
                            <li>Total Steps: {test.totalSteps}</li>
                            <li className="text-green-500">Passed: {test.passedSteps}</li>
                            <li className="text-red-500">Failed: {test.failedSteps}</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-2">Duration</p>
                          <ul className="space-y-1">
                            <li>Started: {format(new Date(test.createdAt), "PPpp")}</li>
                            <li>Ended: {test.completedAt ? format(new Date(test.completedAt), "PPpp") : "N/A"}</li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="environment" className="text-sm text-muted-foreground">
                      <ul className="space-y-1">
                        <li>Browser: Chromium (Headless)</li>
                        <li>Platform: Linux x86_64</li>
                        <li>Agent: Spirale Core v1.0.0</li>
                      </ul>
                    </TabsContent>
                    <TabsContent value="categories" className="text-sm text-muted-foreground">
                      {test.status === "failed" ? (
                        <div className="p-3 bg-destructive/10 text-destructive rounded border border-destructive/20">
                          Product Defects (1)
                          <p className="font-mono text-xs mt-1">{test.errorMessage || "Unknown error"}</p>
                        </div>
                      ) : (
                        <div className="text-green-500">No defects found.</div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="screenshots">
            {liveScreenshots.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No screenshots captured for this run yet.
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
                      src={`data:image/jpeg;base64,${shot.imageData}`} 
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
          <DialogDescription className="sr-only">View full size screenshot</DialogDescription>
          {selectedScreenshot && (
            <img src={`data:image/jpeg;base64,${selectedScreenshot}`} alt="Full size" className="w-full h-auto object-contain max-h-[85vh]" />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
