import { useState } from "react";
import {
  useGetTest,
  useRunTest,
  useRegenerateStep,
  getGetTestQueryKey,
  type TestStep,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  navigate:                    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  click:                       "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  double_click:                "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  right_click:                 "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  fill:                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  press_sequentially:          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  select_option:               "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  assert_visible:              "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  assert_text_contains:        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  assert_text_equals:          "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  assert_url:                  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  assert_url_contains:         "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  wait_for_selector:           "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  wait_for_load_state_network: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  wait_for_timeout:            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? "bg-muted text-muted-foreground";
}

interface StepRowProps {
  step: TestStep;
  runId: number;
  onRegenerated: (updated: TestStep) => void;
}

function StepRow({ step, runId, onRegenerated }: StepRowProps) {
  const [open, setOpen]       = useState(false);
  const [request, setRequest] = useState("");
  const regenerate            = useRegenerateStep();
  const { toast }             = useToast();

  function handleRegenerate() {
    if (!request.trim()) return;
    regenerate.mutate(
      { id: runId, stepIndex: step.stepIndex, data: { modificationRequest: request.trim() } },
      {
        onSuccess: (updated) => {
          onRegenerated(updated);
          setOpen(false);
          setRequest("");
          toast({ title: "Step updated", description: `Step ${step.stepIndex + 1} has been regenerated.` });
        },
        onError: () => {
          toast({
            title: "Regeneration failed",
            description: "Gemini could not regenerate this step.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-3 bg-card hover:bg-muted/30 transition-colors">
        <span className="text-xs font-mono text-muted-foreground w-6 text-right pt-0.5 flex-shrink-0">
          {step.stepIndex + 1}
        </span>

        <Badge className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 font-mono ${actionColor(step.action)}`}>
          {step.action}
        </Badge>

        <span className="text-sm flex-1 leading-snug">{step.description}</span>

        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
          title="Modify this step"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-muted/20 p-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Describe what should change about this step:
          </p>
          <Textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="e.g. use a more specific CSS selector, change the assertion value, add a wait before clicking…"
            className="text-sm resize-none min-h-[64px]"
            disabled={regenerate.isPending}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); setRequest(""); }}
              disabled={regenerate.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerate.isPending || !request.trim()}
              className="gap-1.5"
            >
              {regenerate.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepReview() {
  const [, params]      = useRoute("/step-review/:id");
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const runId           = parseInt(params?.id ?? "0");

  const { data: test, isLoading, error } = useGetTest(runId, {
    query: {
      enabled: !!runId,
      queryKey: getGetTestQueryKey(runId),
    },
  });

  const runTest = useRunTest();

  const [localSteps, setLocalSteps] = useState<TestStep[] | null>(null);
  const steps: TestStep[] = localSteps ?? test?.steps ?? [];

  function handleRegenerated(updated: TestStep) {
    setLocalSteps((prev) => {
      const base: TestStep[] = prev ?? test?.steps ?? [];
      return base.map((s) =>
        s.stepIndex === updated.stepIndex ? { ...s, ...updated } : s
      );
    });
  }

  function handleLaunch() {
    runTest.mutate(
      { id: runId },
      {
        onSuccess: () => {
          toast({ title: "Test launched!", description: "Playwright is now running your test." });
          setLocation(`/test/${runId}`);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Could not launch the test.";
          toast({ title: "Launch failed", description: msg, variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Loading test steps…</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !test) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <span className="text-sm">Could not load test.</span>
            <Button variant="outline" onClick={() => setLocation("/test/new")}>
              Back to New Test
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold">Review Steps</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              AI generated {steps.length} step{steps.length !== 1 ? "s" : ""} for your test.
              Expand any step to request a modification before running.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleLaunch}
            disabled={runTest.isPending}
            className="gap-2 flex-shrink-0"
          >
            {runTest.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Launch Test
          </Button>
        </div>

        {/* Test info card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground font-medium w-24 flex-shrink-0">URL</span>
                <a
                  href={test.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 truncate"
                >
                  {test.url}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground font-medium w-24 flex-shrink-0">Instructions</span>
                <span className="text-foreground">{test.instructions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tip */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Click the arrow on any step to describe how you want it changed, then hit{" "}
            <strong>Regenerate</strong>. When you're happy with the steps, click{" "}
            <strong>Launch Test</strong>.
          </span>
        </div>

        {/* Steps list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generated Steps</CardTitle>
            <CardDescription>
              {steps.length} step{steps.length !== 1 ? "s" : ""} — expand any to modify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                runId={runId}
                onRegenerated={handleRegenerated}
              />
            ))}
          </CardContent>
        </Card>

        {/* Footer launch */}
        <div className="flex justify-end pb-4">
          <Button
            size="lg"
            onClick={handleLaunch}
            disabled={runTest.isPending}
            className="gap-2"
          >
            {runTest.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Launch Test
          </Button>
        </div>
      </div>
    </Layout>
  );
}
