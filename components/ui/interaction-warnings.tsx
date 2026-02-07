// components/ui/interaction-warnings.tsx - Drug interaction warnings display

'use client';

import { InteractionResult } from '@/lib/types/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface InteractionWarningsProps {
    interactions: InteractionResult[];
    className?: string;
}

export function InteractionWarnings({ interactions, className }: InteractionWarningsProps) {
    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'severe':
                return <AlertTriangle className="h-4 w-4" />;
            case 'moderate':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Info className="h-4 w-4" />;
        }
    };

    const getSeverityVariant = (severity: string): 'default' | 'destructive' => {
        switch (severity) {
            case 'severe':
                return 'destructive';
            default:
                return 'default';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'severe':
                return 'text-red-600 dark:text-red-400';
            case 'moderate':
                return 'text-yellow-600 dark:text-yellow-400';
            default:
                return 'text-blue-600 dark:text-blue-400';
        }
    };

    if (interactions.length === 0) {
        return (
            <Alert className={className}>
                <Info className="h-4 w-4" />
                <AlertTitle>No Interactions Detected</AlertTitle>
                <AlertDescription>
                    We didn't find any known interactions between your medications. However, always inform your doctor about all medications you're taking.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className={className}>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Drug Interactions Found
            </h3>
            <div className="space-y-3">
                {interactions.map((interaction, idx) => (
                    <Alert key={idx} variant={getSeverityVariant(interaction.severity)}>
                        <div className={getSeverityColor(interaction.severity)}>
                            {getSeverityIcon(interaction.severity)}
                        </div>
                        <AlertTitle className="flex items-center gap-2">
                            <span>{interaction.drug1}</span>
                            <span className="text-muted-foreground">×</span>
                            <span>{interaction.drug2}</span>
                            <Badge variant={interaction.severity === 'severe' ? 'destructive' : 'default'}>
                                {interaction.severity}
                            </Badge>
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                            <p>{interaction.description}</p>
                            <p className="font-medium">{interaction.recommendation}</p>
                            <p className="text-xs text-muted-foreground">Source: {interaction.source}</p>
                        </AlertDescription>
                    </Alert>
                ))}
            </div>
        </div>
    );
}
