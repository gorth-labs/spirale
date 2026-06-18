import { usePreviewTest } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sparkles } from "lucide-react";

const testSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  instructions: z.string().min(5, { message: "Instructions must be at least 5 characters long" }),
});

export default function NewTest() {
  const [, setLocation] = useLocation();
  const previewTest = usePreviewTest();

  const form = useForm<z.infer<typeof testSchema>>({
    resolver: zodResolver(testSchema),
    defaultValues: { url: "", instructions: "" },
  });

  function onSubmit(values: z.infer<typeof testSchema>) {
    previewTest.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setLocation(`/step-review/${data.id}`);
        },
      }
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">New Test Run</h1>
          <p className="text-muted-foreground mt-2">
            Deploy the Spirale agent to verify a web application.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Enter the target URL and describe what you want the agent to verify. AI will generate
              the test steps for you to review before running.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what to test in plain English or French..."
                          className="min-h-[150px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {previewTest.isPending && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin flex-shrink-0" />
                    Gemini is generating your test steps — this takes about 10–20 seconds…
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={previewTest.isPending} className="gap-2">
                    {previewTest.isPending ? (
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate Steps
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
