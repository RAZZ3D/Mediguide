'use client';

// app/demo/page.tsx - Medicine Assistant Dashboard (Refined)

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    Zap,
    Activity,
    Info,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Heart,
    Brain,
    Feather,
    HelpCircle
} from 'lucide-react';
import { MedicineChatResponse } from '@/lib/types/schemas';

export default function DemoPage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MedicineChatResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Context State
    const [showContext, setShowContext] = useState(false);
    const [context, setContext] = useState({
        other_meds: '',
        frequency: '',
        with_food: ''
    });

    // Follow-up State
    const [followUpQuery, setFollowUpQuery] = useState('');
    const [followUpLoading, setFollowUpLoading] = useState(false);
    const [followUpHistory, setFollowUpHistory] = useState<Array<{ question: string, answer: string, confidence?: string }>>([]);

    const handleFollowUp = async () => {
        if (!followUpQuery.trim() || !result) return;

        const q = followUpQuery;
        setFollowUpQuery(''); // Clear input immediately for better UX
        setFollowUpLoading(true);

        try {
            const response = await fetch('/api/med-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: q,
                    context: {
                        previous_medicine: result.medicine,
                        other_meds: context.other_meds,
                        is_followup: true
                    },
                    is_followup: true
                }),
            });

            if (!response.ok) throw new Error('Failed to get answer');

            const data = await response.json();

            setFollowUpHistory(prev => [...prev, {
                question: q,
                answer: data.answer,
                confidence: data.confidence
            }]);

        } catch (e) {
            console.error(e);
            // Revert input if failed (optional, but good UX)
            setFollowUpQuery(q);
        } finally {
            setFollowUpLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setFollowUpHistory([]); // Reset follow-up history on new search

        try {
            const response = await fetch('/api/med-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: query,
                    context: {
                        ...context,
                        source: 'dashboard_ui'
                    }
                }),
            });

            if (!response.ok) throw new Error('Analysis failed');
            const data: MedicineChatResponse = await response.json();
            setResult(data);

        } catch (err) {
            setError('Could not analyze. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Minimal Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
                    <span className="font-semibold text-slate-800">MediGuide</span>
                </div>
                <Link href="/">
                    <Button variant="ghost" size="sm">Exit Demo</Button>
                </Link>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-6xl">

                {/* Search / Input Section */}
                <div className="text-center mb-12 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Medicine Assistant</h1>
                        <p className="text-slate-500 text-lg">Instant evidence-based analysis for any medication.</p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* Main Input */}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                            <div className="relative">
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g. 'Side effects of Metformin' or 'Interaction with Ibuprofen'"
                                    className="py-7 pl-6 text-xl shadow-xl border-0 focus-visible:ring-0 rounded-xl bg-white text-slate-800 placeholder:text-slate-400"
                                />
                                <Button
                                    onClick={handleSearch}
                                    disabled={loading || !query.trim()}
                                    className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all hover:scale-105"
                                >
                                    {loading ? <Zap className="w-5 h-5 animate-pulse" /> : <Search className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>

                        {/* Context Accordion */}
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <button
                                    onClick={() => setShowContext(!showContext)}
                                    className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Info size={16} /> Add Details (Optional)
                                    </span>
                                    {showContext ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showContext && (
                                    <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 bg-slate-50/50 cursor-default">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Other Meds</label>
                                            <Input
                                                placeholder="e.g. Aspirin, Warfarin"
                                                value={context.other_meds}
                                                onChange={(e) => setContext({ ...context, other_meds: e.target.value })}
                                                className="h-10 text-sm bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Frequency</label>
                                            <Input
                                                placeholder="e.g. Twice daily"
                                                value={context.frequency}
                                                onChange={(e) => setContext({ ...context, frequency: e.target.value })}
                                                className="h-10 text-sm bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">With Food?</label>
                                            <Input
                                                placeholder="Yes / No"
                                                value={context.with_food}
                                                onChange={(e) => setContext({ ...context, with_food: e.target.value })}
                                                className="h-10 text-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Suggestions */}
                    {!result && !loading && (
                        <div className="flex flex-wrap justify-center gap-3 mt-8 opacity-60 hover:opacity-100 transition-opacity">
                            {["Metformin uses", "Amoxicillin side effects", "Interactions with Aspirin", "Atorvastatin safety"].map((s, i) => (
                                <Badge
                                    key={i}
                                    variant="outline"
                                    className="cursor-pointer bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 py-2 px-4 text-sm font-normal transition-all shadow-sm"
                                    onClick={() => setQuery(s)}
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
                        <div className="h-32 bg-slate-200 rounded-3xl w-full"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-48 bg-slate-200 rounded-3xl"></div>
                            <div className="h-48 bg-slate-200 rounded-3xl"></div>
                        </div>
                        <div className="h-40 bg-slate-200 rounded-3xl w-full"></div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <Alert variant="destructive" className="max-w-2xl mx-auto shadow-lg border-2 border-red-100">
                        <AlertTitle className="text-lg">Unable to Analyze</AlertTitle>
                        <AlertDescription className="text-base">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Results Dashboard */}
                {result && !loading && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24">

                        {/* 1. Quick Summary (Hero Card) */}
                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-lg border border-slate-100 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Zap className="w-32 h-32 text-slate-900" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                            <Zap className="w-6 h-6 fill-current" />
                                        </div>
                                        Quick Summary
                                    </h2>
                                    <Badge className={`${result.confidence === 'high' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'} text-white px-3 py-1 shadow-sm`}>
                                        {result.confidence === 'high' ? 'High Confidence' : 'Review Needed'}
                                    </Badge>
                                </div>
                                <p className="text-slate-700 text-xl leading-relaxed font-medium">{result.quick_summary}</p>

                                {/* How To Take Tags */}
                                {result.how_to_take && result.how_to_take.length > 0 && (
                                    <div className="mt-6 flex gap-3 flex-wrap">
                                        {result.how_to_take.map((ht, i) => (
                                            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-700 text-sm font-semibold shadow-sm">
                                                <Clock className="w-4 h-4 text-blue-500" /> {ht}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-400 font-medium tracking-wide">
                                    <Brain className="w-3 h-3" />
                                    AI REASONING: <span className="uppercase">{result.explainability.why}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Key Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Uses */}
                            <Card className="shadow-md border-0 bg-white ring-1 ring-slate-100">
                                <CardHeader className="pb-4 border-b border-slate-50">
                                    <div className="flex items-center gap-3 text-slate-700 font-bold text-lg">
                                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        Main Uses
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <ul className="space-y-4">
                                        {result.uses.map((use, i) => (
                                            <li key={i} className="flex items-start gap-3 text-slate-700 font-medium">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span className="leading-tight">{use}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Dosage Info */}
                            <Card className="shadow-md border-0 bg-white ring-1 ring-slate-100">
                                <CardHeader className="pb-4 border-b border-slate-50">
                                    <div className="flex items-center gap-3 text-slate-700 font-bold text-lg">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <Info className="w-5 h-5" />
                                        </div>
                                        Dosage Info
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <p className="text-slate-700 text-lg leading-relaxed">{result.general_dosage_info}</p>
                                    <div className="mt-6 bg-purple-50 text-purple-900 text-sm px-4 py-3 rounded-xl border border-purple-100 flex items-start gap-3">
                                        <Info className="w-5 h-5 shrink-0 mt-0.5 text-purple-600" />
                                        <p><strong>Note:</strong> Typical guidance only. Always follow your doctor's specific prescription.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 3. Safety Section (Warnings & Interactions) */}
                        <div className="space-y-8">
                            {result.red_flags.length > 0 && (
                                <Alert className="border-red-100 bg-red-50/50 px-6 py-5 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                                            <AlertTriangle className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <AlertTitle className="text-xl font-bold text-red-900 mb-2">Red Flags (Seek Medical Help)</AlertTitle>
                                            <AlertDescription className="text-red-800 text-base">
                                                <ul className="space-y-3 mt-3">
                                                    {result.red_flags.map((flag, i) => (
                                                        <li key={i} className="flex items-start gap-3 bg-white/60 p-3 rounded-lg border border-red-100/50">
                                                            <span className="text-red-500 font-bold text-lg leading-none mt-1 shrink-0">•</span>
                                                            <span className="leading-snug break-words whitespace-normal">{flag}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </AlertDescription>
                                        </div>
                                    </div>
                                </Alert>
                            )}

                            {result.interactions.length > 0 ? (
                                <div className="bg-amber-50/30 rounded-3xl border border-amber-100 p-8 shadow-sm">
                                    <h3 className="text-lg font-bold text-amber-900 flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        Interaction Alerts
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {result.interactions.map((interaction, i) => (
                                            <div key={i} className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="font-bold text-slate-800 text-lg">{interaction.with}</span>
                                                    <Badge className={`
                                                        text-[10px] uppercase px-3 py-1 font-bold tracking-wide
                                                        ${interaction.severity === 'high'
                                                            ? 'bg-red-100 text-red-700 border-red-200'
                                                            : 'bg-amber-100 text-amber-800 border-amber-200'}
                                                    `}>
                                                        {interaction.severity} Risk
                                                    </Badge>
                                                </div>
                                                <p className="text-slate-600 mb-4 leading-relaxed">{interaction.what_can_happen}</p>
                                                {interaction.symptoms && interaction.symptoms.length > 0 && (
                                                    <div className="pt-3 border-t border-slate-50 text-xs text-slate-500 font-medium group-hover:text-amber-700 transition-colors">
                                                        WATCH FOR: {interaction.symptoms.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                result.questions_to_confirm && result.questions_to_confirm.length > 0 && (
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                                        <HelpCircle className="w-6 h-6 text-blue-500 mt-1" />
                                        <div>
                                            <h4 className="font-bold text-blue-900 text-lg">Checking Safety...</h4>
                                            <p className="text-blue-800 mb-2">No major interactions found, but please confirm:</p>
                                            <ul className="list-disc pl-5 space-y-1 text-blue-700 text-sm font-medium">
                                                {result.questions_to_confirm.map((q, i) => <li key={i}>{q}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>

                        {/* 4. Behavioral Nudges */}
                        {result.behavioral_nudges.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg">
                                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                        <Brain className="w-6 h-6" />
                                    </div>
                                    Behavioral Nudges
                                    <Badge variant="outline" className="ml-2 font-normal text-slate-400 bg-slate-50 border-slate-200">EAST / COM-B</Badge>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {result.behavioral_nudges.map((nudge, i) => {
                                        // Dynamic styling
                                        let icon = <Zap className="w-5 h-5" />;
                                        let bgClass = "bg-slate-50";
                                        let borderClass = "border-slate-100 hover:border-slate-300";
                                        let textClass = "text-slate-600";
                                        let badgeColor = "bg-slate-200 text-slate-600";
                                        let iconColor = "text-slate-400";

                                        if (nudge.label === 'TIMELY') {
                                            icon = <Clock className="w-5 h-5 text-white" />;
                                            bgClass = "bg-blue-50";
                                            borderClass = "border-blue-100 hover:border-blue-300";
                                            textClass = "text-blue-900";
                                            badgeColor = "bg-blue-500 text-white";
                                            iconColor = "bg-blue-500";
                                        } else if (nudge.label === 'EASY') {
                                            icon = <Feather className="w-5 h-5 text-white" />;
                                            bgClass = "bg-emerald-50";
                                            borderClass = "border-emerald-100 hover:border-emerald-300";
                                            textClass = "text-emerald-900";
                                            badgeColor = "bg-emerald-500 text-white";
                                            iconColor = "bg-emerald-500";
                                        } else if (nudge.label === 'MOTIVATION') {
                                            icon = <Heart className="w-5 h-5 text-white" />;
                                            bgClass = "bg-pink-50";
                                            borderClass = "border-pink-100 hover:border-pink-300";
                                            textClass = "text-pink-900";
                                            badgeColor = "bg-pink-500 text-white";
                                            iconColor = "bg-pink-500";
                                        } else if (nudge.label === 'RECOVERY') {
                                            icon = <ShieldAlert className="w-5 h-5 text-white" />;
                                            bgClass = "bg-amber-50";
                                            borderClass = "border-amber-100 hover:border-amber-300";
                                            textClass = "text-amber-900";
                                            badgeColor = "bg-amber-500 text-white";
                                            iconColor = "bg-amber-500";
                                        }

                                        return (
                                            <div key={i} className={`p-5 rounded-2xl border ${borderClass} ${bgClass} flex flex-col gap-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group`}>
                                                <div className="flex justify-between items-center relative z-10">
                                                    <div className={`w-8 h-8 rounded-full ${iconColor} flex items-center justify-center shadow-sm`}>
                                                        {icon}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{nudge.principle}</span>
                                                </div>
                                                <div className={`text-[10px] font-bold px-2 py-1 rounded w-fit ${badgeColor} uppercase tracking-wider mb-1`}>
                                                    {nudge.label}
                                                </div>
                                                <p className={`text-sm ${textClass} font-semibold leading-relaxed relative z-10`}>
                                                    "{nudge.message}"
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Follow-up Question Section (Chat Mode) */}
                        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col gap-6">
                            <div className="absolute top-0 right-0 p-12 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

                            {/* Header */}
                            <h3 className="text-xl font-bold flex items-center gap-2 relative z-10">
                                <HelpCircle className="w-6 h-6 text-blue-400" />
                                Have a follow-up question?
                            </h3>

                            {/* Chat History Area */}
                            {followUpHistory.length > 0 && (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 relative z-10">
                                    {followUpHistory.map((item, idx) => (
                                        <div key={idx} className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                            {/* User Question */}
                                            <div className="flex justify-end">
                                                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-none max-w-[80%] text-sm font-medium shadow-md">
                                                    {item.question}
                                                </div>
                                            </div>
                                            {/* AI Answer */}
                                            <div className="flex justify-start">
                                                <div className="bg-slate-800 text-slate-200 px-5 py-3 rounded-2xl rounded-bl-none max-w-[90%] text-sm leading-relaxed shadow-sm border border-slate-700/50">
                                                    <p>{item.answer}</p>
                                                    {item.confidence && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 uppercase">
                                                                Confidence: {item.confidence}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="relative z-10 flex gap-2 pt-2">
                                <Input
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl h-12 focus-visible:ring-blue-500"
                                    placeholder={`Ask more about ${result.medicine || 'this medicine'}...`}
                                    value={followUpQuery}
                                    onChange={(e) => setFollowUpQuery(e.target.value)}
                                    disabled={followUpLoading}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleFollowUp();
                                        }
                                    }}
                                />
                                <Button
                                    className="h-12 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold disabled:opacity-50"
                                    onClick={handleFollowUp}
                                    disabled={followUpLoading || !followUpQuery.trim()}
                                >
                                    {followUpLoading ? <Zap className="w-5 h-5 animate-pulse" /> : 'Ask'}
                                </Button>
                            </div>

                            <p className="text-xs text-slate-500 relative z-10">
                                Stays in context of <strong>{result.medicine}</strong>. Try asking "Can I take it with coffee?"
                            </p>
                        </div>

                        {/* Disclaimer Footer */}
                        <div className="text-center pt-8 pb-4">
                            <p className="text-sm text-slate-400 max-w-2xl mx-auto font-medium">
                                "{result.safety_disclaimer}"
                            </p>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
