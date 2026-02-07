// components/ui/explainability-card.tsx - Evidence-grounded explainability UI

'use client';

import { ExplainabilityCard as ExplainabilityCardType } from '@/lib/types/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    FileText,
    Lightbulb,
    Pill,
    AlertTriangle
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ExplainabilityCardProps {
    card: ExplainabilityCardType;
    onConfirmField?: (field: string, value: string) => void;
}

export function ExplainabilityCard({ card, onConfirmField }: ExplainabilityCardProps) {
    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 0.85) {
            return <Badge className="bg-green-500">High ({(confidence * 100).toFixed(0)}%)</Badge>;
        } else if (confidence >= 0.70) {
            return <Badge className="bg-yellow-500">Medium ({(confidence * 100).toFixed(0)}%)</Badge>;
        } else {
            return <Badge className="bg-red-500">Low ({(confidence * 100).toFixed(0)}%)</Badge>;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    {card.medication_name}
                </CardTitle>
                <CardDescription>
                    Evidence-based explanation of how we understood this medication
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Accordion type="multiple" defaultValue={['detected', 'evidence', 'plan']} className="w-full">

                    {/* Section 1: What Was Detected */}
                    <AccordionItem value="detected">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="font-semibold">What Was Detected</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pt-2">
                                {Object.entries(card.what_was_detected.fields).map(([fieldName, fieldData]) => (
                                    <div key={fieldName} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                        <div>
                                            <span className="font-medium capitalize">{fieldName.replace('_', ' ')}:</span>
                                            <span className="ml-2">{fieldData.value || 'Not specified'}</span>
                                        </div>
                                        {fieldData.confidence > 0 && getConfidenceBadge(fieldData.confidence)}
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Section 2: Prescription Evidence */}
                    <AccordionItem value="evidence">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-semibold">Prescription Evidence</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pt-2">
                                <div className="p-3 bg-muted rounded-md">
                                    <p className="text-sm font-medium mb-2">Original Text:</p>
                                    <p className="text-sm font-mono bg-background p-2 rounded">
                                        {card.prescription_evidence.original_text_snippet}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">OCR Tokens Used:</p>
                                    {card.prescription_evidence.ocr_tokens.map((token, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <Badge variant="outline">{token.field}</Badge>
                                            <span className="font-mono">&quot;{token.text}&quot;</span>
                                            <span className="text-muted-foreground">
                                                ({(token.confidence * 100).toFixed(0)}% confidence)
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Matched Rules:</p>
                                    {card.prescription_evidence.matched_rules.map((rule, idx) => (
                                        <Badge key={idx} variant="secondary" className="mr-2">
                                            {rule}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Section 3: Why This Plan */}
                    <AccordionItem value="plan">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                                <span className="font-semibold">Why This Plan</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pt-2">
                                <div>
                                    <p className="text-sm font-medium mb-1">Schedule:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {card.why_this_plan.schedule_explanation}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-1">Timing:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {card.why_this_plan.timing_rationale}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-1">Duration:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {card.why_this_plan.duration_reasoning}
                                    </p>
                                </div>

                                {card.why_this_plan.food_instruction_reasoning && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Food Instructions:</p>
                                        <p className="text-sm text-muted-foreground">
                                            {card.why_this_plan.food_instruction_reasoning}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Section 4: Drug Details */}
                    <AccordionItem value="drug">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                                <Pill className="h-4 w-4 text-purple-500" />
                                <span className="font-semibold">Drug Details</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-3 pt-2">
                                <div>
                                    <p className="text-sm font-medium mb-1">What it treats:</p>
                                    <p className="text-sm text-muted-foreground">
                                        {card.drug_details.what_it_treats}
                                    </p>
                                </div>

                                {card.drug_details.how_it_works && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">How it works:</p>
                                        <p className="text-sm text-muted-foreground">
                                            {card.drug_details.how_it_works}
                                        </p>
                                    </div>
                                )}

                                {card.drug_details.common_side_effects && card.drug_details.common_side_effects.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Common side effects:</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                            {card.drug_details.common_side_effects.map((effect, idx) => (
                                                <li key={idx}>{effect}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {card.drug_details.precautions && card.drug_details.precautions.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Precautions:</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                            {card.drug_details.precautions.map((precaution, idx) => (
                                                <li key={idx}>{precaution}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="pt-2 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        Source: {card.drug_details.source}
                                        {card.drug_details.source_url && (
                                            <a
                                                href={card.drug_details.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-1 text-blue-500 hover:underline"
                                            >
                                                View
                                            </a>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Section 5: Uncertainty */}
                    {card.uncertainty.has_uncertainty && (
                        <AccordionItem value="uncertainty">
                            <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    <span className="font-semibold">Uncertainty & Confirmation Needed</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pt-2">
                                    <Alert>
                                        <HelpCircle className="h-4 w-4" />
                                        <AlertTitle>Some fields need confirmation</AlertTitle>
                                        <AlertDescription>
                                            We detected the following fields but need your confirmation:
                                        </AlertDescription>
                                    </Alert>

                                    {card.uncertainty.unclear_fields && card.uncertainty.unclear_fields.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Unclear fields:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {card.uncertainty.unclear_fields.map((field, idx) => (
                                                    <Badge key={idx} variant="destructive">
                                                        {field}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {card.uncertainty.confirmation_questions && card.uncertainty.confirmation_questions.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Please confirm:</p>
                                            {card.uncertainty.confirmation_questions.map((question, idx) => (
                                                <div key={idx} className="p-3 bg-muted rounded-md">
                                                    <p className="text-sm font-medium mb-1">{question.question}</p>
                                                    {question.detected_value && (
                                                        <p className="text-sm text-muted-foreground mb-2">
                                                            Detected: <span className="font-mono">{question.detected_value}</span>
                                                            {' '}({(question.confidence * 100).toFixed(0)}% confidence)
                                                        </p>
                                                    )}
                                                    {question.suggestions && question.suggestions.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {question.suggestions.map((suggestion, sIdx) => (
                                                                <Badge
                                                                    key={sIdx}
                                                                    variant="outline"
                                                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                                    onClick={() => onConfirmField?.(question.field, suggestion)}
                                                                >
                                                                    {suggestion}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
            </CardContent>
        </Card>
    );
}
