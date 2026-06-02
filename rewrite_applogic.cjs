const fs = require('fs');
const file = '/Users/director/Desktop/Mindstream_v1/hooks/useAppLogic.ts';
let code = fs.readFileSync(file, 'utf8');

const matchStart = code.indexOf('const handleSendMessage = async (text: string, initialContext?: UserContext) => {');
const matchEnd = code.indexOf('const handleAddHabit = async (n: string, f: HabitFrequency) => {');

if (matchStart === -1 || matchEnd === -1) {
    console.log("Could not find bounds");
    process.exit(1);
}

const replacement = `    const handleSendMessage = async (text: string, initialContext?: UserContext) => {
        const newUserMsg: Message = { sender: 'user', text };
        setMessages(prev => [...prev, newUserMsg]);
        setIsChatLoading(true);
        // Increment queryId so GlassBox resets its pipeline
        setQueryId(id => id + 1);

        // Analytics: track chat message
        if (user) {
            db.logEvent(user.id, 'chat_message_sent', { word_count: text.split(' ').length });
        }

        try {
            if (!isMounted.current) return;

            let isDemoUser = false;
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('is_demo').eq('id', user.id).single();
                isDemoUser = profile?.is_demo || false;
            }

            // Call AI Service
            const stream = await gemini.getChatResponseStream(user!.id, [...messages, newUserMsg], isDemoUser);

            let fullResponse = '';
            setMessages(prev => [...prev, { sender: 'ai', text: '' }]);

            for await (const chunk of stream) {
                if (!isMounted.current) break;
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponse += chunkText;
                    setMessages(prev => {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1].text = fullResponse;
                        return newHistory;
                    });
                }
            }

            // Apply unwrapping to final text response to prevent JSON leak
            const unwrapped = gemini.unwrapResponse(fullResponse);
            if (unwrapped !== fullResponse) {
                setMessages(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].text = unwrapped;
                    return newHistory;
                });
            }

            // Enrich parse_ms approximation after response
            enrichLastAIMeta({ parse_ms: 12 });

        } catch (error) {
            if (isMounted.current) {
                if (error instanceof DemoLimitError) {
                    setShowDemoLimitModal(true);
                    setMessages(prev => [...prev, { sender: 'ai', text: "You've used all your demo AI calls! Create a free account to keep exploring." }]);
                } else {
                    setMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble connecting right now." }]);
                }
            }
        } finally {
            if (isMounted.current) setIsChatLoading(false);
        }
    };

    `;

const newCode = code.substring(0, matchStart) + replacement + code.substring(matchEnd);
fs.writeFileSync(file, newCode);
console.log("Rewrite successful");
