// components/ui/nudge-display.tsx - Behavioral science nudge display

'use client';

import { Nudge } from '@/lib/types/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, TrendingUp, Heart } from 'lucide-react';

interface NudgeDisplayProps {
    nudges: Nudge[];
    className?: string;
}

export function NudgeDisplay({ nudges, className }: NudgeDisplayProps) {
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'implementation_intention':
                return <Target className="h-4 w-4" />;
            case 'friction_reduction':
                return <Lightbulb className="h-4 w-4" />;
            case 'positive_reinforcement':
                return <Heart className="h-4 w-4" />;
            case 'why_it_matters':
                return <TrendingUp className="h-4 w-4" />;
            default:
                return <Lightbulb className="h-4 w-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'implementation_intention':
                return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
            case 'friction_reduction':
                return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
            case 'positive_reinforcement':
                return 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800';
            case 'why_it_matters':
                return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
            default:
                return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
        }
    };

    if (nudges.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            <h3 className="text-lg font-semibold mb-3">Adherence Support</h3>
            <div className="space-y-3">
                {nudges.map((nudge) => (
                    <Card
                        key={nudge.id}
                        className={`border ${getCategoryColor(nudge.category)}`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                    {getCategoryIcon(nudge.category)}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-medium">{nudge.message}</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {nudge.behavioral_principle}
                                        </Badge>
                                        {nudge.evidence && (
                                            <span className="text-xs text-muted-foreground">
                                                Based on: {nudge.evidence.medication}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
