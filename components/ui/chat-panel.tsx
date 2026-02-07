// components/ui/chat-panel.tsx - AI Chat with safety guardrails

'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { ChatMessage, ChatContext } from '@/lib/types/schemas';
import { sendChatMessage, generateSuggestedQuestions } from '@/lib/chat/chat-service';

interface ChatPanelProps {
    context: ChatContext;
    className?: string;
}

export function ChatPanel({ context, className }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Generate suggested questions based on context
        const suggestions = generateSuggestedQuestions(context);
        setSuggestedQuestions(suggestions);
    }, [context]);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim() || isLoading) return;

        // Add user message
        const userMessage: ChatMessage = {
            role: 'user',
            content: textToSend,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Get AI response
            const assistantMessage = await sendChatMessage(textToSend, context, messages);
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'I apologize, but I encountered an error. Please try again.',
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestedQuestion = (question: string) => {
        handleSendMessage(question);
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    AI Chat Assistant
                </CardTitle>
                <CardDescription>
                    Ask questions about your prescription or medications
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Safety Notice */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-200">
                        <p className="font-medium mb-1">Information Only</p>
                        <p>This chat provides information only. It cannot diagnose conditions, recommend dosage changes, or replace your doctor/pharmacist.</p>
                    </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Ask me anything about your medications!</p>
                            </div>
                        )}

                        {messages.map((message, idx) => (
                            <div
                                key={idx}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    <p className="text-xs opacity-70 mt-1">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg p-3">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Suggested Questions */}
                {messages.length === 0 && suggestedQuestions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Suggested questions:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((question, idx) => (
                                <Badge
                                    key={idx}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => handleSuggestedQuestion(question)}
                                >
                                    {question}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Ask about your medications..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={() => handleSendMessage()}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
