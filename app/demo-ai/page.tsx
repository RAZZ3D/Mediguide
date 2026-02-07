// app/demo-ai/page.tsx - AI-first prescription parsing demo

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExplainabilityCard } from '@/components/ui/explainability-card';
import { ChatPanel } from '@/components/ui/chat-panel';
import { NudgeDisplay } from '@/components/ui/nudge-display';
import { InteractionWarnings } from '@/components/ui/interaction-warnings';
import { Upload, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { ParsePrescriptionResponse, ChatContext } from '@/lib/types/schemas';

export default function DemoAIPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<ParsePrescriptionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Convert file to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async () => {
                const base64 = reader.result as string;

                // Call AI parsing API
                const response = await fetch('/api/parse-ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image_base64: base64,
                        language_hint: 'en',
                        user_preferences: {
                            wake_time: '07:00',
                            sleep_time: '22:00',
                            meal_times: {
                                breakfast: '08:00',
                                lunch: '13:00',
                                dinner: '19:00',
                            },
                            preferred_nudge_style: 'gentle',
                            timezone: 'Asia/Kolkata',
                        },
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to parse prescription');
                }

                setResult(data);
            };

            reader.onerror = () => {
                throw new Error('Failed to read file');
            };
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'An error occurred while processing the prescription');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTestWithSample = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            // Use sample text from test case
            const sampleText = `Dr. Sharma's Clinic

Rx:

Tab Amlodipine 5mg
1-0-0 x 30 days
Before breakfast

Tab Metformin 500mg
1-0-1 x 30 days
After meals

Dr. Rajesh Sharma
MBBS, MD`;

            const response = await fetch('/api/parse-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: sampleText,
                    language_hint: 'en',
                    user_preferences: {
                        wake_time: '07:00',
                        sleep_time: '22:00',
                        meal_times: {
                            breakfast: '08:00',
                            lunch: '13:00',
                            dinner: '19:00',
                        },
                        preferred_nudge_style: 'gentle',
                        timezone: 'Asia/Kolkata',
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('API Error Response:', data);
                throw new Error(data.error || 'Failed to parse prescription');
            }

            console.log('API Success Response:', JSON.stringify(data, null, 2));


            setResult(data);
        } catch (err: any) {
            console.error('Test error:', err);
            setError(err.message || 'An error occurred while processing the sample prescription');
        } finally {
            setIsProcessing(false);
        }
    };

    const chatContext: ChatContext = result
        ? {
            mode: 'prescription',
            medication_plan: result.medication_plan,
            drug_info: [],
            interaction_results: result.interaction_results,
        }
        : {
            mode: 'general',
        };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-primary" />
                    AI-First Prescription Parser
                </h1>
                <p className="text-muted-foreground">
                    Upload a prescription (printed or handwritten) and get evidence-grounded explanations,
                    interaction checks, and personalized adherence support.
                </p>
            </div>

            {/* Upload Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Upload Prescription</CardTitle>
                    <CardDescription>
                        Type a prescription (e.g., "Metformin 500mg BD") or ask about a medicine (e.g., "What is Atorvastatin?")
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="prescription">Prescription Image</Label>
                        <Input
                            id="prescription"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isProcessing}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleUpload}
                            disabled={!file || isProcessing}
                            className="flex-1"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Parse Prescription
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleTestWithSample}
                            disabled={isProcessing}
                            variant="outline"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Test with Sample'
                            )}
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {result && !result.success && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Parsing Failed</AlertTitle>
                            <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                    )}

                    {result && result.success && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Success!</AlertTitle>
                            <AlertDescription>
                                Prescription parsed successfully in {result.processing_time_ms}ms.
                                {result.warnings && result.warnings.length > 0 && (
                                    <ul className="mt-2 list-disc list-inside">
                                        {result.warnings.map((warning, idx) => (
                                            <li key={idx} className="text-sm">{warning}</li>
                                        ))}
                                    </ul>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Results Section */}
            {result && result.success && (
                <Tabs defaultValue="medications" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="medications">
                            Medications ({result.medication_plan.medications.length})
                        </TabsTrigger>
                        <TabsTrigger value="interactions">
                            Interactions ({result.interaction_results.length})
                        </TabsTrigger>
                        <TabsTrigger value="nudges">
                            Adherence Support ({result.nudges.length})
                        </TabsTrigger>
                        <TabsTrigger value="chat">
                            AI Chat
                        </TabsTrigger>
                    </TabsList>

                    {/* Medications Tab */}
                    <TabsContent value="medications" className="space-y-4">
                        {result.explainability_cards.map((card, idx) => (
                            <ExplainabilityCard key={idx} card={card} />
                        ))}
                    </TabsContent>

                    {/* Interactions Tab */}
                    <TabsContent value="interactions">
                        <InteractionWarnings interactions={result.interaction_results} />
                    </TabsContent>

                    {/* Nudges Tab */}
                    <TabsContent value="nudges">
                        <NudgeDisplay nudges={result.nudges} />
                    </TabsContent>

                    {/* Chat Tab */}
                    <TabsContent value="chat">
                        <ChatPanel context={chatContext} />
                    </TabsContent>
                </Tabs>
            )}

            {/* Feature Highlights */}
            {!result && (
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Zero Hallucinations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                LLM never guesses. If uncertain, it asks for confirmation instead of making assumptions.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Evidence-Grounded</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Every decision has evidence citations: OCR tokens, matched rules, and confidence scores.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Safety First</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Interaction checking, behavioral nudges, and AI chat with strong safety guardrails.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
